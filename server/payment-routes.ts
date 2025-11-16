import { Router, Request, Response } from 'express';
import { PaymentService } from './payments';
import express from 'express';
import { db } from './db';
import { paymentTransactions } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

export const paymentRoutes = Router();

// Create payment order
paymentRoutes.post('/create-order', async (req: any, res: Response) => {
  if (!req.isAuthenticated?.() || !req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { eventId, amount } = req.body;

    if (!eventId || !amount) {
      return res.status(400).json({ error: 'Event ID and amount are required' });
    }

    const order = await PaymentService.createOrder({
      eventId: parseInt(eventId),
      userId: req.user.id,
      amount: parseFloat(amount),
    });

    res.json(order);
  } catch (error: any) {
    console.error('Create order error:', error);
    res.status(500).json({ error: error.message || 'Failed to create order' });
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
  console.log('🔑 Razorpay key requested, sending:', key ? 'SUCCESS' : 'MISSING');
  res.json({ key });
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
    await db
      .update(paymentTransactions)
      .set({
        status: 'authorized',
        razorpayPaymentId: payment.id,
        paymentMethod: payment.method,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(paymentTransactions.razorpayOrderId, payment.order_id));
  } catch (error) {
    console.error('Error updating payment authorized:', error);
  }
}

async function handlePaymentCaptured(payment: any) {
  console.log('✅ Payment captured:', payment.id);

  try {
    await db
      .update(paymentTransactions)
      .set({
        status: 'captured',
        razorpayPaymentId: payment.id,
        paymentMethod: payment.method,
        email: payment.email,
        contact: payment.contact,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(paymentTransactions.razorpayOrderId, payment.order_id));

    // TODO: Send confirmation email
    // TODO: Create RSVP automatically if needed
  } catch (error) {
    console.error('Error updating payment captured:', error);
  }
}

async function handlePaymentFailed(payment: any) {
  console.log('❌ Payment failed:', payment.id);

  try {
    await db
      .update(paymentTransactions)
      .set({
        status: 'failed',
        razorpayPaymentId: payment.id,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(paymentTransactions.razorpayOrderId, payment.order_id));
  } catch (error) {
    console.error('Error updating payment failed:', error);
  }
}

async function handleOrderPaid(order: any) {
  console.log('💰 Order paid:', order.id);

  try {
    await db
      .update(paymentTransactions)
      .set({
        status: 'captured',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(paymentTransactions.razorpayOrderId, order.id));
  } catch (error) {
    console.error('Error updating order paid:', error);
  }
}

async function handleRefundProcessed(refund: any) {
  console.log('💸 Refund processed:', refund.id);

  try {
    await db
      .update(paymentTransactions)
      .set({
        status: 'refunded',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(paymentTransactions.razorpayPaymentId, refund.payment_id));

    // TODO: Send refund confirmation email
  } catch (error) {
    console.error('Error updating refund processed:', error);
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
