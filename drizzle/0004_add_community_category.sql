-- Add category column to communities table
ALTER TABLE "communities" ADD COLUMN "category" varchar DEFAULT 'general';