-- Add discover page columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS discover_status VARCHAR DEFAULT 'none' NOT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS discover_requested_at TIMESTAMP;
ALTER TABLE events ADD COLUMN IF NOT EXISTS discover_requested_message TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS discover_reviewed_by VARCHAR;
ALTER TABLE events ADD COLUMN IF NOT EXISTS discover_reviewed_at TIMESTAMP;
ALTER TABLE events ADD COLUMN IF NOT EXISTS discover_review_note TEXT;

-- Add foreign key for discover_reviewed_by
ALTER TABLE events ADD CONSTRAINT events_discover_reviewed_by_users_id_fk 
  FOREIGN KEY (discover_reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add index for discover_status for faster queries
CREATE INDEX IF NOT EXISTS idx_events_discover_status ON events(discover_status);
