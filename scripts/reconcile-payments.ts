#!/usr/bin/env tsx
/**
 * Standalone Payment Reconciliation Script
 * 
 * Run this manually or via a separate cron job to reconcile stuck payments.
 * 
 * Usage:
 *   tsx scripts/reconcile-payments.ts [--minutes=10]
 *   npm run reconcile-payments
 * 
 * Environment Variables Required:
 *   - DATABASE_URL
 *   - RAZORPAY_KEY_ID
 *   - RAZORPAY_KEY_SECRET
 */

import { PaymentReconciliationService } from '../server/payment-reconciliation';

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const minutesArg = args.find(arg => arg.startsWith('--minutes='));
  const minutes = minutesArg ? parseInt(minutesArg.split('=')[1]) : 10;

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       Payment Reconciliation Script - Manual Run          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Validate environment variables
  const requiredEnvVars = ['DATABASE_URL', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error(' Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    process.exit(1);
  }

  try {
    // Check stuck payments count
    const stuckCount = await PaymentReconciliationService.getStuckPaymentsCount(minutes);
    console.log(` Checking payments older than ${minutes} minutes...`);
    console.log(` Found ${stuckCount} stuck payment(s)\n`);

    if (stuckCount === 0) {
      console.log(' No stuck payments found. Everything is up to date!\n');
      process.exit(0);
    }

    // Run reconciliation
    console.log('🔄 Starting reconciliation process...\n');
    const result = await PaymentReconciliationService.reconcilePayments(minutes);

    // Display results
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                   Reconciliation Summary                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(` Total Checked:  ${result.checked}`);
    console.log(` Updated:        ${result.updated}`);
    console.log(` Failed:         ${result.failed}`);

    if (result.errors.length > 0) {
      console.log('\n  Errors encountered:');
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    console.log('\n Reconciliation completed successfully!\n');

    // Exit with appropriate code
    process.exit(result.failed > 0 ? 1 : 0);

  } catch (error: any) {
    console.error('\n Fatal error during reconciliation:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the script
main();
