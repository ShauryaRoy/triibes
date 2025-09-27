-- Add community join requests table for private communities
CREATE TABLE "community_join_requests" (
  "id" SERIAL PRIMARY KEY,
  "community_id" INTEGER NOT NULL REFERENCES "communities"("id") ON DELETE CASCADE,
  "user_id" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "message" TEXT, -- Optional message from user
  "status" VARCHAR(20) DEFAULT 'pending' NOT NULL, -- 'pending' | 'approved' | 'rejected'
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW(),
  "reviewed_by" VARCHAR REFERENCES "users"("id"), -- Admin who reviewed the request
  "reviewed_at" TIMESTAMP -- When the request was reviewed
);

-- Create unique index to prevent duplicate requests
CREATE UNIQUE INDEX "unique_community_join_request" ON "community_join_requests" ("community_id", "user_id");

-- Create index for faster lookups
CREATE INDEX "idx_community_join_requests_community" ON "community_join_requests" ("community_id");
CREATE INDEX "idx_community_join_requests_user" ON "community_join_requests" ("user_id");
CREATE INDEX "idx_community_join_requests_status" ON "community_join_requests" ("status");