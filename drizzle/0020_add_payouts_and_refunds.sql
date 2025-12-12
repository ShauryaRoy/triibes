-- Add platform_fee and host_share columns to payment_transactions
ALTER TABLE "payment_transactions" ADD COLUMN "platform_fee" INTEGER DEFAULT 0;
ALTER TABLE "payment_transactions" ADD COLUMN "host_share" INTEGER DEFAULT 0;
ALTER TABLE "payment_transactions" ADD COLUMN "refunded_at" TIMESTAMP;
ALTER TABLE "payment_transactions" ADD COLUMN "refund_id" VARCHAR(255);
ALTER TABLE "payment_transactions" ADD COLUMN "refund_amount" INTEGER;

-- Create payouts table
CREATE TABLE IF NOT EXISTS "payouts" (
  "id" SERIAL PRIMARY KEY,
  "host_id" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "amount" INTEGER NOT NULL,
  "status" VARCHAR(50) DEFAULT 'pending',
  "payment_reference" TEXT,
  "upi_id" TEXT,
  "bank_details" JSONB,
  "notes" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "paid_at" TIMESTAMP,
  "created_by" VARCHAR REFERENCES "users"("id")
);

-- Create payout_transactions junction table (which payments are included in which payout)
CREATE TABLE IF NOT EXISTS "payout_transactions" (
  "id" SERIAL PRIMARY KEY,
  "payout_id" INTEGER NOT NULL REFERENCES "payouts"("id") ON DELETE CASCADE,
  "transaction_id" INTEGER NOT NULL REFERENCES "payment_transactions"("id") ON DELETE CASCADE,
  "host_share_amount" INTEGER NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "payouts_host_id_idx" ON "payouts"("host_id");
CREATE INDEX IF NOT EXISTS "payouts_status_idx" ON "payouts"("status");
CREATE INDEX IF NOT EXISTS "payout_transactions_payout_id_idx" ON "payout_transactions"("payout_id");
CREATE INDEX IF NOT EXISTS "payout_transactions_transaction_id_idx" ON "payout_transactions"("transaction_id");
CREATE INDEX IF NOT EXISTS "payment_transactions_refunded_at_idx" ON "payment_transactions"("refunded_at");
