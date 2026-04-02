import { db } from "../server/db";
import { posterCatalog } from "../shared/schema";
import { sql } from "drizzle-orm";

const posters = [
  {
    id: "neon-night",
    name: "Neon Night",
    category: "Party",
    imageUrl: "/posters/neon_night.png",
    description: "Vibrant neon vibes for your next big bash"
  },
  {
    id: "summer-pool",
    name: "Summer Pool",
    category: "Party",
    imageUrl: "/posters/summer_pool.png",
    description: "Refreshing ripples and tropical vibes"
  },
  {
    id: "jazz-night",
    name: "Jazz Evening",
    category: "Music",
    imageUrl: "/posters/jazz_night.png",
    description: "Elegant and moody jazz atmosphere"
  },
  {
    id: "tech-mixer",
    name: "Tech Mixer",
    category: "Networking",
    imageUrl: "/posters/tech_mixer.png",
    description: "Modern networking and tech vibes"
  },
  {
    id: "art-wine",
    name: "Art & Wine",
    category: "Social",
    imageUrl: "/posters/art_wine.png",
    description: "Classy and creative social gatherings"
  },
  {
    id: "outdoor-movie",
    name: "Outdoor Movie",
    category: "Entertainment",
    imageUrl: "/posters/outdoors_movie.png",
    description: "Cozy backyard movie night vibes"
  },
  {
    id: "yoga-morning",
    name: "Yoga Morning",
    category: "Wellness",
    imageUrl: "/posters/yoga_morning.png",
    description: "Peaceful morning zen and wellness"
  },
  {
    id: "game-night",
    name: "Game Night",
    category: "Fun",
    imageUrl: "/posters/game_night.png",
    description: "Retro arcade energy for game night"
  }
];

async function main() {
  console.log("Seeding poster_catalog table...");
  try {
    for (const poster of posters) {
      await db.execute(sql`
        INSERT INTO poster_catalog (id, name, category, image_url, description)
        VALUES (${poster.id}, ${poster.name}, ${poster.category}, ${poster.imageUrl}, ${poster.description})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          image_url = EXCLUDED.image_url,
          description = EXCLUDED.description
      `);
    }
    console.log("Posters seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding:", error);
    process.exit(1);
  }
}

main();
