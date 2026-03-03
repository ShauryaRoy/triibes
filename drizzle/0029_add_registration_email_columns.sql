-- Add registration email tracking columns to event_rsvps
ALTER TABLE "event_rsvps" ADD COLUMN "registration_email_lock" boolean DEFAULT false;
ALTER TABLE "event_rsvps" ADD COLUMN "registration_email_delivered" boolean DEFAULT false;
ALTER TABLE "event_rsvps" ADD COLUMN "registration_email_last_attempt_at" timestamp;

-- Mark ALL existing RSVPs as already delivered to prevent historical email storm.
-- Only RSVPs created AFTER this migration will qualify for email sending.
UPDATE "event_rsvps" SET "registration_email_delivered" = true WHERE "registration_email_delivered" IS NOT TRUE;
