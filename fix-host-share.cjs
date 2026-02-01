const { neon } = require('@neondatabase/serverless');

async function fixHostShare() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  
  console.log('🔄 Fixing host share values to remove platform fee...\n');

  try {
    // Update all payment transactions to have hostShare = amount (0% platform fee)
    const result = await sql`
      UPDATE payment_transactions
      SET 
        platform_fee = 0,
        host_share = amount
      WHERE platform_fee > 0 OR host_share != amount
      RETURNING id, amount, platform_fee, host_share
    `;

    console.log(`✅ Updated ${result.length} payment records\n`);
    
    if (result.length > 0) {
      console.log('Sample updated records:');
      result.slice(0, 5).forEach(record => {
        console.log(`  ID ${record.id}: Amount=${record.amount}, PlatformFee=${record.platform_fee}, HostShare=${record.host_share}`);
      });
    }

    console.log('\n✨ All payment records now have 0% platform fee');
    console.log('💰 Host earnings will now equal total revenue');
    
  } catch (error) {
    console.error('❌ Error updating payment records:', error);
    process.exit(1);
  }
}

fixHostShare();
