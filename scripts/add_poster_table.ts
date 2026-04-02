import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Creating poster_catalog table...");
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS poster_catalog (
        id VARCHAR PRIMARY KEY,
        name VARCHAR NOT NULL,
        category VARCHAR NOT NULL,
        image_url TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("Table created successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error creating table:", error);
    process.exit(1);
  }
}

main();
