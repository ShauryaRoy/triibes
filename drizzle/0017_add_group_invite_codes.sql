-- Add group invite codes table for private group invitations
CREATE TABLE IF NOT EXISTS "group_invite_codes" (
  "id" serial PRIMARY KEY NOT NULL,
  "group_id" integer NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE,
  "code" varchar(8) NOT NULL UNIQUE,
  "created_by" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "expires_at" timestamp,
  "max_uses" integer,
  "use_count" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now()
);

-- Create index for faster lookups by code
CREATE INDEX IF NOT EXISTS "idx_group_invite_codes_code" ON "group_invite_codes" ("code");
CREATE INDEX IF NOT EXISTS "idx_group_invite_codes_group_id" ON "group_invite_codes" ("group_id");
