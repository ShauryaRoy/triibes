import { db } from './db';
import { sql } from 'drizzle-orm';

export async function createReminder(
  eventId: number,
  userId: string,
  remindAt: Date,
  message?: string,
) {
  await db.execute(sql`
    INSERT INTO reminders (event_id, user_id, remind_at, message)
    VALUES (${eventId}, ${userId}, ${remindAt.toISOString()}::timestamptz, ${message || null})
  `);
}
