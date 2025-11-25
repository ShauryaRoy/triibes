import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function applyGuestVisibilityMigration() {
  console.log('🔄 Starting guest list visibility migration...');

  try {
    // Add the guest_list_visibility column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE events 
      ADD COLUMN IF NOT EXISTS guest_list_visibility VARCHAR(20) DEFAULT 'everyone';
    `);

    console.log('✅ Successfully added guest_list_visibility column to events table');
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

applyGuestVisibilityMigration()
  .then(() => {
    console.log('✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
