-- Add unique constraint to event_rsvps to prevent duplicate RSVPs
-- First, clean up any existing duplicates before adding the constraint
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Count duplicates
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT event_id, user_id, COUNT(*) as cnt
    FROM event_rsvps
    GROUP BY event_id, user_id
    HAVING COUNT(*) > 1
  ) as duplicates;

  -- If duplicates exist, keep only the most recent RSVP for each (eventId, userId)
  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Found % duplicate RSVP combinations. Cleaning up...', duplicate_count;
    
    DELETE FROM event_rsvps
    WHERE id NOT IN (
      SELECT MAX(id)
      FROM event_rsvps
      GROUP BY event_id, user_id
    );
    
    RAISE NOTICE 'Cleanup complete. Kept most recent RSVP for each user-event combination.';
  ELSE
    RAISE NOTICE 'No duplicates found. Proceeding with constraint addition.';
  END IF;
END $$;

-- Add the unique constraint
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_event_id_user_id_unique" UNIQUE("event_id", "user_id");
