// Run event invite codes migration
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function migrate() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log('Creating event_invite_codes table...');
  
  // Create the event_invite_codes table
  await sql`
    CREATE TABLE IF NOT EXISTS event_invite_codes (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      code VARCHAR(8) NOT NULL UNIQUE,
      created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMP,
      max_uses INTEGER,
      use_count INTEGER DEFAULT 0 NOT NULL,
      is_active BOOLEAN DEFAULT true NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `;
  
  console.log('Creating indexes...');
  
  // Create indexes
  await sql`CREATE INDEX IF NOT EXISTS event_invite_codes_event_id_idx ON event_invite_codes(event_id)`;
  await sql`CREATE INDEX IF NOT EXISTS event_invite_codes_code_idx ON event_invite_codes(code)`;
  
  console.log('Migration completed successfully!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
