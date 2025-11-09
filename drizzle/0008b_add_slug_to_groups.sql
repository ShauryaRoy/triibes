-- Add slug column to groups table
ALTER TABLE "groups" ADD COLUMN "slug" VARCHAR(100);

-- Create unique index on slug
CREATE UNIQUE INDEX "groups_slug_unique" ON "groups" ("slug");

-- Add comment
COMMENT ON COLUMN "groups"."slug" IS 'URL-friendly unique identifier for the group';
