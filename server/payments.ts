import Razorpay from 'razorpay';
import crypto from 'crypto';
import { db } from './db';
import { paymentTransactions, events, eventRsvps } from '../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

// Initialize Razorpay instance
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error('⚠️  RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment variables');
}

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

interface CreateOrderParams {
  eventId: number;
  userId: string;
  amount: number; // in rupees
  currency?: string;
  receipt?: string;
  notes?: Record<string, any>;
}

interface VerifyPaymentParams {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export class PaymentService {
  /**
   * Create a Razorpay order for event ticket purchase
   */
  static async createOrder(params: CreateOrderParams) {
    const { eventId, userId, amount, currency = 'INR', receipt, notes = {} } = params;

    try {
      // Get event details
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);

      if (!event) {
        throw new Error('Event not found');
      }

      // Manual close: prevent starting a paid registration flow for closed events.
      if (event.isClosed) {
        const error: any = new Error('Event is closed by the host');
        error.eventClosed = true;
        throw error;
      }

      if (!event.ticketingEnabled) {
        throw new Error('Ticketing is not enabled for this event');
      }

      // Check if user already has a successful payment for this event
      const [existingPayment] = await db
        .select()
        .from(paymentTransactions)
        .where(
          and(
            eq(paymentTransactions.eventId, eventId),
            eq(paymentTransactions.userId, userId),
            eq(paymentTransactions.status, 'captured')
          )
        )
        .limit(1);

      if (existingPayment) {
        throw new Error('You have already purchased a ticket for this event');
      }

      // CHECK CAPACITY: Before processing payment, ensure event is not full
      if (event.maxGuests && event.maxGuests > 0) {
        const [result] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(eventRsvps)
          .where(
            and(
              eq(eventRsvps.eventId, eventId),
              eq(eventRsvps.status, 'going')
            )
          );

        const currentCapacity = result?.count || 0;

        if (currentCapacity >= event.maxGuests) {
          const error: any = new Error('Event capacity has been reached');
          error.eventFull = true;
          error.currentCapacity = currentCapacity;
          error.maxCapacity = event.maxGuests;
          throw error;
        }
      }

      // Validate Razorpay credentials
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error('Payment gateway not configured. Please contact support.');
      }

      // Amount is already in paise (frontend sends amount * 100)
      const amountInPaise = Math.round(amount);

      console.log('Creating Razorpay order:', { eventId, userId, amountInPaise, event: event.title });

      // Create Razorpay order
      let order;
      try {
        // Generate short receipt ID (max 40 chars as per Razorpay)
        const timestamp = Date.now().toString().slice(-8); // Last 8 digits
        const shortReceipt = receipt || `evt${eventId}_${timestamp}`;
        
        order = await razorpay.orders.create({
          amount: amountInPaise,
          currency,
          receipt: shortReceipt,
          notes: {
            event_id: eventId.toString(),
            user_id: userId,
            event_title: event.title,
            ...notes,
          },
        });
        console.log('✅ Razorpay order created:', order.id);
      } catch (razorpayError: any) {
        console.error('❌ Razorpay API error:', razorpayError);
        throw new Error(`Razorpay API failed: ${razorpayError.error?.description || razorpayError.message}`);
      }

      // Calculate platform fee (0%) and host share
      const platformFeePercent = 0;
      const platformFee = Math.round((amountInPaise * platformFeePercent) / 100);
      const hostShare = amountInPaise - platformFee;

      // Save transaction to database
      const [transaction] = await db
        .insert(paymentTransactions)
        .values({
          razorpayOrderId: order.id,
          eventId,
          userId,
          amount: amountInPaise,
          currency,
          status: 'created',
          platformFee,
          hostShare,
          notes: order.notes,
        })
        .returning();

      return {
        orderId: order.id,
        amount: amountInPaise,
        currency,
        transaction,
        event: {
          id: event.id,
          title: event.title,
        },
      };
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw error;
    }
  }

  /**
   * Verify Razorpay payment signature
   */
  static verifyPaymentSignature(params: VerifyPaymentParams): boolean {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = params;

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    return generatedSignature === razorpay_signature;
  }

  /**
   * Update payment status after successful payment
   * NOTE: This is now redundant - Razorpay webhooks are the source of truth.
   * This endpoint is kept for backwards compatibility but RSVP creation is delegated to webhooks.
   */
  static async handleSuccessfulPayment(params: VerifyPaymentParams) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = params;

    try {
      // Verify signature
      const isValid = this.verifyPaymentSignature(params);

      if (!isValid) {
        throw new Error('Invalid payment signature');
      }

      // Fetch payment details from Razorpay with retry logic
      let payment;
      let retries = 3;
      while (retries > 0) {
        try {
          payment = await razorpay.payments.fetch(razorpay_payment_id);
          break; // Success, exit retry loop
        } catch (err) {
          retries--;
          if (retries === 0) throw err;
          console.warn(`Retrying Razorpay fetch (${retries} left)...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        }
      }

      // Update transaction in database with retry logic for connection issues
      // NOTE: RSVP creation is handled by webhook, not here
      let updatedTransaction;
      retries = 3;
      while (retries > 0) {
        try {
          [updatedTransaction] = await db
            .update(paymentTransactions)
            .set({
              razorpayPaymentId: razorpay_payment_id,
              razorpaySignature: razorpay_signature,
              status: payment.status === 'captured' ? 'captured' : 'authorized',
              paymentMethod: payment.method,
              email: payment.email || null,
              contact: payment.contact ? String(payment.contact) : null,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(paymentTransactions.razorpayOrderId, razorpay_order_id))
            .returning();
          break; // Success, exit retry loop
        } catch (dbErr: any) {
          retries--;
          if (retries === 0) throw dbErr;
          console.warn(`Database connection issue, retrying (${retries} left)...`, dbErr.message);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
        }
      }

      if (!updatedTransaction) {
        throw new Error('Transaction not found');
      }

      console.log('⚠️  Payment updated via frontend verification. RSVP will be created by webhook.');

      return {
        success: true,
        transaction: updatedTransaction,
        payment,
      };
    } catch (error) {
      console.error('Error handling successful payment:', error);
      
      // Try to update transaction as failed with retry
      try {
        let retries = 2;
        while (retries > 0) {
          try {
            await db
              .update(paymentTransactions)
              .set({
                status: 'failed',
                updatedAt: new Date().toISOString(),
              })
              .where(eq(paymentTransactions.razorpayOrderId, razorpay_order_id));
            break;
          } catch (dbErr) {
            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }
      } catch (updateError) {
        console.error('Failed to mark transaction as failed:', updateError);
      }

      throw error;
    }
  }

  /**
   * Handle failed payment
   */
  static async handleFailedPayment(orderId: string, reason?: string) {
    try {
      await db
        .update(paymentTransactions)
        .set({
          status: 'failed',
          notes: { failure_reason: reason },
          updatedAt: new Date().toISOString(),
        })
        .where(eq(paymentTransactions.razorpayOrderId, orderId));

      return { success: true };
    } catch (error) {
      console.error('Error handling failed payment:', error);
      throw error;
    }
  }

  /**
   * Get user's payment status for an event
   */
  static async getUserPaymentStatus(eventId: number, userId: string) {
    try {
      const [payment] = await db
        .select()
        .from(paymentTransactions)
        .where(
          and(
            eq(paymentTransactions.eventId, eventId),
            eq(paymentTransactions.userId, userId)
          )
        )
        .orderBy(paymentTransactions.createdAt)
        .limit(1);

      return payment;
    } catch (error) {
      console.error('Error getting payment status:', error);
      return null;
    }
  }

  /**
   * Get all payments for an event (for host)
   */
  static async getEventPayments(eventId: number) {
    try {
      const payments = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.eventId, eventId))
        .orderBy(paymentTransactions.createdAt);

      return payments;
    } catch (error) {
      console.error('Error getting event payments:', error);
      return [];
    }
  }

  /**
   * Refund a payment
   */
  static async refundPayment(paymentId: string, amount?: number) {
    try {
      const refund = await razorpay.payments.refund(paymentId, {
        amount: amount, // If not provided, full amount will be refunded
      });

      // Update transaction status
      await db
        .update(paymentTransactions)
        .set({
          status: 'refunded',
          updatedAt: new Date().toISOString(),
        })
        .where(eq(paymentTransactions.razorpayPaymentId, paymentId));

      return refund;
    } catch (error) {
      console.error('Error refunding payment:', error);
      throw error;
    }
  }

  /**
   * Verify Razorpay webhook signature
   */
  static verifyWebhookSignature(body: string, signature: string): boolean {
    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      
      if (!webhookSecret) {
        console.error('RAZORPAY_WEBHOOK_SECRET not configured');
        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }
}
