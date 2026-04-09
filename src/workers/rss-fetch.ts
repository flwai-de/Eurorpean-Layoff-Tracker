import { Worker, type Job } from "bullmq";
import Parser from "rss-parser";
import { connection, aiExtractQueue } from "@/lib/queue";
import { enqueueAllActiveFeeds } from "@/lib/queue/cron";
import { db } from "@/lib/db";
import { rssFeeds, rssArticles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const parser = new Parser({
  timeout: 20_000,
  headers: {
    "User-Agent": "Dimissio/1.0 (+https://dimissio.eu)",
  },
});

interface FetchFeedPayload {
  feedId: string;
}

async function handleFetchFeed(job: Job<FetchFeedPayload>) {
  const { feedId } = job.data;

  const feed = await db.query.rssFeeds.findFirst({
    where: eq(rssFeeds.id, feedId),
  });

  if (!feed || !feed.isActive) {
    return { skipped: true, reason: "Feed not found or inactive" };
  }

  try {
    const parsed = await parser.parseURL(feed.url);
    let inserted = 0;

    for (const item of parsed.items) {
      const articleUrl = item.link;
      if (!articleUrl) continue;

      // Duplicate check
      const existing = await db.query.rssArticles.findFirst({
        where: eq(rssArticles.url, articleUrl),
        columns: { id: true },
      });
      if (existing) continue;

      const [newArticle] = await db
        .insert(rssArticles)
        .values({
          feedId,
          title: item.title ?? "Untitled",
          url: articleUrl,
          publishedAt: item.isoDate ? new Date(item.isoDate) : null,
          rawContent: item.contentSnippet ?? item.content ?? item.summary ?? null,
        })
        .returning({ id: rssArticles.id });

      await aiExtractQueue.add("extract", { articleId: newArticle.id }, {
        removeOnComplete: 100,
        removeOnFail: 200,
      });

      inserted++;
    }

    // Update feed status
    await db
      .update(rssFeeds)
      .set({ lastFetchedAt: new Date(), lastError: null })
      .where(eq(rssFeeds.id, feedId));

    return { feedId, itemsFound: parsed.items.length, inserted };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await db
      .update(rssFeeds)
      .set({ lastError: message })
      .where(eq(rssFeeds.id, feedId));

    throw error;
  }
}

async function handleFetchAllFeeds() {
  const count = await enqueueAllActiveFeeds();
  return { feedsEnqueued: count };
}

export function createRssFetchWorker() {
  const worker = new Worker(
    "rss-fetch",
    async (job) => {
      if (job.name === "fetch-all-feeds") {
        return handleFetchAllFeeds();
      }
      return handleFetchFeed(job as Job<FetchFeedPayload>);
    },
    {
      connection,
      concurrency: 5,
    },
  );

  worker.on("completed", (job) => {
    console.log(`[rss-fetch] Job ${job.id} (${job.name}) completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[rss-fetch] Job ${job?.id} (${job?.name}) failed:`, err.message);
  });

  return worker;
}
