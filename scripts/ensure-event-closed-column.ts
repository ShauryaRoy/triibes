import "dotenv/config";
import { Client } from "pg";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query(
      'ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "is_closed" boolean NOT NULL DEFAULT false;'
    );
    console.log("✅ ensured events.is_closed exists");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("❌ failed to ensure events.is_closed", err);
  process.exitCode = 1;
});
