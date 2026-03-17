import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import ws from 'ws';

config();

neonConfig.fetchConnectionCache = true;
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({ connectionString });
const db = drizzle(pool);

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const all = args.includes('--all');
const eventIdsArg = args.find((a) => a.startsWith('--eventIds='));
const minutesArg = args.find((a) => a.startsWith('--minutes='));

const minutes = minutesArg ? Number(minutesArg.split('=')[1]) : 330;
if (!Number.isFinite(minutes) || minutes <= 0) {
  throw new Error('Invalid --minutes value. Example: --minutes=330');
}

const eventIds = eventIdsArg
  ? eventIdsArg
      .split('=')[1]
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((n) => Number.isFinite(n) && n > 0)
  : [];

if (!all && eventIds.length === 0) {
  console.log('Usage:');
  console.log('  Preview specific events: npm run tsx scripts/fix-event-time-offset.ts -- --eventIds=123,124');
  console.log('  Apply specific events:   npm run tsx scripts/fix-event-time-offset.ts -- --eventIds=123,124 --apply');
  console.log('  Preview all events:      npm run tsx scripts/fix-event-time-offset.ts -- --all');
  console.log('  Apply all events:        npm run tsx scripts/fix-event-time-offset.ts -- --all --apply');
  process.exit(1);
}

const interval = `${minutes} minutes`;

const whereClause = all
  ? sql`TRUE`
  : sql`id = ANY(${eventIds})`;

async function preview() {
  const result = await db.execute(sql`
    SELECT
      id,
      title,
      datetime,
      end_datetime,
      datetime - (${sql.raw(`INTERVAL '${interval}'`)}) AS corrected_datetime,
      CASE
        WHEN end_datetime IS NULL THEN NULL
        ELSE end_datetime - (${sql.raw(`INTERVAL '${interval}'`)})
      END AS corrected_end_datetime
    FROM events
    WHERE ${whereClause}
    ORDER BY id ASC;
  `);

  console.log('\nPreview (before -> after):');
  for (const row of (result as any).rows || []) {
    console.log(`\nEvent #${row.id} - ${row.title}`);
    console.log(`  datetime:      ${row.datetime}`);
    console.log(`  corrected:     ${row.corrected_datetime}`);
    console.log(`  end_datetime:  ${row.end_datetime}`);
    console.log(`  corrected end: ${row.corrected_end_datetime}`);
  }
}

async function applyFix() {
  const result = await db.execute(sql`
    UPDATE events
    SET
      datetime = datetime - (${sql.raw(`INTERVAL '${interval}'`)}),
      end_datetime = CASE
        WHEN end_datetime IS NULL THEN NULL
        ELSE end_datetime - (${sql.raw(`INTERVAL '${interval}'`)})
      END,
      updated_at = NOW()
    WHERE ${whereClause};
  `);

  const rowCount = (result as any).rowCount ?? 0;
  console.log(`\nApplied timezone correction to ${rowCount} event(s).`);
}

(async () => {
  try {
    await preview();

    if (!apply) {
      console.log('\nDry run only. Re-run with --apply to persist changes.');
      process.exit(0);
    }

    await applyFix();
    await preview();
    process.exit(0);
  } catch (error) {
    console.error('Failed to run timezone correction:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
