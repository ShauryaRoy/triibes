require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'payment_transactions'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Columns in payment_transactions:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name} (${row.data_type})`);
    });
    
    // Check a sample payment
    const payment = await pool.query(`
      SELECT * FROM payment_transactions LIMIT 1
    `);
    
    if (payment.rows.length > 0) {
      console.log('\n📊 Sample payment:');
      console.log(JSON.stringify(payment.rows[0], null, 2));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkColumns();
