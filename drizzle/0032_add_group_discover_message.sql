-- Add discover_requested_message to groups table (parity with events)
ALTER TABLE groups ADD COLUMN IF NOT EXISTS discover_requested_message TEXT;
