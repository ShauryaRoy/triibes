import { db } from './db';
import { paymentTransactions, eventRsvps } from '../drizzle/schema';
import { eq, and, lt, or, sql } from 'drizzle-orm';
import Razorpay from 'razorpay';

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

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
  private static async reconcileSinglePayment(
    payment: typeof paymentTransactions.$inferSelect,
    result: ReconciliationResult
  ): Promise<void> {
    console.log(`🔎 Checking payment ${payment.id} (Order: ${payment.razorpayOrderId})`);

    try {
      // Fetch payment details from Razorpay with retry logic
      let razorpayPayment: any = null;
      let razorpayOrder: any = null;

      // Try to fetch using payment ID first (if available)
      if (payment.razorpayPaymentId) {
        try {
          razorpayPayment = await this.fetchWithRetry(() => 
            razorpay.payments.fetch(payment.razorpayPaymentId!)
          );
          console.log(`💳 Razorpay Payment Status: ${razorpayPayment.status}`);
        } catch (error: any) {
          console.warn(`⚠️  Could not fetch payment ${payment.razorpayPaymentId}: ${error.message}`);
        }
      }

      // Fallback: Fetch order and check payments
      if (!razorpayPayment) {
        try {
          razorpayOrder = await this.fetchWithRetry(() => 
            razorpay.orders.fetch(payment.razorpayOrderId)
          );
          console.log(`📦 Razorpay Order Status: ${razorpayOrder.status}`);

          // Get payments for this order
          const orderPayments = await this.fetchWithRetry(() => 
            razorpay.orders.fetchPayments(payment.razorpayOrderId)
          );

          // Find a successful payment
          if (orderPayments.items && orderPayments.items.length > 0) {
            razorpayPayment = orderPayments.items.find(
              (p: any) => p.status === 'captured' || p.status === 'authorized'
            ) || orderPayments.items[0];
            console.log(`💳 Found payment in order: ${razorpayPayment.id}, Status: ${razorpayPayment.status}`);
          }
        } catch (error: any) {
          console.warn(`⚠️  Could not fetch order ${payment.razorpayOrderId}: ${error.message}`);
        }
      }

      // Determine if we should update
      const shouldUpdate = razorpayPayment && 
        (razorpayPayment.status === 'captured' || razorpayPayment.status === 'authorized') &&
        payment.status !== razorpayPayment.status;

      if (shouldUpdate) {
        console.log(`🔄 Updating payment ${payment.id} from '${payment.status}' to '${razorpayPayment.status}'`);
        await this.updatePaymentAndCreateRSVP(payment, razorpayPayment);
        result.updated++;
        console.log(`✅ Successfully updated payment ${payment.id}`);
      } else if (razorpayPayment) {
        console.log(`ℹ️  Payment ${payment.id} status matches Razorpay (${razorpayPayment.status}), no update needed`);
      } else {
        console.log(`⚠️  Payment ${payment.id}: Could not fetch from Razorpay, skipping`);
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
    // Use a database transaction for atomicity
    await db.transaction(async (tx) => {
      // 1. Update payment transaction
      await tx
        .update(paymentTransactions)
        .set({
          status: razorpayPayment.status === 'captured' ? 'captured' : 'authorized',
          razorpayPaymentId: razorpayPayment.id,
          paymentMethod: razorpayPayment.method || payment.paymentMethod,
          email: razorpayPayment.email || payment.email,
          contact: razorpayPayment.contact ? String(razorpayPayment.contact) : payment.contact,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(paymentTransactions.id, payment.id));

      console.log(`💾 Updated payment ${payment.id} to status: ${razorpayPayment.status}`);

      // 2. Create or update RSVP only if payment is captured (ATOMIC CAPACITY CHECK + UPSERT)
      if (razorpayPayment.status === 'captured') {
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
          // Payment status already updated by webhook, RSVP already exists, nothing more to do
          return;
        }

        // ATOMIC CAPACITY INCREMENT: Try to claim a spot in the event
        // Only executed if no 'going' RSVP exists
        const capacityUpdate = await tx.execute(sql`
          UPDATE events 
          SET current_capacity = current_capacity + 1 
          WHERE id = ${payment.eventId} 
            AND (max_guests IS NULL OR current_capacity < max_guests)
          RETURNING id, current_capacity, max_guests
        `);

        // Check if capacity update succeeded
        if (!capacityUpdate || !capacityUpdate.rows || capacityUpdate.rows.length === 0) {
          console.error(`❌ Event ${payment.eventId} is at full capacity. Cannot create RSVP for reconciled payment.`);
          
          // Mark transaction with capacity rejection flag for refund processing
          await tx
            .update(paymentTransactions)
            .set({
              notes: sql`COALESCE(notes, '{}'::jsonb) || '{"capacity_rejected": true, "rejected_at": "${new Date().toISOString()}", "reconciled": true}'::jsonb`,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(paymentTransactions.id, payment.id));
          
          // TODO: Implement automatic refund for capacity-rejected payments
          console.warn(`⚠️ TODO: Process refund for payment ${payment.razorpayPaymentId} (transaction ${payment.id}) - event at capacity`);
          
          throw new Error(`Event capacity reached during reconciliation. Payment captured but RSVP not created. Refund required.`);
        }

        console.log(`✅ Capacity claimed during reconciliation: ${capacityUpdate.rows[0].current_capacity}/${capacityUpdate.rows[0].max_guests || 'unlimited'} for event ${payment.eventId}`);

        // Only create RSVP if capacity increment succeeded and no 'going' RSVP exists
        const now = new Date().toISOString();
        await tx
          .insert(eventRsvps)
          .values({
            eventId: payment.eventId,
            userId: payment.userId,
            status: 'going',
            plusOneCount: 0,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [eventRsvps.eventId, eventRsvps.userId],
            set: {
              status: 'going',
              updatedAt: now,
            },
          });
        
        console.log(`✅ RSVP created/updated via UPSERT for user ${payment.userId} at event ${payment.eventId}`);
      }
    });
  }

  /**
   * Fetch with retry logic for API calls
   */
  private static async fetchWithRetry<T>(
    fetchFn: () => Promise<T>,
    retries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fetchFn();
      } catch (error: any) {
        lastError = error;
        console.warn(`  Attempt ${attempt}/${retries} failed: ${error.message}`);
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        }
      }
    }

    throw lastError || new Error('Fetch failed after retries');
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
