import cron from 'node-cron';
import { PaymentReconciliationService } from './payment-reconciliation';
import { resetStuckRows, processNotificationOutbox } from './notification-outbox';
import { db } from './db';
import { paymentTransactions } from '../drizzle/schema';
import { eq, and, or, gt, lt, sql } from 'drizzle-orm';

/**
 * Payment Reconciliation Jobs
 *
 * 1. FAST LOOP (every 5 min, ENABLE_FAST_LOOP=true): Picks up 'created'/'authorized'/'failed'
 *    payments between 30 s and 10 min old. Reload / webhook-miss edge cases.
 *
 * 2. DAILY CRON (2 AM): Full recovery sweep —
 *    a. reconcilePayments: fix stuck payments > 10 min old, create RSVPs
 *    b. resetStuckRows:    recover outbox rows stuck in 'processing' (crash recovery)
 *    c. processNotificationOutbox: drain ALL pending outbox rows → send unsent emails
 *
 * Normal email delivery is on-demand via emitRegistrationConfirmed → processNotificationOutbox.
 * The 2AM cron is the catch-all for Resend failures and missed emails from the day.
 */

const CRON_SCHEDULE = '0 2 * * *'; // Every day at 2:00 AM
const DAILY_PAYMENT_AGE_MINUTES = 10;
const FAST_LOOP_INTERVAL_MS = 5 * 60_000; // 5 minutes — allows Neon to auto-suspend between ticks
const FAST_LOOP_MIN_AGE_S = 30;           // Don't touch payments < 30 s (Razorpay still settling)
const FAST_LOOP_MAX_AGE_MIN = 10;         // Hand off to daily cron after 10 min

let isDailyRunning = false;
let isFastLoopRunning = false;
let fastLoopTimer: ReturnType<typeof setInterval> | null = null;

// ─── Public entry point (called from index.ts) ──────────────────────────────

export function startPaymentReconciliationCron() {
  const fastLoopEnabled = process.env.ENABLE_FAST_LOOP === 'true';

  console.log('🔄 Starting payment reconciliation service');
  console.log(`  ├─ Fast loop : ${fastLoopEnabled ? `every 5 min (payments 30 s – 10 min old)` : 'DISABLED (set ENABLE_FAST_LOOP=true to enable)'}`);
  console.log('  └─ Daily cron: 2:00 AM     (payments > 10 min old)');

  // Initial daily sweep on startup (after 10 s)
  setTimeout(async () => {
    console.log('🔍 Running initial daily reconciliation check...');
    await runDailyReconciliation();
  }, 10_000);

  // Schedule recurring daily job
  cron.schedule(CRON_SCHEDULE, async () => {
    await runDailyReconciliation();
  });

  // Fast loop — only when ENABLE_FAST_LOOP=true
  // Leave OFF to allow Neon DB to auto-suspend when there is no traffic.
  // Turn ON once you have real users who may reload during payment.
  if (fastLoopEnabled) {
    fastLoopTimer = setInterval(async () => {
      await runFastReconciliationLoop();
    }, FAST_LOOP_INTERVAL_MS);
    console.log('⚡ Fast reconciliation loop ENABLED');
  } else {
    console.log('💤 Fast reconciliation loop DISABLED — Neon will auto-suspend between cron ticks');
  }

  console.log('✅ Payment reconciliation service started');
}

// ─── Fast loop (every 5 min) ────────────────────────────────────────────────

async function runFastReconciliationLoop() {
  if (isFastLoopRunning) return; // skip overlap
  isFastLoopRunning = true;

  try {
    const minCreatedAt = new Date(Date.now() - FAST_LOOP_MAX_AGE_MIN * 60_000).toISOString();
    const maxCreatedAt = new Date(Date.now() - FAST_LOOP_MIN_AGE_S * 1000).toISOString();

    const windowCondition = and(
      or(
        eq(paymentTransactions.status, 'created'),
        eq(paymentTransactions.status, 'authorized'),
        // Also pick up fresh 'failed' that might have been prematurely marked
        eq(paymentTransactions.status, 'failed')
      ),
      gt(paymentTransactions.createdAt, minCreatedAt),
      lt(paymentTransactions.createdAt, maxCreatedAt)
    );

    // Cheap existence check first — keeps Neon connection time minimal when idle
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(paymentTransactions)
      .where(windowCondition);

    if (count === 0) return; // nothing to do — Neon can go back to sleep

    // Now fetch the full rows for reconciliation
    const freshPayments = await db
      .select()
      .from(paymentTransactions)
      .where(windowCondition);

    if (freshPayments.length === 0) return; // silent — don't spam logs when idle

    console.log(`⚡ [fast-loop] Found ${freshPayments.length} payment(s) to reconcile`);

    for (const payment of freshPayments) {
      try {
        await PaymentReconciliationService.reconcileSinglePayment(payment);
      } catch (err: any) {
        console.error(`⚡ [fast-loop] Error reconciling payment ${payment.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error('⚡ [fast-loop] Critical error:', err.message);
  } finally {
    isFastLoopRunning = false;
  }
}

// ─── Daily reconciliation ───────────────────────────────────────────────────

async function runDailyReconciliation() {
  if (isDailyRunning) {
    console.log('  Skipping daily reconciliation - previous run still in progress');
    return;
  }

  isDailyRunning = true;
  const startTime = new Date();

  try {
    console.log('\n' + '='.repeat(80));
    console.log(` Payment Reconciliation Started at ${startTime.toISOString()}`);
    console.log('='.repeat(80));

    const stuckCount = await PaymentReconciliationService.getStuckPaymentsCount(DAILY_PAYMENT_AGE_MINUTES);

    if (stuckCount === 0) {
      console.log(' No stuck payments found - all good!');
    } else {
      console.log(`  Found ${stuckCount} stuck payment(s) to reconcile`);

      const result = await PaymentReconciliationService.reconcilePayments(DAILY_PAYMENT_AGE_MINUTES);

      console.log('\n Reconciliation Results:');
      console.log(`   ✓ Checked: ${result.checked}`);
      console.log(`   ✓ Updated: ${result.updated}`);
      console.log(`   ✗ Failed: ${result.failed}`);

      if (result.errors.length > 0) {
        console.log('\n Errors encountered:');
        result.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }

      if (result.failed > 0 && result.failed / result.checked > 0.5) {
        console.error(' ALERT: More than 50% of reconciliation attempts failed!');
        console.error(' Please check Razorpay API connectivity and credentials');
      }
    }

    const endTime = new Date();
    const duration = ((endTime.getTime() - startTime.getTime()) / 1000).toFixed(2);
    console.log(`\n  Total duration: ${duration}s`);
    console.log('='.repeat(80) + '\n');

    // ── Outbox recovery sweep ──────────────────────────────────────────────────
    // After reconciling payments, drain any pending outbox rows so emails that
    // failed earlier in the day (Resend down, server crash) are retried here.
    // This runs even if stuckCount was 0 — covers Resend failures from normal
    // payments that were captured by webhook but whose email never delivered.
    console.log('📧 Running 2AM outbox email recovery...');
    try {
      await resetStuckRows();            // processing → pending (crash recovery)
      await processNotificationOutbox(); // drain all pending → send emails
      console.log('✅ Outbox recovery complete');
    } catch (outboxErr: any) {
      console.error('❌ Outbox recovery error:', outboxErr.message);
    }

  } catch (error: any) {
    console.error('\n Critical error in daily reconciliation:');
    console.error(error);
    console.error('Stack:', error.stack);
  } finally {
    isDailyRunning = false;
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  if (fastLoopTimer) clearInterval(fastLoopTimer);
  console.log('\n Shutting down payment reconciliation service...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (fastLoopTimer) clearInterval(fastLoopTimer);
  console.log('\n Shutting down payment reconciliation service...');
  process.exit(0);
});
