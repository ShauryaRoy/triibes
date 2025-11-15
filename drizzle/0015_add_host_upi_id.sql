-- Add host_upi_id column to events table
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "host_upi_id" TEXT;
