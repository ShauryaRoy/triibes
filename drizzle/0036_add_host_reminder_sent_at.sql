ALTER TABLE applications
ADD COLUMN IF NOT EXISTS host_reminder_sent_at timestamp;
