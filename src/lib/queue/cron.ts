import { rssFetchQueue } from "./index";
import { db } from "@/lib/db";
import { rssFeeds } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Register the repeatable cron job that fans out individual feed-fetch jobs.
 */
export async function registerCronJobs() {
  await rssFetchQueue.upsertJobScheduler(
    "rss-fetch-cron",
    { pattern: "*/15 * * * *" },
    { name: "fetch-all-feeds" },
  );
}

/**
 * Load all active feeds and enqueue one rss-fetch job per feed.
 */
export async function enqueueAllActiveFeeds() {
  const feeds = await db
    .select({ id: rssFeeds.id, name: rssFeeds.name })
    .from(rssFeeds)
    .where(eq(rssFeeds.isActive, true));

  for (const feed of feeds) {
    await rssFetchQueue.add("fetch-feed", { feedId: feed.id }, {
      jobId: `feed-${feed.id}`,
      removeOnComplete: 100,
      removeOnFail: 200,
    });
  }

  return feeds.length;
}
