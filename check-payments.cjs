require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkPayments() {
  try {
    // Get all payment transactions with event and user info
    const result = await pool.query(`
      SELECT 
        pt.id,
        pt.order_id,
        pt.amount,
        pt.status,
        pt.platform_fee,
        pt.host_share,
        pt.created_at,
        pt.user_id,
        pt.event_id,
        u.first_name || ' ' || u.last_name as buyer_name,
        u.email as buyer_email,
        e.title as event_title,
        e.host_id
      FROM payment_transactions pt
      LEFT JOIN users u ON pt.user_id = u.id
      LEFT JOIN events e ON pt.event_id = e.id
      ORDER BY pt.created_at DESC
      LIMIT 5
    `);
    
    console.log('📊 Recent payments:');
    result.rows.forEach(row => {
      console.log(`\n  ID: ${row.id}`);
      console.log(`  Buyer: ${row.buyer_name} (${row.buyer_email})`);
      console.log(`  Event: ${row.event_title}`);
      console.log(`  Amount: ₹${row.amount}`);
      console.log(`  Platform Fee: ${row.platform_fee || 0}`);
      console.log(`  Host Share: ${row.host_share || 0}`);
      console.log(`  Status: ${row.status}`);
      console.log(`  Date: ${row.created_at}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkPayments();
