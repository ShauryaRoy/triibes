-- Migration: Rename communities to groups and add cover image support

-- Rename communities table to groups
ALTER TABLE "communities" RENAME TO "groups";

-- Add cover image column to groups table
ALTER TABLE "groups" ADD COLUMN "cover_image_url" text;

-- Update default image URL for existing groups
UPDATE "groups" SET "image_url" = '/static/frog butcher.png' WHERE "image_url" IS NULL;

-- Alter image_url column to have default value
ALTER TABLE "groups" ALTER COLUMN "image_url" SET DEFAULT '/static/frog butcher.png';

-- Rename community_members table to group_members
ALTER TABLE "community_members" RENAME TO "group_members";

-- Rename column in group_members table
ALTER TABLE "group_members" RENAME COLUMN "community_id" TO "group_id";

-- Update announcements table to reference groups
ALTER TABLE "announcements" RENAME COLUMN "community_id" TO "group_id";

-- Rename community_join_requests table to group_join_requests
ALTER TABLE "community_join_requests" RENAME TO "group_join_requests";

-- Rename column in group_join_requests table
ALTER TABLE "group_join_requests" RENAME COLUMN "community_id" TO "group_id";

-- Update events table to reference groups
ALTER TABLE "events" RENAME COLUMN "community_id" TO "group_id";

-- Rename index
DROP INDEX IF EXISTS "unique_community_join_request";
CREATE UNIQUE INDEX "unique_group_join_request" ON "group_join_requests" ("group_id", "user_id");