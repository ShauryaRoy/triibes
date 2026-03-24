-- Add approval flow fields to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS entry_mode VARCHAR(20) DEFAULT 'open' NOT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS max_capacity INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS form_schema JSONB;

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  responses JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- One application per user per event
CREATE UNIQUE INDEX IF NOT EXISTS uq_applications_event_user
  ON applications(event_id, user_id);

CREATE INDEX IF NOT EXISTS idx_applications_event_id
  ON applications(event_id);

CREATE INDEX IF NOT EXISTS idx_applications_user_id
  ON applications(user_id);
