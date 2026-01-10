-- Add payout details fields to events table
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "payout_method" varchar(10);
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "account_holder_name" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "account_number" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "ifsc_code" varchar(11);
