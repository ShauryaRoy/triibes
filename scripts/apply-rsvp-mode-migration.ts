/**
 * Script to apply the rsvp_mode migration
 * Run this with: npx ts-node scripts/apply-rsvp-mode-migration.ts
 */

import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function applyMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("🚀 Starting rsvp_mode migration...");

    // Check if column exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'events' 
      AND column_name = 'rsvp_mode'
    `);

    if (checkResult.rows.length === 0) {
      // Add the column
      await pool.query(`
        ALTER TABLE "events" 
        ADD COLUMN "rsvp_mode" varchar(20) DEFAULT 'rsvp'
      `);
      console.log("✅ Added rsvp_mode column to events table");
    } else {
      console.log("ℹ️ Column rsvp_mode already exists, skipping...");
    }

    console.log("🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

applyMigration().catch(console.error);
