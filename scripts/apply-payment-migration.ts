import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  try {
    console.log('Applying payment migration...');
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '..', 'drizzle', '0014_add_payments.sql'),
      'utf-8'
    );
    
    await db.execute(sql.raw(migrationSQL));
    
    console.log('✅ Payment migration applied successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration();
