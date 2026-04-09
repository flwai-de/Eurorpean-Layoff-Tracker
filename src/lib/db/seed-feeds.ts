/**
 * Seed initial RSS feeds.
 * Run via: npx tsx src/lib/db/seed-feeds.ts
 */
import { db } from "./index";
import { rssFeeds } from "./schema";

const INITIAL_FEEDS = [
  // German sources
  {
    name: "Handelsblatt",
    url: "https://www.handelsblatt.com/contentexport/feed/schlagzeilen",
    language: "de",
    category: "general" as const,
  },
  {
    name: "Manager Magazin — Unternehmen",
    url: "https://www.manager-magazin.de/unternehmen/index.rss",
    language: "de",
    category: "industry" as const,
  },
  {
    name: "t3n",
    url: "https://t3n.de/rss.xml",
    language: "de",
    category: "tech" as const,
  },
  {
    name: "Gründerszene",
    url: "https://www.businessinsider.de/gruenderszene/feed/",
    language: "de",
    category: "startup" as const,
  },

  // English sources
  {
    name: "TechCrunch — Layoffs",
    url: "https://techcrunch.com/category/layoffs/feed/",
    language: "en",
    category: "tech" as const,
  },
  {
    name: "Sifted",
    url: "https://sifted.eu/feed",
    language: "en",
    category: "startup" as const,
  },
  {
    name: "The Register",
    url: "https://www.theregister.com/headlines.atom",
    language: "en",
    category: "tech" as const,
  },
  {
    name: "Reuters Business",
    url: "https://www.reutersagency.com/feed/",
    language: "en",
    category: "general" as const,
  },
  {
    name: "Financial Times — Companies",
    url: "https://www.ft.com/companies?format=rss",
    language: "en",
    category: "finance" as const,
  },
  {
    name: "EU-Startups",
    url: "https://www.eu-startups.com/feed/",
    language: "en",
    category: "startup" as const,
  },
];

async function seed() {
  console.log("Seeding RSS feeds...");

  for (const feed of INITIAL_FEEDS) {
    try {
      await db.insert(rssFeeds).values(feed).onConflictDoNothing();
      console.log(`  + ${feed.name}`);
    } catch {
      console.log(`  ~ ${feed.name} (already exists)`);
    }
  }

  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
