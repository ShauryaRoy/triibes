import cron from 'node-cron';
import { PaymentReconciliationService } from './payment-reconciliation';

/**
 * Payment Reconciliation Cron Job
 * 
 * Runs every 6 hours to check for stuck payments and reconcile them with Razorpay
 */

const CRON_SCHEDULE = '0 */6 * * *'; // Every 6 hours
const PAYMENT_AGE_MINUTES = 10; // Check payments older than 10 minutes

let isRunning = false; // Prevent concurrent runs

export function startPaymentReconciliationCron() {
  console.log('🔄 Starting payment reconciliation cron job');
  console.log(`📅 Schedule: Every 6 hours`);
  console.log(`⏱️  Checking payments older than ${PAYMENT_AGE_MINUTES} minutes`);

  // Initial run on startup (after a short delay)
  setTimeout(async () => {
    console.log('🔍 Running initial reconciliation check...');
    await runReconciliation();
  }, 10000); // Wait 10 seconds after startup

  // Schedule recurring job
  cron.schedule(CRON_SCHEDULE, async () => {
    await runReconciliation();
  });

  console.log('✅ Payment reconciliation cron job started successfully');
}

async function runReconciliation() {
  if (isRunning) {
    console.log('  Skipping reconciliation - previous run still in progress');
    return;
  }

  isRunning = true;
  const startTime = new Date();

  try {
    console.log('\n' + '='.repeat(80));
    console.log(` Payment Reconciliation Started at ${startTime.toISOString()}`);
    console.log('='.repeat(80));

    // Check how many stuck payments exist before reconciliation
    const stuckCount = await PaymentReconciliationService.getStuckPaymentsCount(PAYMENT_AGE_MINUTES);
    
    if (stuckCount === 0) {
      console.log(' No stuck payments found - all good!');
    } else {
      console.log(`  Found ${stuckCount} stuck payment(s) to reconcile`);
      
      // Run reconciliation
      const result = await PaymentReconciliationService.reconcilePayments(PAYMENT_AGE_MINUTES);

      // Log results
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

      // Alert if too many failures
      if (result.failed > 0 && result.failed / result.checked > 0.5) {
        console.error(' ALERT: More than 50% of reconciliation attempts failed!');
        console.error(' Please check Razorpay API connectivity and credentials');
      }
    }

    const endTime = new Date();
    const duration = ((endTime.getTime() - startTime.getTime()) / 1000).toFixed(2);
    console.log(`\n  Total duration: ${duration}s`);
    console.log('='.repeat(80) + '\n');

  } catch (error: any) {
    console.error('\n Critical error in reconciliation cron job:');
    console.error(error);
    console.error('Stack:', error.stack);
  } finally {
    isRunning = false;
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n Shutting down payment reconciliation cron job...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n Shutting down payment reconciliation cron job...');
  process.exit(0);
});
