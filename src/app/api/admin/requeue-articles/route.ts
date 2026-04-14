import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rssArticles } from "@/lib/db/schema";
import { aiExtractQueue } from "@/lib/queue";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pending = await db
    .select({ id: rssArticles.id })
    .from(rssArticles)
    .where(
      and(eq(rssArticles.isRelevant, true), isNull(rssArticles.processedAt)),
    );

  for (const article of pending) {
    await aiExtractQueue.add(
      "extract",
      { articleId: article.id },
      {
        attempts: 2,
        backoff: { type: "exponential", delay: 10_000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
  }

  return NextResponse.json({
    queued: pending.length,
    articleIds: pending.map((a) => a.id),
  });
}
