import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rssFeeds } from "@/lib/db/schema";

const FEEDS = [
  {
    name: "TechCrunch Layoffs",
    url: "https://techcrunch.com/tag/layoffs/feed/",
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
    name: "Reuters Business",
    url: "https://www.reuters.com/business/rss",
    language: "en",
    category: "general" as const,
  },
  {
    name: "Handelsblatt",
    url: "https://www.handelsblatt.com/contentexport/feed/unternehmen",
    language: "de",
    category: "general" as const,
  },
  {
    name: "Gruenderszene",
    url: "https://www.businessinsider.de/gruenderszene/feed/",
    language: "de",
    category: "startup" as const,
  },
  {
    name: "The Guardian Business",
    url: "https://www.theguardian.com/uk/business/rss",
    language: "en",
    category: "general" as const,
  },
  {
    name: "Wirtschaftswoche",
    url: "https://www.wiwo.de/rss/feed.rss",
    language: "de",
    category: "general" as const,
  },
  {
    name: "Bloomberg Europe",
    url: "https://feeds.bloomberg.com/markets/news.rss",
    language: "en",
    category: "finance" as const,
  },
];

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db
    .insert(rssFeeds)
    .values(FEEDS)
    .onConflictDoNothing({ target: rssFeeds.url })
    .returning();

  return NextResponse.json({
    inserted: result.length,
    feeds: result.map((f) => f.name),
  });
}
