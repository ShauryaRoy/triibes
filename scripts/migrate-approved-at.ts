import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  try {
    await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS approved_at timestamp`;
    console.log('✅ approved_at column added to applications table successfully');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
