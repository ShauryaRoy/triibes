import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

async function applyMigration() {
  const sql = neon(process.env.DATABASE_URL || '');
  
  try {
    console.log('Applying reminders migration...\n');
    
    // First, create the reminders table
    console.log('1. Creating reminders table...');
    try {
      await sql(`
        CREATE TABLE IF NOT EXISTS reminders (
            id SERIAL PRIMARY KEY,
            event_id INTEGER NOT NULL,
            user_id VARCHAR NOT NULL,
            remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
            channel VARCHAR DEFAULT 'email' NOT NULL,
            offset_minutes INTEGER,
            message TEXT,
            sent BOOLEAN DEFAULT FALSE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('✓ Reminders table created\n');
    } catch (error) {
      if (!((error as any).message?.includes('already exists') || (error as any).code === '42P07')) {
        throw error;
      }
      console.log('⚠ Table already exists\n');
    }
    
    // Create indexes
    const indexes = [
      { name: 'idx_reminders_remind_at', sql: 'CREATE INDEX idx_reminders_remind_at ON reminders(remind_at)' },
      { name: 'idx_reminders_sent', sql: 'CREATE INDEX idx_reminders_sent ON reminders(sent)' },
      { name: 'idx_reminders_user_event', sql: 'CREATE INDEX idx_reminders_user_event ON reminders(user_id, event_id)' }
    ];
    
    for (const idx of indexes) {
      console.log(`2. Creating index ${idx.name}...`);
      try {
        await sql(idx.sql);
        console.log(`✓ Index ${idx.name} created\n`);
      } catch (error) {
        if (!((error as any).message?.includes('already exists') || (error as any).code === '42P07')) {
          throw error;
        }
        console.log(`⚠ Index ${idx.name} already exists\n`);
      }
    }
    
    console.log('✅ Reminders table migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
