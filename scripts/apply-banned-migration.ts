import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyBannedColumnMigration() {
  try {
    console.log('📦 Applying banned column migration...');
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../drizzle/0011_add_banned_column.sql'),
      'utf-8'
    );

    await db.execute(sql.raw(migrationSQL));
    
    console.log('✅ Banned column migration applied successfully!');
    console.log('   - Added "banned" column to users table');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyBannedColumnMigration();
