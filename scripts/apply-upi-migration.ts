import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

config();

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function applyMigration() {
  try {
    console.log('📝 Applying host UPI ID migration...');
    
    const migrationSQL = readFileSync(
      join(process.cwd(), 'drizzle', '0015_add_host_upi_id.sql'),
      'utf-8'
    );
    
    await db.execute(migrationSQL as any);
    
    console.log('✅ Host UPI ID migration applied successfully!');
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration();
