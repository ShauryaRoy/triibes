-- Add current_capacity column to events table for atomic capacity management
ALTER TABLE events ADD COLUMN current_capacity INTEGER DEFAULT 0 NOT NULL;

-- Initialize current_capacity based on existing RSVPs
UPDATE events e
SET current_capacity = (
  SELECT COUNT(*)
  FROM event_rsvps r
  WHERE r.event_id = e.id AND r.status = 'going'
);

-- Add index for faster capacity checks
CREATE INDEX idx_events_capacity ON events(id, current_capacity, max_guests);

-- Add check constraint to ensure current_capacity never exceeds max_guests
ALTER TABLE events ADD CONSTRAINT chk_capacity_limit 
  CHECK (max_guests IS NULL OR current_capacity <= max_guests);
