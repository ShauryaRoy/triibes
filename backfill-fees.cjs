require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const PLATFORM_FEE_PERCENT = 5; // 5% platform fee

async function backfillFees() {
  try {
    // Get all payments where fees haven't been calculated
    const payments = await pool.query(`
      SELECT id, amount 
      FROM payment_transactions 
      WHERE status = 'captured' 
      AND (platform_fee = 0 OR platform_fee IS NULL)
    `);
    
    console.log(`Found ${payments.rows.length} payments to update`);
    
    for (const payment of payments.rows) {
      const platformFee = Math.round((payment.amount * PLATFORM_FEE_PERCENT) / 100);
      const hostShare = payment.amount - platformFee;
      
      await pool.query(`
        UPDATE payment_transactions 
        SET platform_fee = $1, host_share = $2
        WHERE id = $3
      `, [platformFee, hostShare, payment.id]);
      
      console.log(`✅ Payment ${payment.id}: Amount=${payment.amount}, PlatformFee=${platformFee}, HostShare=${hostShare}`);
    }
    
    console.log(`\n🎉 Updated ${payments.rows.length} payments!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

backfillFees();
