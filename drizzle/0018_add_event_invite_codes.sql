-- Event invite codes table for private event invitations
CREATE TABLE IF NOT EXISTS "event_invite_codes" (
  "id" SERIAL PRIMARY KEY,
  "event_id" INTEGER NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "code" VARCHAR(8) NOT NULL UNIQUE,
  "created_by" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "expires_at" TIMESTAMP,
  "max_uses" INTEGER,
  "use_count" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS "idx_event_invite_codes_event_id" ON "event_invite_codes"("event_id");
CREATE INDEX IF NOT EXISTS "idx_event_invite_codes_code" ON "event_invite_codes"("code");
