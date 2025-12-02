-- Add rsvp_mode column to events table
-- 'rsvp' = show Going/Maybe/Can't Go buttons (default)
-- 'register' = show single Register button

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "rsvp_mode" varchar(20) DEFAULT 'rsvp';
