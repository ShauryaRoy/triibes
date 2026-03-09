-- Add discover approval columns to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS discover_status VARCHAR DEFAULT 'none' NOT NULL;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS discover_requested_at TIMESTAMP;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS discover_reviewed_by VARCHAR REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS discover_reviewed_at TIMESTAMP;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS discover_review_note TEXT;

-- Add index for discover_status for faster queries
CREATE INDEX IF NOT EXISTS idx_groups_discover_status ON groups(discover_status);
