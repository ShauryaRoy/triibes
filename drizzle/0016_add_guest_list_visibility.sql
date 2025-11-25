-- Add guest list visibility column to events table
ALTER TABLE "events" ADD COLUMN "guest_list_visibility" varchar(20) DEFAULT 'everyone';
