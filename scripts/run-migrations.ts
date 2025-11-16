/**
 * Run database migrations
 * This script executes all SQL migration files in order
 */
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Client } = pg;

async function runMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    const migrationsDir = join(__dirname, '..', 'drizzle');
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration files`);

    for (const file of files) {
      console.log(`\nRunning migration: ${file}`);
      const sql = readFileSync(join(migrationsDir, file), 'utf-8');
      
      try {
        await client.query(sql);
        console.log(`✓ ${file} completed`);
      } catch (error: any) {
        // Ignore "already exists" errors
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`⊘ ${file} - already applied (skipping)`);
        } else {
          console.error(`✗ ${file} failed:`, error.message);
          throw error;
        }
      }
    }

    console.log('\n✓ All migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
