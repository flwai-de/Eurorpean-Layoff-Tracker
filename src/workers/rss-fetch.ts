import { Worker, type Job } from "bullmq";
import Parser from "rss-parser";
import { connection, aiExtractQueue } from "@/lib/queue";
import { enqueueAllActiveFeeds } from "@/lib/queue/cron";
import { db } from "@/lib/db";
import { rssFeeds, rssArticles } from "@/lib/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { isBlacklistedUrl } from "@/lib/utils/url-blacklist";
import { normalizeTitle } from "@/lib/utils/title-dedup";
import { classifyArticle } from "@/lib/api/gemini-classify";
import { sendTelegramAlert, formatLayoffAlert } from "@/lib/telegram";

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
    let blacklisted = 0;
    let duplicates = 0;
    let classified = 0;
    let classifiedYes = 0;
    let classifiedNo = 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const item of parsed.items) {
      const articleUrl = item.link;
      if (!articleUrl) continue;

      // Stage 0: URL-Blacklist
      if (isBlacklistedUrl(articleUrl)) {
        blacklisted++;
        continue;
      }

      // URL duplicate check (existing behavior)
      const existingByUrl = await db.query.rssArticles.findFirst({
        where: eq(rssArticles.url, articleUrl),
        columns: { id: true },
      });
      if (existingByUrl) continue;

      const title = item.title ?? "Untitled";
      const normalized = normalizeTitle(title);
      const rawContent =
        item.contentSnippet ?? item.content ?? item.summary ?? null;

      // Stage 1: Near-duplicate title check (7 days)
      const existingByTitle = await db
        .select({ id: rssArticles.id })
        .from(rssArticles)
        .where(
          and(
            eq(rssArticles.titleNormalized, normalized),
            gte(rssArticles.createdAt, sevenDaysAgo),
          ),
        )
        .limit(1);

      if (existingByTitle.length > 0) {
        duplicates++;
        continue;
      }

      // Insert article into DB
      const [newArticle] = await db
        .insert(rssArticles)
        .values({
          feedId,
          title,
          titleNormalized: normalized,
          url: articleUrl,
          publishedAt: item.isoDate ? new Date(item.isoDate) : null,
          rawContent,
        })
        .returning({ id: rssArticles.id });

      inserted++;

      // Stage 2: Gemini Flash-Lite classification
      try {
        const classification = await classifyArticle(
          title,
          rawContent ?? undefined,
        );
        classified++;

        if (classification.isLayoff) {
          classifiedYes++;

          await sendTelegramAlert(
            formatLayoffAlert({
              articleTitle: title,
              feedName: feed.name,
              articleUrl,
            }),
          );

          await aiExtractQueue.add(
            "extract",
            { articleId: newArticle.id },
            {
              attempts: 2,
              backoff: { type: "exponential", delay: 10_000 },
              removeOnComplete: 100,
              removeOnFail: 200,
            },
          );
        } else {
          classifiedNo++;

          await db
            .update(rssArticles)
            .set({
              isRelevant: false,
              relevanceReasoning: "Gemini classified as non-layoff",
              processedAt: new Date(),
            })
            .where(eq(rssArticles.id, newArticle.id));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(
          `[rss-fetch] Gemini classification failed for ${newArticle.id}: ${message}`,
        );

        // Fallback: send to Haiku anyway
        await aiExtractQueue.add(
          "extract",
          { articleId: newArticle.id },
          {
            attempts: 2,
            backoff: { type: "exponential", delay: 10_000 },
            removeOnComplete: 100,
            removeOnFail: 200,
          },
        );
      }
    }

    // Update feed status
    await db
      .update(rssFeeds)
      .set({ lastFetchedAt: new Date(), lastError: null })
      .where(eq(rssFeeds.id, feedId));

    console.log(
      `[rss-fetch] Feed "${feed.name}": ${parsed.items.length} items -> ${blacklisted} blacklisted, ${duplicates} duplicates, ${classified} classified, ${classifiedYes} yes, ${classifiedNo} no`,
    );

    return {
      feedId,
      itemsFound: parsed.items.length,
      inserted,
      blacklisted,
      duplicates,
      classified,
      classifiedYes,
      classifiedNo,
    };
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
