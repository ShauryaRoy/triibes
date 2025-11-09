-- Add slug column to events table
ALTER TABLE events ADD COLUMN slug VARCHAR(255) UNIQUE;

-- Create index on slug for faster lookups
CREATE INDEX idx_events_slug ON events(slug);

-- Generate slugs for existing events (title + random string)
-- This will be done via a script after migration
