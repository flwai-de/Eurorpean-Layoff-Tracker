"use server";

import { db } from "@/lib/db";
import { rssFeeds } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { rssFetchQueue } from "@/lib/queue";

type ActionResult<T = undefined> = { success: boolean; error?: string; data?: T };

const feedSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url(),
  language: z.enum(["de", "en"]),
  category: z.enum(["tech", "industry", "finance", "general", "startup"]),
});

export async function getFeeds() {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };

  const items = await db
    .select()
    .from(rssFeeds)
    .orderBy(desc(rssFeeds.createdAt));

  return { success: true as const, data: items };
}

export async function createFeed(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" };

  const parsed = feedSchema.safeParse({
    name: formData.get("name"),
    url: formData.get("url"),
    language: formData.get("language"),
    category: formData.get("category"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Validation failed" };
  }

  try {
    const [feed] = await db
      .insert(rssFeeds)
      .values(parsed.data)
      .returning({ id: rssFeeds.id });

    return { success: true, data: { id: feed.id } };
  } catch (error) {
    if (error instanceof Error && error.message.includes("unique")) {
      return { success: false, error: "A feed with this URL already exists" };
    }
    return { success: false, error: "Failed to create feed" };
  }
}

export async function toggleFeedActive(feedId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" };

  const feed = await db.query.rssFeeds.findFirst({
    where: eq(rssFeeds.id, feedId),
    columns: { isActive: true },
  });

  if (!feed) return { success: false, error: "Feed not found" };

  await db
    .update(rssFeeds)
    .set({ isActive: !feed.isActive })
    .where(eq(rssFeeds.id, feedId));

  return { success: true };
}

export async function triggerFeedFetch(feedId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" };

  await rssFetchQueue.add("fetch-feed", { feedId }, {
    removeOnComplete: 100,
    removeOnFail: 200,
  });

  return { success: true };
}

export async function deleteFeed(feedId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" };

  await db.delete(rssFeeds).where(eq(rssFeeds.id, feedId));

  return { success: true };
}
