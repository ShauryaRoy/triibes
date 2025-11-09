-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL,
    user_id VARCHAR NOT NULL,
    remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
    channel VARCHAR DEFAULT 'email' NOT NULL,
    offset_minutes INTEGER,
    message TEXT,
    sent BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_reminders_remind_at ON reminders(remind_at);
CREATE INDEX idx_reminders_sent ON reminders(sent);
CREATE INDEX idx_reminders_user_event ON reminders(user_id, event_id);
