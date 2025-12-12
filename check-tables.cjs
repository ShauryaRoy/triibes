require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkTables() {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('payouts', 'payout_transactions', 'payment_transactions')
      ORDER BY table_name
    `);
    
    console.log('✅ Tables found:', result.rows.map(r => r.table_name).join(', '));
    
    // Check columns in payment_transactions
    const columns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'payment_transactions'
      AND column_name IN ('platform_fee', 'host_share', 'refunded_at')
      ORDER BY column_name
    `);
    
    console.log('✅ Payment columns:', columns.rows.map(r => r.column_name).join(', '));
    
    // Check if any payments exist
    const payments = await pool.query('SELECT COUNT(*) as count FROM payment_transactions');
    console.log('📊 Total payments:', payments.rows[0].count);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTables();
