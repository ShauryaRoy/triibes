import { db } from '../server/db';
import { sql } from 'drizzle-orm';

const FIX_MODE = process.argv.includes('--fix');
const PROCESS_MODE = process.argv.includes('--process');

async function check() {
  // Check outbox rows — all statuses
  const outbox = await db.execute(sql`
    SELECT id, event_type, status, retry_count, created_at, processed_at
    FROM notification_outbox
    ORDER BY created_at DESC LIMIT 30
  `);
  console.log('=== NOTIFICATION OUTBOX (last 30) ===');
  for (const row of outbox.rows) {
    const age = row.created_at
      ? Math.round((Date.now() - new Date(row.created_at as string).getTime()) / 1000) + 's ago'
      : '?';
    console.log(`  ${row.id} | ${row.event_type} | status=${row.status} | retries=${row.retry_count} | created=${age} | processed=${row.processed_at ?? 'never'}`);
  }
  if (outbox.rows.length === 0) console.log('  (empty)');

  // Summary by status
  const summary = await db.execute(sql`SELECT status, COUNT(*) as count FROM notification_outbox GROUP BY status`);
  console.log('\n=== OUTBOX SUMMARY ===');
  for (const row of summary.rows) console.log(`  ${row.status}: ${row.count}`);

  // Specifically flag stuck rows
  const stuck = await db.execute(sql`
    SELECT id, event_type, retry_count, created_at
    FROM notification_outbox
    WHERE status = 'processing'
    ORDER BY created_at ASC
  `);
  if (stuck.rows.length > 0) {
    console.log(`\n⚠️  STUCK IN PROCESSING (${stuck.rows.length} rows — will NOT send until reset):`);
    for (const row of stuck.rows) console.log(`  ${row.id} | retries=${row.retry_count} | created=${row.created_at}`);
  }

  if (PROCESS_MODE) {
    console.log('\n⚙️  --process mode: healing stale RSVPs, resetting stuck rows, processing pending...');
    const { healStalePayments, processNotificationOutbox } = await import('../server/notification-outbox');
    await healStalePayments();
    await db.execute(sql`UPDATE notification_outbox SET status = 'pending' WHERE status = 'processing'`);
    await db.execute(sql`UPDATE notification_outbox SET status = 'pending', retry_count = 0 WHERE status = 'failed'`);
    await processNotificationOutbox();
    console.log('✅ processNotificationOutbox() complete');
  }

  // Check recent RSVPs with payment_status != not_required
  const rsvps = await db.execute(sql`SELECT id, event_id, user_id, status, price, payment_status, confirmed_at, created_at FROM event_rsvps WHERE payment_status != 'not_required' ORDER BY created_at DESC LIMIT 10`);
  console.log('\n=== PAID RSVPs ===');
  for (const row of rsvps.rows) {
    console.log(`  RSVP#${row.id} | event=${row.event_id} | user=${row.user_id} | status=${row.status} | price=${row.price} | pay=${row.payment_status} | confirmed=${row.confirmed_at}`);
  }
  if (rsvps.rows.length === 0) console.log('  (empty)');

  // Check recent captured payments
  const payments = await db.execute(sql`SELECT id, event_id, user_id, status, amount, razorpay_order_id FROM payment_transactions WHERE status = 'captured' ORDER BY created_at DESC LIMIT 5`);
  console.log('\n=== CAPTURED PAYMENTS ===');
  for (const row of payments.rows) {
    console.log(`  TXN#${row.id} | event=${row.event_id} | user=${row.user_id} | status=${row.status} | amount=${row.amount} | order=${row.razorpay_order_id}`);
  }
  if (payments.rows.length === 0) console.log('  (empty)');

  // Check if there are captured payments WITHOUT a corresponding going RSVP (the bug!)
  const orphans = await db.execute(sql`
    SELECT pt.id as txn_id, pt.event_id, pt.user_id, pt.status as pay_status, pt.amount,
           er.id as rsvp_id, er.status as rsvp_status, er.payment_status, er.confirmed_at
    FROM payment_transactions pt
    LEFT JOIN event_rsvps er ON er.event_id = pt.event_id AND er.user_id = pt.user_id
    WHERE pt.status = 'captured'
      AND (er.status IS NULL OR er.status != 'going')
    ORDER BY pt.created_at DESC
    LIMIT 10
  `);
  console.log('\n=== ORPHANED PAYMENTS (captured but no going RSVP) ===');
  for (const row of orphans.rows) {
    console.log(`  TXN#${row.txn_id} | event=${row.event_id} | user=${row.user_id} | pay=${row.pay_status} | RSVP#${row.rsvp_id} rsvp_status=${row.rsvp_status} payment_status=${row.payment_status}`);
  }
  if (orphans.rows.length === 0) console.log('  (none — all good!)');

  // ── Fix mode: repair RSVPs with captured payments but stale paymentStatus ──
  const stale = await db.execute(sql`
    SELECT er.id as rsvp_id, er.event_id, er.user_id, er.payment_status, pt.amount
    FROM event_rsvps er
    JOIN payment_transactions pt ON pt.event_id = er.event_id AND pt.user_id = er.user_id
    WHERE pt.status = 'captured'
      AND er.status = 'going'
      AND (er.payment_status != 'captured' OR er.confirmed_at IS NULL)
  `);
  console.log(`\n=== STALE GOING RSVPs (payment captured but RSVP not updated) ===`);
  for (const row of stale.rows) {
    console.log(`  RSVP#${row.rsvp_id} | event=${row.event_id} | user=${row.user_id} | paymentStatus=${row.payment_status} | amount=${row.amount}`);
  }
  if (stale.rows.length === 0) {
    console.log('  (none — all good!)');
  } else if (FIX_MODE) {
    console.log(`\n🔧 Fixing ${stale.rows.length} stale RSVPs...`);
    for (const row of stale.rows) {
      await db.execute(sql`
        UPDATE event_rsvps
        SET payment_status = 'captured',
            confirmed_at = COALESCE(confirmed_at, NOW()),
            price = ${row.amount},
            updated_at = NOW()
        WHERE id = ${row.rsvp_id}
      `);
      // Also emit outbox event for the registration confirmation email
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
      console.log(`  ✅ Fixed RSVP#${row.rsvp_id}`);
    }
    console.log('🔧 Done! Run without --fix to verify.');
  } else {
    console.log(`  ℹ️  Run with --fix to repair these RSVPs and trigger emails`);
  }

  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
