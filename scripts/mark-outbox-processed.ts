import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function run() {
  const result = await db.execute(sql`
    UPDATE notification_outbox
    SET status = 'processed', processed_at = NOW()
    WHERE status = 'pending'
  `);
  console.log('Marked', result.rowCount, 'pending outbox events as processed (historical backfill)');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
