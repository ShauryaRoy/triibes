-- Create reminders table for event notifications
CREATE TABLE IF NOT EXISTS reminders (
  id BIGSERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NULL REFERENCES users(id) ON DELETE CASCADE,
  remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'email',
  offset_minutes INTEGER DEFAULT 0,
  message TEXT,
  sent BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at);
CREATE INDEX IF NOT EXISTS idx_reminders_sent ON reminders(sent);
CREATE INDEX IF NOT EXISTS idx_reminders_event_id ON reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_sent_remind_at ON reminders(sent, remind_at);

-- Add COMMENT for documentation
COMMENT ON TABLE reminders IS 'Stores event reminders to be sent to users via email, push, or SMS';
COMMENT ON COLUMN reminders.remind_at IS 'When the reminder should be sent';
COMMENT ON COLUMN reminders.sent IS 'Whether the reminder has been successfully sent';
COMMENT ON COLUMN reminders.error_message IS 'Error details if sending failed';
