-- Fix datetime column to use timestamp with time zone
-- This prevents timezone conversion issues

ALTER TABLE events
ALTER COLUMN datetime TYPE timestamptz USING datetime AT TIME ZONE 'UTC';
