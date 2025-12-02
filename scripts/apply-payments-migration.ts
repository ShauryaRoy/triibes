import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function applyPaymentsMigration() {
  console.log('🚀 Applying payments migration...');
  
  try {
    // Create payment_transactions table
    await sql`
      CREATE TABLE IF NOT EXISTS "payment_transactions" (
        "id" SERIAL PRIMARY KEY,
        "razorpay_order_id" VARCHAR(255) NOT NULL UNIQUE,
        "razorpay_payment_id" VARCHAR(255),
        "razorpay_signature" TEXT,
        "event_id" INTEGER NOT NULL,
        "user_id" VARCHAR NOT NULL,
        "amount" INTEGER NOT NULL,
        "currency" VARCHAR(10) DEFAULT 'INR',
        "status" VARCHAR(50) DEFAULT 'created',
        "payment_method" VARCHAR(50),
        "email" VARCHAR(255),
        "contact" VARCHAR(20),
        "notes" JSONB,
        "created_at" TIMESTAMP DEFAULT NOW(),
        "updated_at" TIMESTAMP DEFAULT NOW(),
        CONSTRAINT "payment_transactions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE,
        CONSTRAINT "payment_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `;
    console.log('✅ Created payment_transactions table');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS "payment_transactions_event_id_idx" ON "payment_transactions" ("event_id")`;
    await sql`CREATE INDEX IF NOT EXISTS "payment_transactions_user_id_idx" ON "payment_transactions" ("user_id")`;
    await sql`CREATE INDEX IF NOT EXISTS "payment_transactions_status_idx" ON "payment_transactions" ("status")`;
    console.log('✅ Created indexes');

    // Add columns to events table if not exists
    await sql`ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "ticket_price" INTEGER DEFAULT 0`;
    await sql`ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "ticketing_enabled" BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "currency" VARCHAR(10) DEFAULT 'INR'`;
    console.log('✅ Added payment columns to events table');

    console.log('🎉 Payments migration applied successfully!');
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }
}

applyPaymentsMigration();
