/**
 * Notification Outbox — on-demand processor + background poller
 *
 * Emits domain events into the `notification_outbox` table and processes them
 * immediately AND via a periodic background poller.
 *
 * Flow:
 *   1. `emitRegistrationConfirmed(rsvpId)` inserts a row and calls `processNotificationOutbox()`
 *   2. `processNotificationOutbox()` selects up to 10 pending rows with
 *      `FOR UPDATE SKIP LOCKED`, sends the email, marks rows as processed.
 *   3. If sending fails, `retry_count` is incremented.  After 5 failures the row
 *      moves to `failed` status.
 *   4. `startOutboxPoller()` runs every 60 s to:
 *      a. Heal stale RSVPs — payment captured but RSVP still has paymentStatus=pending
 *         (race-condition recovery: inserts any missing outbox rows automatically)
 *      b. Reset rows stuck in `processing` state (server crash recovery)
 *      c. Call `processNotificationOutbox()` to retry any pending rows
 */

import { db } from './db';
import { notificationOutbox, eventRsvps, events, users } from '../drizzle/schema';
import { eq, and, sql, lt, asc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { sendRegistrationConfirmationEmail } from './mail';

const MAX_RETRIES = 5;
const BATCH_SIZE = 10;

// ────────────────────────────────────────────────────────────────────────────
// Emit helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Insert a REGISTRATION_CONFIRMED event into the outbox and trigger processing.
 * Safe to call multiple times for the same RSVP — the outbox ID is deterministic
 * (`reg-confirmed-<rsvpId>`) so a duplicate insert is silently skipped.
 */
export async function emitRegistrationConfirmed(rsvpId: number): Promise<void> {
  const outboxId = `reg-confirmed-${rsvpId}`;

  try {
    // Deterministic ID → INSERT … ON CONFLICT DO NOTHING = idempotent
    await db
      .insert(notificationOutbox)
      .values({
        id: outboxId,
        eventType: 'REGISTRATION_CONFIRMED',
        payload: { rsvpId },
        status: 'pending',
      })
      .onConflictDoNothing();

    console.log(`[outbox] Emitted REGISTRATION_CONFIRMED for RSVP ${rsvpId}`);
  } catch (err) {
    console.error(`[outbox] Failed to emit REGISTRATION_CONFIRMED for RSVP ${rsvpId}:`, err);
    // Don't throw — the registration itself succeeded; the outbox is best-effort.
    return;
  }

  // Process immediately (fire-and-forget so the caller isn't blocked)
  processNotificationOutbox().catch((err) =>
    console.error('[outbox] processNotificationOutbox error:', err),
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Processor
// ────────────────────────────────────────────────────────────────────────────

/**
 * Process up to `BATCH_SIZE` pending outbox rows.
 *
 * Uses `SELECT … FOR UPDATE SKIP LOCKED` so concurrent calls (e.g. two
 * webhooks firing at the same time) never process the same row twice.
 */
export async function processNotificationOutbox(): Promise<void> {
  // Phase 1: claim rows inside a real transaction so FOR UPDATE SKIP LOCKED
  // actually holds locks and prevents concurrent processors from picking the
  // same rows.  We mark them 'processing' and commit immediately.
  let claimed: { id: string; eventType: string; payload: Record<string, any>; retryCount: number }[] = [];

  await db.transaction(async (tx) => {
    const pending = await tx.execute(sql`
      SELECT id, event_type, payload, retry_count
      FROM notification_outbox
      WHERE status = 'pending'
        AND retry_count < ${MAX_RETRIES}
      ORDER BY created_at ASC
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    `);

    if (!pending.rows || pending.rows.length === 0) return;

    claimed = pending.rows.map((r: any) => ({
      id: r.id as string,
      eventType: r.event_type as string,
      payload: r.payload as Record<string, any>,
      retryCount: r.retry_count as number,
    }));

    // Mark as 'processing' so no other worker picks them up
    for (const row of claimed) {
      await tx
        .update(notificationOutbox)
        .set({ status: 'processing' })
        .where(eq(notificationOutbox.id, row.id));
    }
  });

  if (claimed.length === 0) return;

  console.log(`[outbox] Processing ${claimed.length} pending notification(s)…`);

  // Phase 2: process each claimed row outside the transaction
  for (const row of claimed) {
    try {
      switch (row.eventType) {
        case 'REGISTRATION_CONFIRMED':
          await handleRegistrationConfirmed(row.payload);
          break;
        default:
          console.warn(`[outbox] Unknown event type: ${row.eventType}, marking as failed`);
          await markFailed(row.id);
          continue;
      }

      // Success → mark processed
      await db
        .update(notificationOutbox)
        .set({
          status: 'processed',
          processedAt: new Date().toISOString(),
        })
        .where(eq(notificationOutbox.id, row.id));

      console.log(`[outbox] ✅ Processed ${row.eventType} (${row.id})`);
    } catch (err) {
      const newRetry = row.retryCount + 1;
      const newStatus = newRetry >= MAX_RETRIES ? 'failed' : 'pending';

      console.error(`[outbox] ❌ ${row.eventType} (${row.id}) attempt ${newRetry}/${MAX_RETRIES} failed:`, err);

      try {
        await db
          .update(notificationOutbox)
          .set({
            retryCount: newRetry,
            status: newStatus,
          })
          .where(eq(notificationOutbox.id, row.id));
      } catch (dbErr) {
        // Row will remain in 'processing' but resetStuckRows() will recover it within 2 minutes
        console.error(`[outbox] ⚠️  Failed to reset outbox row ${row.id} status after error:`, dbErr);
      }
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Event handlers
// ────────────────────────────────────────────────────────────────────────────

async function handleRegistrationConfirmed(payload: Record<string, any>): Promise<void> {
  const rsvpId = payload.rsvpId as number;

  // Fetch RSVP + user + event in one query
  const rows = await db
    .select({
      rsvpId: eventRsvps.id,
      price: eventRsvps.price,
      userId: eventRsvps.userId,
      eventId: eventRsvps.eventId,
      userName: users.firstName,
      userEmail: users.email,
      eventTitle: events.title,
      eventDate: events.datetime,
    })
    .from(eventRsvps)
    .innerJoin(users, eq(users.id, eventRsvps.userId))
    .innerJoin(events, eq(events.id, eventRsvps.eventId))
    .where(eq(eventRsvps.id, rsvpId))
    .limit(1);

  if (rows.length === 0) {
    console.warn(`[outbox] RSVP ${rsvpId} not found — skipping email`);
    return;
  }

  const { userName, userEmail, eventTitle, eventDate, price } = rows[0];

  if (!userEmail) {
    console.warn(`[outbox] User for RSVP ${rsvpId} has no email — skipping`);
    return;
  }

  await sendRegistrationConfirmationEmail({
    userEmail,
    userName: userName || 'there',
    eventName: eventTitle,
    eventDate: eventDate ? new Date(eventDate) : new Date(),
    price: price ?? 0, // paise
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

async function markFailed(id: string): Promise<void> {
  await db
    .update(notificationOutbox)
    .set({ status: 'failed', processedAt: new Date().toISOString() })
    .where(eq(notificationOutbox.id, id));
}

// ────────────────────────────────────────────────────────────────────────────
// Stuck-row recovery
// ────────────────────────────────────────────────────────────────────────────

/**
 * Heal stale RSVPs: find every RSVP that is `going` but whose `payment_status`
 * is not `captured`, yet has a corresponding payment_transaction that IS
 * `captured`.  This is the race condition where the webhook or reconciliation
 * updated the payment row but failed to (or never got to) update the RSVP +
 * emit the outbox event.  Safe to call repeatedly — uses ON CONFLICT DO NOTHING.
 */
export async function healStalePayments(): Promise<void> {
  // Find stale RSVPs
  const stale = await db.execute(sql`
    SELECT er.id        AS rsvp_id,
           er.event_id,
           er.user_id,
           pt.amount
    FROM   event_rsvps er
    JOIN   payment_transactions pt
           ON  pt.event_id = er.event_id
           AND pt.user_id  = er.user_id
    WHERE  pt.status               = 'captured'
      AND  er.status               = 'going'
      AND  (er.payment_status      != 'captured' OR er.confirmed_at IS NULL)
  `);

  if (stale.rows.length === 0) return;

  console.log(`[outbox] 🩹 Healing ${stale.rows.length} stale RSVP(s) with captured payments…`);

  for (const row of stale.rows as any[]) {
    try {
      const now = new Date().toISOString();

      // 1. Fix the RSVP columns
      await db.execute(sql`
        UPDATE event_rsvps
        SET    payment_status = 'captured',
               confirmed_at   = COALESCE(confirmed_at, ${now}::timestamptz),
               price          = ${row.amount},
               updated_at     = ${now}::timestamptz
        WHERE  id = ${row.rsvp_id}
      `);

      // 2. Insert outbox row (idempotent — ON CONFLICT DO NOTHING)
      await db.execute(sql`
        INSERT INTO notification_outbox (id, event_type, payload, status)
        VALUES (
          ${'reg-confirmed-' + row.rsvp_id},
          'REGISTRATION_CONFIRMED',
          ${JSON.stringify({ rsvpId: row.rsvp_id })}::jsonb,
          'pending'
        )
        ON CONFLICT (id) DO NOTHING
      `);

      console.log(`[outbox] ✅ Healed RSVP#${row.rsvp_id} (event=${row.event_id} user=${row.user_id})`);
    } catch (err) {
      console.error(`[outbox] ⚠️  Failed to heal RSVP#${row.rsvp_id}:`, err);
    }
  }
}

/**
 * Reset rows that have been stuck in `processing` state for more than 2 minutes
 * back to `pending`.  This handles server crashes or restarts that happened
 * between the "mark processing" DB commit and the actual email send.
 */
export async function resetStuckRows(): Promise<void> {
  const result = await db.execute(sql`
    UPDATE notification_outbox
    SET status = 'pending'
    WHERE status = 'processing'
      AND created_at < NOW() - INTERVAL '2 minutes'
  `);
  const count = (result as any).rowCount ?? 0;
  if (count > 0) {
    console.log(`[outbox] ♻️  Reset ${count} stuck-in-processing row(s) back to pending`);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Background poller
// ────────────────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 60_000; // 60 seconds
let _pollerStarted = false;

/**
 * Start the outbox system at server startup.
 *
 * Always runs a one-shot startup recovery tick (heal stale RSVPs, reset stuck
 * rows, drain any pending emails left over from before the last restart).
 *
 * Only starts the repeating background interval when ENABLE_OUTBOX_POLLER=true.
 * Leave it OFF to allow Neon DB to auto-suspend between requests (recommended
 * when you have zero or very few users).
 *
 * Safe to call multiple times — only one poller will ever be running.
 */
export function startOutboxPoller(): void {
  if (_pollerStarted) return;
  _pollerStarted = true;

  const tick = async () => {
    try {
      // Step 1: heal any RSVPs where payment is captured but email was never queued
      await healStalePayments();

      // Step 2: reset stuck processing rows
      await resetStuckRows();

      // Step 3: send pending outbox rows
      const countResult = await db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending')    AS pending,
          COUNT(*) FILTER (WHERE status = 'processing') AS processing,
          COUNT(*) FILTER (WHERE status = 'failed')     AS failed
        FROM notification_outbox
        WHERE processed_at IS NULL OR processed_at > NOW() - INTERVAL '10 minutes'
      `);
      const counts = countResult.rows[0] as any;
      const hasPending = parseInt(counts?.pending ?? '0') > 0;
      const hasProcessing = parseInt(counts?.processing ?? '0') > 0;

      if (hasPending || hasProcessing) {
        console.log(`[outbox] tick — pending=${counts.pending} processing=${counts.processing} failed=${counts.failed}`);
      }

      await processNotificationOutbox();
    } catch (err) {
      console.error('[outbox] Poller tick error:', err);
    }
  };

  // ── Always: one-shot startup recovery ──────────────────────────────────────
  // Heals stale RSVPs, resets stuck rows, and drains any pending rows left
  // over from before the server last restarted. Does NOT keep DB awake.
  console.log('[outbox] 🚀 Running startup recovery tick…');
  tick();

  // ── Optional: repeating background poller ──────────────────────────────────
  // Only start the interval if explicitly enabled. Without it, on-demand
  // processing (via emitRegistrationConfirmed) handles all normal sends, and
  // failures are recovered on the next server restart startup tick.
  if (process.env.ENABLE_OUTBOX_POLLER === 'true') {
    console.log(`[outbox] 🔔 Background poller ENABLED (interval: ${POLL_INTERVAL_MS / 1000}s)`);
    setInterval(tick, POLL_INTERVAL_MS);
  } else {
    console.log('[outbox] 💤 Background poller DISABLED — on-demand only (set ENABLE_OUTBOX_POLLER=true to enable)');
  }
}
