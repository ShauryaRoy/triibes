import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ws from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config();

neonConfig.fetchConnectionCache = true;
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({ connectionString });
const db = drizzle(pool);

async function runMigrations() {
  console.log('🔄 Running migrations...');
  
  const migrationsDir = path.join(__dirname, '../drizzle');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  console.log(`Found ${files.length} migration files`);
  
  for (const file of files) {
    console.log(`📝 Applying: ${file}`);
    const filePath = path.join(migrationsDir, file);
    const sqlContent = fs.readFileSync(filePath, 'utf-8');
    
    try {
      await db.execute(sql.raw(sqlContent));
      console.log(`✅ Applied: ${file}`);
    } catch (error: any) {
      if (error.message.includes('already exists') || error.message.includes('duplicate column')) {
        console.log(`⏭️  Skipped: ${file} (already applied)`);
      } else {
        console.error(`❌ Error applying ${file}:`, error);
        throw error;
      }
    }
  }
  
  console.log('✅ All migrations completed!');
  process.exit(0);
}

runMigrations().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
