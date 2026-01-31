import { Router, Request, Response } from 'express';
import { PaymentService } from './payments';
import express from 'express';
import { db } from './db';
import { paymentTransactions, eventRsvps } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

export const paymentRoutes = Router();

// Create payment order
paymentRoutes.post('/create-order', async (req: any, res: Response) => {
  if (!req.isAuthenticated?.() || !req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { eventId, amount } = req.body;

    console.log('Create order request:', { eventId, amount, userId: req.user.id });

    if (!eventId || !amount) {
      return res.status(400).json({ error: 'Event ID and amount are required' });
    }

    const order = await PaymentService.createOrder({
      eventId: parseInt(eventId),
      userId: req.user.id,
      amount: parseFloat(amount),
    });

    console.log('✅ Order created successfully:', order.orderId);
    res.json(order);
  } catch (error: any) {
    console.error('❌ Create order error:', error.message);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      eventFull: error.eventFull,
      eventClosed: error.eventClosed,
    });
    console.error('Stack:', error.stack);

    // If event is closed, return 403
    if (error.eventClosed) {
      return res.status(403).json({
        error: error.message || 'Event is closed by the host',
        eventClosed: true,
      });
    }
    
    // If this is a capacity error, return 403
    if (error.eventFull) {
      return res.status(403).json({
        error: error.message,
        eventFull: true,
        currentCapacity: error.currentCapacity,
        maxCapacity: error.maxCapacity,
      });
    }

    // If event is manually closed, prevent payment initiation
    if (error.eventClosed) {
      return res.status(403).json({
        error: error.message,
        eventClosed: true,
      });
    }
    
    // Return more detailed error message for other errors
    const errorMessage = error.message || 'Failed to create order';
    const errorDetails = error.description || error.reason || '';
    
    res.status(500).json({ 
      error: errorMessage,
      details: errorDetails,
      code: error.code,
    });
  }
});

// Verify payment
paymentRoutes.post('/verify', async (req: any, res: Response) => {
  if (!req.isAuthenticated?.() || !req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    const result = await PaymentService.handleSuccessfulPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: error.message || 'Payment verification failed' });
  }
});

// Handle payment failure
paymentRoutes.post('/failure', async (req: any, res: Response) => {
  if (!req.isAuthenticated?.() || !req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { orderId, reason } = req.body;

    await PaymentService.handleFailedPayment(orderId, reason);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Payment failure handling error:', error);
    res.status(500).json({ error: error.message || 'Failed to handle payment failure' });
  }
});

// Get user payment status for event
paymentRoutes.get('/status/:eventId', async (req: any, res: Response) => {
  if (!req.isAuthenticated?.() || !req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const eventId = parseInt(req.params.eventId);
    const payment = await PaymentService.getUserPaymentStatus(eventId, req.user.id);

    res.json({ payment });
  } catch (error: any) {
    console.error('Get payment status error:', error);
    res.status(500).json({ error: error.message || 'Failed to get payment status' });
  }
});

// Get all payments for an event (host only)
paymentRoutes.get('/event/:eventId/payments', async (req: any, res: Response) => {
  if (!req.isAuthenticated?.() || !req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const eventId = parseInt(req.params.eventId);
    
    // TODO: Add host verification

    const payments = await PaymentService.getEventPayments(eventId);

    res.json({ payments });
  } catch (error: any) {
    console.error('Get event payments error:', error);
    res.status(500).json({ error: error.message || 'Failed to get payments' });
  }
});

// Get Razorpay key ID (public key for frontend)
paymentRoutes.get('/razorpay-key', (req: Request, res: Response) => {
  const key = process.env.RAZORPAY_KEY_ID;
  
  if (!key) {
    console.error('⚠️  RAZORPAY_KEY_ID environment variable is not set');
    return res.status(500).json({ 
      error: 'Payment gateway not configured. Please contact support.' 
    });
  }

  console.log('✓ Razorpay key requested - returning:', key.substring(0, 10) + '...');
  res.json({ key });
});

// Debug endpoint to check payment system health
paymentRoutes.get('/health', async (req: Request, res: Response) => {
  try {
    const checks = {
      razorpayKeyConfigured: !!process.env.RAZORPAY_KEY_ID,
      razorpaySecretConfigured: !!process.env.RAZORPAY_KEY_SECRET,
      webhookSecretConfigured: !!process.env.RAZORPAY_WEBHOOK_SECRET,
      databaseConnected: false,
      paymentTableExists: false,
    };

    // Test database connection
    try {
      const result = await db.select().from(paymentTransactions).limit(1);
      checks.databaseConnected = true;
      checks.paymentTableExists = true;
    } catch (error: any) {
      checks.databaseConnected = true;
      if (error.message.includes('does not exist')) {
        checks.paymentTableExists = false;
      }
    }

    res.json(checks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Razorpay Webhook Handler
paymentRoutes.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'] as string;
    const webhookBody = req.body.toString();

    if (!webhookSignature) {
      console.error('Webhook signature missing');
      return res.status(400).json({ error: 'Signature missing' });
    }

    // Verify webhook signature
    const isValid = PaymentService.verifyWebhookSignature(webhookBody, webhookSignature);

    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(webhookBody);
    console.log('✅ Webhook event received:', event.event);

    // Handle different webhook events
    switch (event.event) {
      case 'payment.authorized':
        await handlePaymentAuthorized(event.payload.payment.entity);
        break;

      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity);
        break;

      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity);
        break;

      case 'order.paid':
        await handleOrderPaid(event.payload.order.entity);
        break;

      case 'refund.processed':
        await handleRefundProcessed(event.payload.refund.entity);
        break;

      case 'refund.failed':
        await handleRefundFailed(event.payload.refund.entity);
        break;

      case 'refund.created':
        await handleRefundCreated(event.payload.refund.entity);
        break;

      default:
        console.log('ℹ️ Unhandled webhook event:', event.event);
    }

    res.status(200).json({ status: 'ok' });
  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Webhook event handlers
async function handlePaymentAuthorized(payment: any) {
  console.log('💳 Payment authorized:', payment.id);

  try {
    // Only update payment status, no RSVP creation for authorized (not captured)
    await db.transaction(async (tx) => {
      await tx
        .update(paymentTransactions)
        .set({
          status: 'authorized',
          razorpayPaymentId: payment.id,
          paymentMethod: payment.method,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(paymentTransactions.razorpayOrderId, payment.order_id));
      
      console.log('✅ Payment authorized (not captured yet, no RSVP created):', payment.id);
    });
  } catch (error) {
    console.error('❌ Error in handlePaymentAuthorized:', error);
    throw error;
  }
}

async function handlePaymentCaptured(payment: any) {
  console.log('✅ Payment captured:', payment.id);

  try {
    // Atomic transaction: Update payment status and create/update RSVP together
    await db.transaction(async (tx) => {
      // 1. Update payment status
      const [transaction] = await tx
        .update(paymentTransactions)
        .set({
          status: 'captured',
          razorpayPaymentId: payment.id,
          paymentMethod: payment.method,
          email: payment.email,
          contact: payment.contact,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(paymentTransactions.razorpayOrderId, payment.order_id))
        .returning();

      if (!transaction || !transaction.eventId || !transaction.userId) {
        throw new Error(`Transaction not found or missing data for order ${payment.order_id}`);
      }

      // 2. UPSERT RSVP (insert or update on conflict) - idempotent and atomic
      const now = new Date().toISOString();
      await tx
        .insert(eventRsvps)
        .values({
          eventId: transaction.eventId,
          userId: transaction.userId,
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

      console.log('✅ Payment captured and RSVP created/updated atomically for user:', transaction.userId, 'event:', transaction.eventId);
    });

    // TODO: Send confirmation email
  } catch (error) {
    console.error('❌ Error in handlePaymentCaptured (transaction rolled back):', error);
    throw error; // Ensure webhook returns error status
  }
}

async function handlePaymentFailed(payment: any) {
  console.log('❌ Payment failed:', payment.id);

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(paymentTransactions)
        .set({
          status: 'failed',
          razorpayPaymentId: payment.id,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(paymentTransactions.razorpayOrderId, payment.order_id));
      
      console.log('✅ Payment marked as failed:', payment.id);
    });
  } catch (error) {
    console.error('❌ Error in handlePaymentFailed:', error);
    throw error;
  }
}

async function handleOrderPaid(order: any) {
  console.log('💰 Order paid:', order.id);

  try {
    // Atomic transaction: Update payment status and create/update RSVP together
    await db.transaction(async (tx) => {
      // 1. Update payment status
      const [transaction] = await tx
        .update(paymentTransactions)
        .set({
          status: 'captured',
          updatedAt: new Date().toISOString(),
        })
        .where(eq(paymentTransactions.razorpayOrderId, order.id))
        .returning();

      if (!transaction || !transaction.eventId || !transaction.userId) {
        throw new Error(`Transaction not found or missing data for order ${order.id}`);
      }

      // 2. UPSERT RSVP (insert or update on conflict) - idempotent and atomic
      const now = new Date().toISOString();
      await tx
        .insert(eventRsvps)
        .values({
          eventId: transaction.eventId,
          userId: transaction.userId,
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

      console.log('✅ Order paid and RSVP created/updated atomically for user:', transaction.userId, 'event:', transaction.eventId);
    });
  } catch (error) {
    console.error('❌ Error in handleOrderPaid (transaction rolled back):', error);
    throw error; // Ensure webhook returns error status
  }
}

async function handleRefundProcessed(refund: any) {
  console.log('💸 Refund processed:', refund.id);

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(paymentTransactions)
        .set({
          status: 'refunded',
          refundId: refund.id,
          refundAmount: refund.amount,
          refundedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(paymentTransactions.razorpayPaymentId, refund.payment_id));
      
      console.log('✅ Refund processed and payment updated:', refund.id);
    });

    // TODO: Send refund confirmation email
  } catch (error) {
    console.error('❌ Error in handleRefundProcessed:', error);
    throw error;
  }
}

async function handleRefundFailed(refund: any) {
  console.log('❌ Refund failed:', refund.id);

  try {
    // Log refund failure but don't change payment status
    console.error('Refund failed for payment:', refund.payment_id);
  } catch (error) {
    console.error('Error handling refund failed:', error);
  }
}

async function handleRefundCreated(refund: any) {
  console.log('🔄 Refund created:', refund.id);

  try {
    const now = new Date().toISOString();
    await db
      .update(paymentTransactions)
      .set({
        updatedAt: now,
      })
      .where(eq(paymentTransactions.razorpayPaymentId, refund.payment_id));
  } catch (error) {
    console.error('Error updating refund created:', error);
  }
}
