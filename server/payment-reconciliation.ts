import { db } from './db';
import { paymentTransactions, eventRsvps } from '../drizzle/schema';
import { eq, and, lt, or, sql, gt, desc } from 'drizzle-orm';
import Razorpay from 'razorpay';
import { emitRegistrationConfirmed } from './notification-outbox';

// Lazily create Razorpay instance so it always uses the current env vars
// This ensures rotated API keys are picked up without restarting the server
function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  if (!keyId || !keySecret) {
    throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables are not set');
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

interface ReconciliationResult {
  checked: number;
  updated: number;
  failed: number;
  errors: string[];
}

/**
 * Payment Reconciliation Service
 * 
 * Finds payments stuck in 'created' or 'authorized' status and reconciles them
 * with Razorpay's actual payment status. Automatically creates RSVPs for captured payments.
 */
export class PaymentReconciliationService {
  
  /**
   * Run reconciliation for stuck payments
   * @param olderThanMinutes - Only check payments older than this many minutes (default: 10)
   */
  static async reconcilePayments(olderThanMinutes: number = 10): Promise<ReconciliationResult> {
    const startTime = Date.now();
    console.log('🔄 Starting payment reconciliation...');
    console.log(`📅 Checking payments older than ${olderThanMinutes} minutes`);
    
    const result: ReconciliationResult = {
      checked: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };

    try {
      // Calculate cutoff time
      const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);
      
      // Find stuck payments (created or authorized status, older than cutoff)
      const stuckPayments = await db
        .select()
        .from(paymentTransactions)
        .where(
          and(
            or(
              eq(paymentTransactions.status, 'created'),
              eq(paymentTransactions.status, 'authorized')
            ),
            lt(paymentTransactions.createdAt, cutoffTime.toISOString())
          )
        );

      console.log(`🔍 Found ${stuckPayments.length} potentially stuck payments`);
      result.checked = stuckPayments.length;

      // Process each stuck payment
      for (const payment of stuckPayments) {
        try {
          await this.reconcileSinglePayment(payment, result);
        } catch (error: any) {
          result.failed++;
          const errorMsg = `Payment ${payment.id} (Order: ${payment.razorpayOrderId}): ${error.message}`;
          console.error('❌ ' + errorMsg);
          result.errors.push(errorMsg);
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log('✅ Reconciliation completed');
      console.log(`📊 Summary: Checked=${result.checked}, Updated=${result.updated}, Failed=${result.failed}`);
      console.log(`⏱️  Duration: ${duration}s`);

      return result;
    } catch (error: any) {
      console.error('💥 Critical error during reconciliation:', error);
      result.errors.push(`Critical error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reconcile a single payment transaction
   */
  static async reconcileSinglePayment(
    payment: typeof paymentTransactions.$inferSelect,
    result?: ReconciliationResult
  ): Promise<void> {
    console.log(`🔎 Checking payment ${payment.id} (Order: ${payment.razorpayOrderId})`);

    try {
      // Fetch payment details from Razorpay with retry logic
      let razorpayPayment: any = null;
      let razorpayOrder: any = null;

      const rzp = getRazorpayClient();

      // Try to fetch using payment ID first (if available)
      if (payment.razorpayPaymentId) {
        try {
          razorpayPayment = await this.fetchWithRetry(() => 
            rzp.payments.fetch(payment.razorpayPaymentId!)
          );
          console.log(`💳 Razorpay Payment Status: ${razorpayPayment.status}`);
        } catch (error: any) {
          console.warn(`⚠️  Could not fetch payment ${payment.razorpayPaymentId}: ${this.extractErrorMessage(error)}`);
        }
      }

      // Fallback: Fetch order and check payments
      if (!razorpayPayment) {
        try {
          razorpayOrder = await this.fetchWithRetry(() => 
            rzp.orders.fetch(payment.razorpayOrderId)
          );
          console.log(`📦 Razorpay Order Status: ${razorpayOrder.status}`);

          // Get payments for this order
          const orderPayments = await this.fetchWithRetry(() => 
            rzp.orders.fetchPayments(payment.razorpayOrderId)
          );

          // Find a successful payment
          if (orderPayments.items && orderPayments.items.length > 0) {
            razorpayPayment = orderPayments.items.find(
              (p: any) => p.status === 'captured' || p.status === 'authorized'
            ) || orderPayments.items[0];
            console.log(`💳 Found payment in order: ${razorpayPayment.id}, Status: ${razorpayPayment.status}`);
          }
        } catch (error: any) {
          console.warn(`⚠️  Could not fetch order ${payment.razorpayOrderId}: ${this.extractErrorMessage(error)}`);
        }
      }

      // Determine if we should update
      const shouldUpdate = razorpayPayment && 
        (razorpayPayment.status === 'captured' || razorpayPayment.status === 'authorized') &&
        payment.status !== razorpayPayment.status;

      if (shouldUpdate) {
        console.log(`🔄 Updating payment ${payment.id} from '${payment.status}' to '${razorpayPayment.status}'`);
        await this.updatePaymentAndCreateRSVP(payment, razorpayPayment);
        if (result) result.updated++;
        console.log(`✅ Successfully updated payment ${payment.id}`);
      } else if (razorpayPayment) {
        console.log(`ℹ️  Payment ${payment.id} status matches Razorpay (${razorpayPayment.status}), no update needed`);
      } else {
        // No payment found on Razorpay.
        // Only mark as failed if the payment is old enough (>10 min). Fresh payments
        // may simply not have been processed by Razorpay yet — leave them for the
        // next reconciliation pass.
        const createdAt = payment.createdAt ? new Date(payment.createdAt).getTime() : 0;
        const ageMinutes = (Date.now() - createdAt) / 60_000;
        if (ageMinutes > 10) {
          console.warn(`⚠️  Payment ${payment.id}: Order not found in Razorpay after ${Math.round(ageMinutes)} min. Marking as failed.`);
          await db
            .update(paymentTransactions)
            .set({
              status: 'failed',
              updatedAt: new Date().toISOString(),
            })
            .where(eq(paymentTransactions.id, payment.id));
          console.log(`🗑️  Payment ${payment.id} marked as failed — will no longer appear in reconciliation.`);
        } else {
          console.log(`⏳ Payment ${payment.id} is only ${Math.round(ageMinutes)} min old — skipping, Razorpay may still be processing.`);
        }
      }

    } catch (error: any) {
      console.error(`❌ Error reconciling payment ${payment.id}:`, error.message);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }

  /**
   * Update payment status and create RSVP in a transaction (ATOMIC and IDEMPOTENT)
   */
  private static async updatePaymentAndCreateRSVP(
    payment: typeof paymentTransactions.$inferSelect,
    razorpayPayment: any
  ): Promise<void> {
    let rsvpId: number | null = null;

    // Use a database transaction for atomicity
    await db.transaction(async (tx) => {
      // 1. ATOMIC status update — only succeeds if row is still 'created', 'authorized', or fresh 'failed'
      //    This prevents both webhook and reconciliation from acting on the same row.
      const [updated] = await tx
        .update(paymentTransactions)
        .set({
          status: razorpayPayment.status === 'captured' ? 'captured' : 'authorized',
          razorpayPaymentId: razorpayPayment.id,
          paymentMethod: razorpayPayment.method || payment.paymentMethod,
          email: razorpayPayment.email || payment.email,
          contact: razorpayPayment.contact ? String(razorpayPayment.contact) : payment.contact,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(paymentTransactions.id, payment.id),
            sql`${paymentTransactions.status} IN ('created', 'authorized', 'failed')`
          )
        )
        .returning();

      if (!updated) {
        console.log(`🔄 Idempotent reconciliation: payment ${payment.id} already captured. Skipping.`);
        return;
      }

      console.log(`💾 Updated payment ${payment.id} to status: ${razorpayPayment.status}`);

      // 2. Create or update RSVP only if payment is captured (ATOMIC CAPACITY CHECK + UPSERT)
      if (razorpayPayment.status === 'captured') {
        const now = new Date().toISOString();

        // Validate event exists and fetch approval/capacity behavior.
        const eventResult = await tx.execute(sql`
          SELECT id, entry_mode, COALESCE(max_capacity, max_guests) AS capacity_limit
          FROM events
          WHERE id = ${payment.eventId}
          LIMIT 1
        `);
        const eventRow: any = eventResult.rows?.[0];
        if (!eventRow) {
          throw new Error(`Event not found for payment ${payment.id}`);
        }

        // Approval-mode events require approved application before attendee creation.
        if (eventRow.entry_mode === 'approval') {
          const appResult = await tx.execute(sql`
            SELECT status
            FROM applications
            WHERE event_id = ${payment.eventId}
              AND user_id = ${payment.userId}
            LIMIT 1
          `);
          const appRow: any = appResult.rows?.[0];
          if (!appRow || appRow.status !== 'approved') {
            await tx
              .update(paymentTransactions)
              .set({
                notes: sql`COALESCE(${paymentTransactions.notes}, '{}'::jsonb) || ${JSON.stringify({ approval_required_not_met: true, checked_at: now, reconciled: true })}::jsonb`,
                updatedAt: now,
              })
              .where(eq(paymentTransactions.id, payment.id));
            console.warn(`⚠️ Reconciliation skipped attendee creation for payment ${payment.id}: approval not satisfied.`);
            return;
          }
        }

        // IDEMPOTENCY CHECK: Check if user already has a 'going' RSVP for this event
        // This prevents duplicate capacity increments if webhook already processed this payment
        const existingRsvpResult = await tx.execute(sql`
          SELECT 1 FROM event_rsvps
          WHERE event_id = ${payment.eventId}
            AND user_id = ${payment.userId}
            AND status = 'going'
          LIMIT 1
          FOR UPDATE
        `);

        if (existingRsvpResult.rows.length > 0) {
          console.log(`🔄 Idempotent reconciliation: User ${payment.userId} already has 'going' RSVP for event ${payment.eventId}. Skipping capacity increment.`);
          // Capacity already counted — but ensure paymentStatus + confirmedAt are
          // set (they may be missing if storage.updateRsvp set 'going' earlier)
          // and capture the rsvpId so the outbox event fires.
          const [patched] = await tx
            .update(eventRsvps)
            .set({
              paymentStatus: 'captured',
              confirmedAt: sql`COALESCE(${eventRsvps.confirmedAt}, ${now}::timestamptz)`,
              price: payment.amount ?? 0,
              updatedAt: now,
            })
            .where(
              and(
                eq(eventRsvps.eventId, payment.eventId!),
                eq(eventRsvps.userId, payment.userId!),
              )
            )
            .returning();
          rsvpId = patched?.id ?? null;
          console.log('✅ Patched existing RSVP payment columns for user:', payment.userId, 'event:', payment.eventId);
          return;
        }

        // ATOMIC CAPACITY INCREMENT: Try to claim a spot in the event
        // Only executed if no 'going' RSVP exists
        const capacityUpdate = await tx.execute(sql`
          UPDATE events 
          SET current_capacity = current_capacity + 1 
          WHERE id = ${payment.eventId} 
            AND (COALESCE(max_capacity, max_guests) IS NULL OR current_capacity < COALESCE(max_capacity, max_guests))
          RETURNING id, current_capacity, COALESCE(max_capacity, max_guests) AS capacity_limit
        `);

        // Check if capacity update succeeded
        if (!capacityUpdate || !capacityUpdate.rows || capacityUpdate.rows.length === 0) {
          console.error(`❌ Event ${payment.eventId} is at full capacity. Cannot create RSVP for reconciled payment.`);

          // Payment captured but seat allocation failed.
          await tx
            .update(paymentTransactions)
            .set({
              status: 'paid_no_seat',
              notes: sql`COALESCE(${paymentTransactions.notes}, '{}'::jsonb) || ${JSON.stringify({ paid_no_seat: true, rejected_at: now, reconciled: true })}::jsonb`,
              updatedAt: now,
            })
            .where(eq(paymentTransactions.id, payment.id));

          console.warn(`⚠️ Reconciliation marked payment ${payment.id} as paid_no_seat (event ${payment.eventId} full).`);
          return;
        }

        console.log(`✅ Capacity claimed during reconciliation: ${capacityUpdate.rows[0].current_capacity}/${capacityUpdate.rows[0].capacity_limit || 'unlimited'} for event ${payment.eventId}`);

        // Only create RSVP if capacity increment succeeded and no 'going' RSVP exists
        const [newRsvp] = await tx
          .insert(eventRsvps)
          .values({
            eventId: payment.eventId,
            userId: payment.userId,
            status: 'going',
            price: payment.amount ?? 0,
            paymentStatus: 'captured',
            confirmedAt: now,
            plusOneCount: 0,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [eventRsvps.eventId, eventRsvps.userId],
            set: {
              status: 'going',
              price: payment.amount ?? 0,
              paymentStatus: 'captured',
              confirmedAt: now,
              updatedAt: now,
            },
          })
          .returning();

        rsvpId = newRsvp?.id ?? null;
        
        console.log(`✅ RSVP created/updated via UPSERT for user ${payment.userId} at event ${payment.eventId}`);
      }
    });

    // Emit outbox event for registration confirmation email (outside transaction)
    if (rsvpId) {
      emitRegistrationConfirmed(rsvpId).catch(err =>
        console.error('[outbox] reconciliation: failed to emit for RSVP', rsvpId, err)
      );
    }
  }

  /**
   * Extract a human-readable message from any error type, including Razorpay SDK errors
   * Razorpay SDK throws plain objects like { statusCode, error: { description, ... } }
   * rather than standard Error instances.
   */
  private static extractErrorMessage(error: any): string {
    if (!error) return 'Unknown error';
    // Razorpay SDK error format: { error: { description: '...' }, statusCode: 401 }
    if (error.error?.description) return `[${error.statusCode || error.error.code || 'ERR'}] ${error.error.description}`;
    if (error.error?.code) return `[${error.error.code}] ${JSON.stringify(error.error)}`;
    // Standard Error
    if (error.message) return error.message;
    // Fallback
    try { return JSON.stringify(error); } catch { return String(error); }
  }

  /**
   * Returns true for errors that will never succeed on retry (e.g. 400 not found).
   * These are caused by orders created under a different Razorpay account/key pair.
   */
  private static isNonRetryableError(error: any): boolean {
    const status = error?.statusCode ?? error?.status;
    return status === 400 || status === 404;
  }

  /**
   * Fetch with retry logic for API calls.
   * Non-retryable errors (400/404) are thrown immediately without retrying.
   */
  private static async fetchWithRetry<T>(
    fetchFn: () => Promise<T>,
    retries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: any = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fetchFn();
      } catch (error: any) {
        lastError = error;
        const msg = this.extractErrorMessage(error);

        // 400/404: order/payment doesn't exist in this Razorpay account — no point retrying
        if (this.isNonRetryableError(error)) {
          console.warn(`  Attempt ${attempt}/${retries} failed (non-retryable): ${msg}`);
          break;
        }

        console.warn(`  Attempt ${attempt}/${retries} failed: ${msg}`);
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        }
      }
    }

    // Re-throw as proper Error with diagnostic message
    const msg = this.extractErrorMessage(lastError);
    const nonRetryable = this.isNonRetryableError(lastError);
    const err = new Error(msg) as any;
    err.nonRetryable = nonRetryable;
    throw err;
  }

  /**
   * Get reconciliation statistics
   */
  static async getStuckPaymentsCount(olderThanMinutes: number = 10): Promise<number> {
    const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    
    const stuckPayments = await db
      .select({ id: paymentTransactions.id })
      .from(paymentTransactions)
      .where(
        and(
          or(
            eq(paymentTransactions.status, 'created'),
            eq(paymentTransactions.status, 'authorized')
          ),
          lt(paymentTransactions.createdAt, cutoffTime.toISOString())
        )
      );

    return stuckPayments.length;
  }
}
