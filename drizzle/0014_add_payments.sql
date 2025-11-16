-- Add payment transactions table
CREATE TABLE IF NOT EXISTS "payment_transactions" (
  "id" SERIAL PRIMARY KEY,
  "razorpay_order_id" VARCHAR(255) NOT NULL UNIQUE,
  "razorpay_payment_id" VARCHAR(255),
  "razorpay_signature" TEXT,
  "event_id" INTEGER NOT NULL,
  "user_id" VARCHAR NOT NULL,
  "amount" INTEGER NOT NULL, -- amount in smallest currency unit (paise for INR)
  "currency" VARCHAR(10) DEFAULT 'INR',
  "status" VARCHAR(50) DEFAULT 'created', -- created, authorized, captured, failed, refunded
  "payment_method" VARCHAR(50),
  "email" VARCHAR(255),
  "contact" VARCHAR(20),
  "notes" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT "payment_transactions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE,
  CONSTRAINT "payment_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS "payment_transactions_event_id_idx" ON "payment_transactions" ("event_id");
CREATE INDEX IF NOT EXISTS "payment_transactions_user_id_idx" ON "payment_transactions" ("user_id");
CREATE INDEX IF NOT EXISTS "payment_transactions_status_idx" ON "payment_transactions" ("status");

-- Add payment columns to events table if not exists
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "ticket_price" INTEGER DEFAULT 0;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "ticketing_enabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "currency" VARCHAR(10) DEFAULT 'INR';
