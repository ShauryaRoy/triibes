import { db } from '../server/db';
import { events } from '../shared/schema';
import { sql } from 'drizzle-orm';
import { generateEventSlug } from '../shared/event-slug-utils';

async function generateSlugsForExistingEvents() {
  console.log('🔄 Starting slug generation for existing events...');
  
  try {
    // First, run the migration to add the slug column
    console.log('📝 Running migration to add slug column...');
    await db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug)`);
    console.log('✅ Migration completed');
    
    // Get all events without slugs
    const eventsWithoutSlugs = await db.select().from(events).where(sql`slug IS NULL`);
    
    console.log(`📊 Found ${eventsWithoutSlugs.length} events without slugs`);
    
    if (eventsWithoutSlugs.length === 0) {
      console.log('✅ All events already have slugs!');
      process.exit(0);
    }
    
    // Generate and update slugs for each event
    for (const event of eventsWithoutSlugs) {
      const slug = generateEventSlug(event.title);
      
      try {
        await db
          .update(events)
          .set({ slug })
          .where(sql`id = ${event.id}`);
        
        console.log(`✅ Event #${event.id}: "${event.title}" -> "${slug}"`);
      } catch (error: any) {
        if (error.message?.includes('duplicate key')) {
          // If slug already exists, try again with different random part
          const newSlug = generateEventSlug(event.title);
          await db
            .update(events)
            .set({ slug: newSlug })
            .where(sql`id = ${event.id}`);
          console.log(`✅ Event #${event.id}: "${event.title}" -> "${newSlug}" (retry)`);
        } else {
          console.error(`❌ Failed to update event #${event.id}:`, error.message);
        }
      }
    }
    
    console.log(`\n🎉 Successfully generated slugs for ${eventsWithoutSlugs.length} events!`);
    console.log('\n📋 Summary:');
    console.log(`   - Old URLs: /events/123`);
    console.log(`   - New URLs: /events/gaming-night-a8f3k2`);
    console.log('\n⚠️  Note: Both old (ID-based) and new (slug-based) URLs will work!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating slugs:', error);
    process.exit(1);
  }
}

generateSlugsForExistingEvents();
