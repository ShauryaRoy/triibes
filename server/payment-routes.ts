import { Router, Request, Response } from 'express';
import { PaymentService } from './payments';
import express from 'express';
import { db } from './db';
import { paymentTransactions, eventRsvps, users, events } from '../drizzle/schema';
import { eq, and, sql, desc, gt } from 'drizzle-orm';
import { emitRegistrationConfirmed } from './notification-outbox';

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
    let payment = await PaymentService.getUserPaymentStatus(eventId, req.user.id);

    // ── Fix #4: Don't treat "failed" as permanently terminal for fresh payments ──
    // If the most recent row is "failed" but less than 10 min old, allow reconciliation.
    const shouldReconcile = payment && (
      // Normal case: still 'created' or 'authorized'
      (payment.status !== 'captured' && payment.status !== 'failed') ||
      // Fix #4: fresh 'failed' — may have been prematurely marked
      (payment.status === 'failed' && payment.createdAt &&
        (Date.now() - new Date(payment.createdAt).getTime()) / 60_000 < 10)
    );

    // ── Fix #5: Retry up to 8 times × 3 s = ~24 s window ──
    if (shouldReconcile) {
      console.log(`🔄 Payment ${payment!.id} status is '${payment!.status}', triggering reconciliation with retry...`);

      const maxAttempts = 8;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const { PaymentReconciliationService } = await import('./payment-reconciliation');
          await PaymentReconciliationService.reconcileSinglePayment(payment!);

          // Refetch payment status after reconciliation
          payment = await PaymentService.getUserPaymentStatus(eventId, req.user.id);
          console.log(`✅ Payment ${payment?.id} reconciled (attempt ${attempt}/${maxAttempts}), new status: ${payment?.status}`);

          if (payment?.status === 'captured') break; // success
        } catch (reconcileError) {
          console.error(`Reconciliation attempt ${attempt} failed:`, reconcileError);
        }

        // If not captured yet and more attempts remain, wait before retrying
        if (attempt < maxAttempts && payment?.status !== 'captured') {
          console.log(`⏳ Payment not yet captured, waiting 3 s before retry ${attempt + 1}/${maxAttempts}...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          // Refetch in case webhook/another process captured it in the meantime
          payment = await PaymentService.getUserPaymentStatus(eventId, req.user.id);
          if (payment?.status === 'captured') break;
        }
      }
    }

    // ── Safety net: if payment is captured, ensure RSVP + outbox are correct ──
    if (payment?.status === 'captured') {
      try {
        const [rsvp] = await db
          .select()
          .from(eventRsvps)
          .where(
            and(
              eq(eventRsvps.eventId, eventId),
              eq(eventRsvps.userId, req.user.id),
            )
          )
          .limit(1);

        if (rsvp && rsvp.status === 'going' && rsvp.paymentStatus !== 'captured') {
          // RSVP is going but paymentStatus wasn't updated — patch it
          const now = new Date().toISOString();
          await db
            .update(eventRsvps)
            .set({
              paymentStatus: 'captured',
              confirmedAt: sql`COALESCE(${eventRsvps.confirmedAt}, ${now}::timestamptz)`,
              price: payment.amount ?? rsvp.price ?? 0,
              updatedAt: now,
            })
            .where(eq(eventRsvps.id, rsvp.id));
          console.log(`[status] Patched RSVP#${rsvp.id} paymentStatus → captured`);
        }

        if (rsvp && rsvp.status === 'going') {
          // Ensure outbox event exists (idempotent)
          emitRegistrationConfirmed(rsvp.id).catch(err =>
            console.error('[status] outbox emit failed for RSVP', rsvp.id, err)
          );
        }
      } catch (safetyErr) {
        console.error('[status] Safety-net RSVP/outbox check failed:', safetyErr);
      }
    }

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
// Use express.raw() to capture the raw body before JSON parsing
paymentRoutes.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'] as string;
    const webhookBody = (req as any).body;

    if (!webhookSignature || !webhookBody) {
      console.error('Webhook signature or body missing');
      return res.status(400).json({ error: 'Invalid request' });
    }

    // Convert buffer to string if needed
    const webhookBodyString = typeof webhookBody === 'string' ? webhookBody : webhookBody.toString();

    // Verify webhook signature
    const isValid = PaymentService.verifyWebhookSignature(webhookBodyString, webhookSignature);

    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(webhookBodyString);
    console.log('✅ Webhook event processed:', event.event);

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
        break;
    }
    
    res.status(200).json({ status: 'ok' });
  } catch (error: any) {
    console.error('Webhook processing error:', error.message);
    // Return 200 even on error to prevent Razorpay retry loops
    // Errors are logged and can be monitored
    res.status(200).json({ status: 'error', error: error.message });
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

  let rsvpId: number | null = null;
  try {
    // Payment-id idempotency guard: duplicate webhooks should be no-op success.
    if (payment?.id) {
      const [alreadyProcessed] = await db
        .select()
        .from(paymentTransactions)
        .where(
          and(
            eq(paymentTransactions.razorpayPaymentId, payment.id),
            sql`${paymentTransactions.status} IN ('captured', 'paid_no_seat')`
          )
        )
        .limit(1);
      if (alreadyProcessed) {
        console.log(`🔄 Idempotent webhook by payment_id: ${payment.id} already processed.`);
        return;
      }
    }

    await db.transaction(async (tx) => {
      const nowIso = new Date().toISOString();

      // Claim the transaction row for this order while moving it into captured state.
      const [transaction] = await tx
        .update(paymentTransactions)
        .set({
          status: 'captured',
          razorpayPaymentId: payment.id,
          paymentMethod: payment.method,
          email: payment.email,
          contact: payment.contact,
          updatedAt: nowIso,
        })
        .where(
          and(
            eq(paymentTransactions.razorpayOrderId, payment.order_id),
            sql`${paymentTransactions.status} IN ('created', 'authorized')`
          )
        )
        .returning();

      if (!transaction) {
        // Another process already handled this order.
        console.log(`🔄 Idempotent webhook: order ${payment.order_id} already captured. Skipping.`);
        return;
      }

      if (!transaction.eventId || !transaction.userId) {
        throw new Error(`Transaction missing data for order ${payment.order_id}`);
      }

      // Validate event exists and fetch entry/capacity mode directly from DB.
      const eventResult = await tx.execute(sql`
        SELECT id, entry_mode, COALESCE(max_capacity, max_guests) AS capacity_limit
        FROM events
        WHERE id = ${transaction.eventId}
        LIMIT 1
      `);
      const eventRow: any = eventResult.rows?.[0];
      if (!eventRow) {
        throw new Error(`Event not found for transaction ${transaction.id}`);
      }

      // Approval-mode paid registrations require approved application.
      if (eventRow.entry_mode === 'approval') {
        const appResult = await tx.execute(sql`
          SELECT status
          FROM applications
          WHERE event_id = ${transaction.eventId}
            AND user_id = ${transaction.userId}
          LIMIT 1
        `);
        const appRow: any = appResult.rows?.[0];
        if (!appRow || appRow.status !== 'approved') {
          await tx
            .update(paymentTransactions)
            .set({
              notes: sql`COALESCE(${paymentTransactions.notes}, '{}'::jsonb) || ${JSON.stringify({ approval_required_not_met: true, checked_at: nowIso })}::jsonb`,
              updatedAt: nowIso,
            })
            .where(eq(paymentTransactions.id, transaction.id));
          console.warn(`⚠️ Payment captured but application not approved for user ${transaction.userId}, event ${transaction.eventId}. RSVP not created.`);
          return;
        }
      }

      // If attendee already exists, only patch payment fields (idempotent).
      const existingRsvpResult = await tx.execute(sql`
        SELECT 1 FROM event_rsvps
        WHERE event_id = ${transaction.eventId}
          AND user_id = ${transaction.userId}
          AND status = 'going'
        LIMIT 1
        FOR UPDATE
      `);

      if (existingRsvpResult.rows.length > 0) {
        console.log(`🔄 Idempotent retry: User ${transaction.userId} already has 'going' RSVP for event ${transaction.eventId}. Skipping capacity increment.`);
        const [patched] = await tx
          .update(eventRsvps)
          .set({
            paymentStatus: 'captured',
            confirmedAt: sql`COALESCE(${eventRsvps.confirmedAt}, ${nowIso}::timestamptz)`,
            price: transaction.amount ?? 0,
            updatedAt: nowIso,
          })
          .where(
            and(
              eq(eventRsvps.eventId, transaction.eventId!),
              eq(eventRsvps.userId, transaction.userId!),
            )
          )
          .returning();
        rsvpId = patched?.id ?? null;
        console.log('✅ Patched existing RSVP payment columns for user:', transaction.userId, 'event:', transaction.eventId);
        return;
      }

      // Atomic seat allocation on payment capture.
      const capacityUpdate = await tx.execute(sql`
        UPDATE events 
        SET current_capacity = current_capacity + 1 
        WHERE id = ${transaction.eventId} 
          AND (COALESCE(max_capacity, max_guests) IS NULL OR current_capacity < COALESCE(max_capacity, max_guests))
        RETURNING id, current_capacity, COALESCE(max_capacity, max_guests) AS capacity_limit
      `);

      if (!capacityUpdate.rows || capacityUpdate.rows.length === 0) {
        console.error(`❌ Event ${transaction.eventId} is at full capacity. Cannot create RSVP.`);

        // Payment is captured but no seat could be allocated.
        await tx
          .update(paymentTransactions)
          .set({
            status: 'paid_no_seat',
            notes: sql`COALESCE(${paymentTransactions.notes}, '{}'::jsonb) || ${JSON.stringify({ paid_no_seat: true, rejected_at: nowIso })}::jsonb`,
            updatedAt: nowIso,
          })
          .where(eq(paymentTransactions.id, transaction.id));
        console.warn(`⚠️ Payment ${payment.id} captured but no seat available for event ${transaction.eventId}. Marked paid_no_seat.`);
        return;
      }

      const updatedEvent = capacityUpdate.rows[0];
      console.log(`✅ Capacity claimed: ${updatedEvent.current_capacity}/${updatedEvent.capacity_limit || 'unlimited'} for event ${transaction.eventId}`);

      // Create attendee row.
      const [newRsvp] = await tx
        .insert(eventRsvps)
        .values({
          eventId: transaction.eventId,
          userId: transaction.userId,
          status: 'going',
          price: transaction.amount ?? 0,
          paymentStatus: 'captured',
          confirmedAt: nowIso,
          plusOneCount: 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        })
        .onConflictDoUpdate({
          target: [eventRsvps.eventId, eventRsvps.userId],
          set: {
            status: 'going',
            price: transaction.amount ?? 0,
            paymentStatus: 'captured',
            confirmedAt: nowIso,
            updatedAt: nowIso,
          },
        })
        .returning();

      rsvpId = newRsvp?.id ?? null;

      console.log('✅ Payment captured and attendee created/updated atomically for user:', transaction.userId, 'event:', transaction.eventId);
    });

    // Emit outbox event for registration confirmation email (outside transaction)
    if (rsvpId) {
      emitRegistrationConfirmed(rsvpId).catch(err =>
        console.error('[outbox] handlePaymentCaptured: failed to emit for RSVP', rsvpId, err)
      );
    }
  } catch (error) {
    if ((error as any)?.code === '23505') {
      console.log(`🔄 Idempotent webhook unique violation for payment_id=${payment?.id}; already processed.`);
      return;
    }
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

  let rsvpId: number | null = null;
  try {
    const paymentIdFromOrder = order?.payment_id || null;

    // Payment-id idempotency guard when order payload includes payment_id.
    if (paymentIdFromOrder) {
      const [alreadyProcessed] = await db
        .select()
        .from(paymentTransactions)
        .where(
          and(
            eq(paymentTransactions.razorpayPaymentId, paymentIdFromOrder),
            sql`${paymentTransactions.status} IN ('captured', 'paid_no_seat')`
          )
        )
        .limit(1);
      if (alreadyProcessed) {
        console.log(`🔄 Idempotent webhook by payment_id: ${paymentIdFromOrder} already processed.`);
        return;
      }
    }

    await db.transaction(async (tx) => {
      const nowIso = new Date().toISOString();

      const [transaction] = await tx
        .update(paymentTransactions)
        .set({
          status: 'captured',
          razorpayPaymentId: paymentIdFromOrder,
          updatedAt: nowIso,
        })
        .where(
          and(
            eq(paymentTransactions.razorpayOrderId, order.id),
            sql`${paymentTransactions.status} IN ('created', 'authorized')`
          )
        )
        .returning();

      if (!transaction) {
        console.log(`🔄 Idempotent webhook: order ${order.id} already captured. Skipping.`);
        return;
      }

      if (!transaction.eventId || !transaction.userId) {
        throw new Error(`Transaction missing data for order ${order.id}`);
      }

      const eventResult = await tx.execute(sql`
        SELECT id, entry_mode, COALESCE(max_capacity, max_guests) AS capacity_limit
        FROM events
        WHERE id = ${transaction.eventId}
        LIMIT 1
      `);
      const eventRow: any = eventResult.rows?.[0];
      if (!eventRow) {
        throw new Error(`Event not found for transaction ${transaction.id}`);
      }

      if (eventRow.entry_mode === 'approval') {
        const appResult = await tx.execute(sql`
          SELECT status
          FROM applications
          WHERE event_id = ${transaction.eventId}
            AND user_id = ${transaction.userId}
          LIMIT 1
        `);
        const appRow: any = appResult.rows?.[0];
        if (!appRow || appRow.status !== 'approved') {
          await tx
            .update(paymentTransactions)
            .set({
              notes: sql`COALESCE(${paymentTransactions.notes}, '{}'::jsonb) || ${JSON.stringify({ approval_required_not_met: true, checked_at: nowIso })}::jsonb`,
              updatedAt: nowIso,
            })
            .where(eq(paymentTransactions.id, transaction.id));
          console.warn(`⚠️ Order paid but application not approved for user ${transaction.userId}, event ${transaction.eventId}. RSVP not created.`);
          return;
        }
      }

      const existingRsvpResult = await tx.execute(sql`
        SELECT 1 FROM event_rsvps
        WHERE event_id = ${transaction.eventId}
          AND user_id = ${transaction.userId}
          AND status = 'going'
        LIMIT 1
        FOR UPDATE
      `);

      if (existingRsvpResult.rows.length > 0) {
        console.log(`🔄 Idempotent retry: User ${transaction.userId} already has 'going' RSVP for event ${transaction.eventId}. Skipping capacity increment.`);
        const [patched] = await tx
          .update(eventRsvps)
          .set({
            paymentStatus: 'captured',
            confirmedAt: sql`COALESCE(${eventRsvps.confirmedAt}, ${nowIso}::timestamptz)`,
            price: transaction.amount ?? 0,
            updatedAt: nowIso,
          })
          .where(
            and(
              eq(eventRsvps.eventId, transaction.eventId!),
              eq(eventRsvps.userId, transaction.userId!),
            )
          )
          .returning();
        rsvpId = patched?.id ?? null;
        console.log('✅ Patched existing RSVP payment columns for user:', transaction.userId, 'event:', transaction.eventId);
        return;
      }

      const capacityUpdate = await tx.execute(sql`
        UPDATE events 
        SET current_capacity = current_capacity + 1 
        WHERE id = ${transaction.eventId} 
          AND (COALESCE(max_capacity, max_guests) IS NULL OR current_capacity < COALESCE(max_capacity, max_guests))
        RETURNING id, current_capacity, COALESCE(max_capacity, max_guests) AS capacity_limit
      `);

      if (!capacityUpdate.rows || capacityUpdate.rows.length === 0) {
        console.error(`❌ Event ${transaction.eventId} is at full capacity. Cannot create RSVP.`);

        await tx
          .update(paymentTransactions)
          .set({
            status: 'paid_no_seat',
            notes: sql`COALESCE(${paymentTransactions.notes}, '{}'::jsonb) || ${JSON.stringify({ paid_no_seat: true, rejected_at: nowIso })}::jsonb`,
            updatedAt: nowIso,
          })
          .where(eq(paymentTransactions.id, transaction.id));
        console.warn(`⚠️ Order ${order.id} paid but no seat available for event ${transaction.eventId}. Marked paid_no_seat.`);
        return;
      }

      const updatedEvent = capacityUpdate.rows[0];
      console.log(`✅ Capacity claimed: ${updatedEvent.current_capacity}/${updatedEvent.capacity_limit || 'unlimited'} for event ${transaction.eventId}`);

      const [newRsvp] = await tx
        .insert(eventRsvps)
        .values({
          eventId: transaction.eventId,
          userId: transaction.userId,
          status: 'going',
          price: transaction.amount ?? 0,
          paymentStatus: 'captured',
          confirmedAt: nowIso,
          plusOneCount: 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        })
        .onConflictDoUpdate({
          target: [eventRsvps.eventId, eventRsvps.userId],
          set: {
            status: 'going',
            price: transaction.amount ?? 0,
            paymentStatus: 'captured',
            confirmedAt: nowIso,
            updatedAt: nowIso,
          },
        })
        .returning();

      rsvpId = newRsvp?.id ?? null;

      console.log('✅ Order paid and attendee created/updated atomically for user:', transaction.userId, 'event:', transaction.eventId);
    });

    // Emit outbox event for registration confirmation email (outside transaction)
    if (rsvpId) {
      emitRegistrationConfirmed(rsvpId).catch(err =>
        console.error('[outbox] handleOrderPaid: failed to emit for RSVP', rsvpId, err)
      );
    }
  } catch (error) {
    if ((error as any)?.code === '23505') {
      console.log(`🔄 Idempotent webhook unique violation for payment_id=${order?.payment_id || 'n/a'}; already processed.`);
      return;
    }
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
