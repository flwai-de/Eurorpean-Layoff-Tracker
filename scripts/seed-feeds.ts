import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { rssFeeds } from "../src/lib/db/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const client = postgres(connectionString);
const db = drizzle(client);

type FeedSeed = {
  name: string;
  url: string;
  language: string;
  category: "tech" | "industry" | "finance" | "general" | "startup";
};

// NOTE: Before adding new entries, verify the URL returns valid RSS/Atom XML.
// Some outlets block server IPs or silently change feed paths. If a feed is
// broken at seed time, comment it out with a warning rather than insert junk.
const FEEDS: FeedSeed[] = [
  {
    name: "TechCrunch Layoffs",
    url: "https://techcrunch.com/tag/layoffs/feed/",
    language: "en",
    category: "tech",
  },
  {
    name: "Sifted",
    url: "https://sifted.eu/feed",
    language: "en",
    category: "startup",
  },
  {
    name: "Reuters Business",
    url: "https://www.reuters.com/business/rss",
    language: "en",
    category: "general",
  },
  {
    name: "Handelsblatt Unternehmen",
    url: "https://www.handelsblatt.com/contentexport/feed/unternehmen",
    language: "de",
    category: "general",
  },
  {
    name: "Gründerszene",
    url: "https://www.businessinsider.de/gruenderszene/feed/",
    language: "de",
    category: "startup",
  },
  {
    name: "The Guardian Business",
    url: "https://www.theguardian.com/uk/business/rss",
    language: "en",
    category: "general",
  },
  {
    name: "Wirtschaftswoche",
    url: "https://www.wiwo.de/rss/feed.rss",
    language: "de",
    category: "general",
  },
  {
    name: "Bloomberg Europe",
    url: "https://feeds.bloomberg.com/markets/news.rss",
    language: "en",
    category: "finance",
  },
];

async function main() {
  console.log(`[seed-feeds] Seeding ${FEEDS.length} RSS feeds...`);

  const result = await db
    .insert(rssFeeds)
    .values(FEEDS.map((f) => ({ ...f, isActive: true })))
    .onConflictDoNothing({ target: rssFeeds.url })
    .returning({ id: rssFeeds.id, name: rssFeeds.name });

  console.log(`[seed-feeds] Inserted ${result.length} new feeds:`);
  for (const r of result) console.log(`  - ${r.name}`);

  const skipped = FEEDS.length - result.length;
  if (skipped > 0) {
    console.log(`[seed-feeds] Skipped ${skipped} (already present)`);
  }

  await client.end();
}

main().catch(async (err) => {
  console.error("[seed-feeds] Failed:", err);
  await client.end();
  process.exit(1);
});
