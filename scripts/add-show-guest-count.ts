import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import ws from 'ws';

config();

neonConfig.fetchConnectionCache = true;
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({ connectionString });
const db = drizzle(pool);

async function addShowGuestCount() {
  console.log('🔄 Adding show_guest_count column to events table...');
  
  try {
    await db.execute(sql.raw(`
      ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "show_guest_count" boolean DEFAULT true;
    `));
    console.log('✅ Successfully added show_guest_count column!');
  } catch (error: any) {
    console.error('❌ Error:', error);
    throw error;
  }
  
  process.exit(0);
}

addShowGuestCount().catch((error) => {
  console.error('Operation failed:', error);
  process.exit(1);
});
