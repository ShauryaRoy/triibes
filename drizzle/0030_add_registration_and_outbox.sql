-- Add registration domain columns to event_rsvps
ALTER TABLE "event_rsvps" ADD COLUMN IF NOT EXISTS "price" integer NOT NULL DEFAULT 0;
ALTER TABLE "event_rsvps" ADD COLUMN IF NOT EXISTS "payment_status" varchar(20) NOT NULL DEFAULT 'not_required';
ALTER TABLE "event_rsvps" ADD COLUMN IF NOT EXISTS "confirmed_at" timestamp;

-- Backfill: existing 'going' RSVPs are confirmed free registrations
UPDATE "event_rsvps"
SET "payment_status" = 'not_required',
    "confirmed_at" = "created_at"
WHERE "status" = 'going'
  AND "confirmed_at" IS NULL;

-- Drop old email tracking columns (superseded by notification outbox)
ALTER TABLE "event_rsvps" DROP COLUMN IF EXISTS "registration_email_lock";
ALTER TABLE "event_rsvps" DROP COLUMN IF EXISTS "registration_email_delivered";
ALTER TABLE "event_rsvps" DROP COLUMN IF EXISTS "registration_email_last_attempt_at";

-- Create notification outbox table
CREATE TABLE IF NOT EXISTS "notification_outbox" (
  "id" text PRIMARY KEY NOT NULL,
  "event_type" text NOT NULL,
  "payload" jsonb NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "retry_count" integer NOT NULL DEFAULT 0,
  "locked" boolean NOT NULL DEFAULT false,
  "created_at" timestamp DEFAULT now(),
  "processed_at" timestamp
);

-- Index for efficient outbox polling
CREATE INDEX IF NOT EXISTS "notification_outbox_status_created_idx"
  ON "notification_outbox" ("status", "created_at");
