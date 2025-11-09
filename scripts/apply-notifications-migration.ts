import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

const sql = neon(process.env.DATABASE_URL!);

async function applyNotificationsMigration() {
  console.log('🔄 Applying notifications migration...');
  
  try {
    // Create notifications table
    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('access_request', 'rsvp_update', 'event_update', 'access_response')),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        event_id INTEGER,
        event_title TEXT,
        from_user_id TEXT,
        action_required BOOLEAN DEFAULT FALSE,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (from_user_id) REFERENCES users (id) ON DELETE SET NULL
      )
    `;
    console.log('✅ Created notifications table');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications(event_id)`;
    console.log('✅ Created indexes');

    console.log('✅ Notifications migration completed successfully!');
  } catch (error) {
    console.error('❌ Error applying notifications migration:', error);
    throw error;
  }
}

applyNotificationsMigration()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
