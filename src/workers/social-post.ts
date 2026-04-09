import { Worker, type Job } from "bullmq";
import { connection } from "@/lib/queue";
import { db } from "@/lib/db";
import { socialPosts, layoffs, companies, industries } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  generateXPost,
  generateLinkedInPost,
  generateRedditTitle,
  generateRedditBody,
} from "@/lib/social/templates";
import { postToX } from "@/lib/social/x";
import { postToLinkedIn } from "@/lib/social/linkedin";
import { postToReddit } from "@/lib/social/reddit";

interface SocialPostPayload {
  layoffId: string;
  platform: "x" | "linkedin" | "reddit";
}

async function handleSocialPost(job: Job<SocialPostPayload>) {
  const { layoffId, platform } = job.data;

  // Load layoff + company + industry
  const layoff = await db
    .select({
      id: layoffs.id,
      status: layoffs.status,
      affectedCount: layoffs.affectedCount,
      affectedPercentage: layoffs.affectedPercentage,
      country: layoffs.country,
      reason: layoffs.reason,
      sourceUrl: layoffs.sourceUrl,
      companyName: companies.name,
      industryNameEn: industries.nameEn,
    })
    .from(layoffs)
    .innerJoin(companies, eq(layoffs.companyId, companies.id))
    .innerJoin(industries, eq(companies.industrySlug, industries.slug))
    .where(eq(layoffs.id, layoffId))
    .limit(1);

  if (layoff.length === 0) {
    return { skipped: true, reason: "Layoff not found" };
  }

  const l = layoff[0];

  if (l.status !== "verified") {
    return { skipped: true, reason: "Layoff not verified" };
  }

  // Check for existing post (unique constraint)
  const existing = await db
    .select({ id: socialPosts.id })
    .from(socialPosts)
    .where(and(eq(socialPosts.layoffId, layoffId), eq(socialPosts.platform, platform)))
    .limit(1);

  if (existing.length > 0) {
    return { skipped: true, reason: "Already posted" };
  }

  const templateData = {
    companyName: l.companyName,
    affectedCount: l.affectedCount,
    affectedPercentage: l.affectedPercentage,
    country: l.country,
    reason: l.reason,
    industryName: l.industryNameEn,
    sourceUrl: l.sourceUrl,
    layoffId,
  };

  let content: string;
  let redditTitle: string | undefined;

  switch (platform) {
    case "x":
      content = generateXPost(templateData);
      break;
    case "linkedin":
      content = generateLinkedInPost(templateData);
      break;
    case "reddit":
      redditTitle = generateRedditTitle(templateData);
      content = generateRedditBody(templateData);
      break;
  }

  // Insert queued record
  const [post] = await db
    .insert(socialPosts)
    .values({
      layoffId,
      platform,
      content: platform === "reddit" ? `${redditTitle}\n\n${content}` : content,
      status: "queued",
    })
    .onConflictDoNothing()
    .returning({ id: socialPosts.id });

  // If conflict (already exists), skip
  if (!post) {
    return { skipped: true, reason: "Already posted (conflict)" };
  }

  // Post to platform
  try {
    let postUrl: string;

    switch (platform) {
      case "x":
        ({ postUrl } = await postToX(content));
        break;
      case "linkedin":
        ({ postUrl } = await postToLinkedIn(content));
        break;
      case "reddit": {
        const subreddit = process.env.REDDIT_SUBREDDIT ?? "layoffs";
        ({ postUrl } = await postToReddit(redditTitle!, content, subreddit));
        break;
      }
    }

    await db
      .update(socialPosts)
      .set({ status: "posted", postUrl, postedAt: new Date() })
      .where(eq(socialPosts.id, post.id));

    console.log(`[social-post] Posted to ${platform} for layoff ${layoffId}: ${postUrl}`);
    return { platform, postUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await db
      .update(socialPosts)
      .set({ status: "failed", errorMessage: message })
      .where(eq(socialPosts.id, post.id));

    console.error(`[social-post] Failed to post to ${platform}:`, message);
    throw error;
  }
}

export function createSocialPostWorker() {
  const worker = new Worker(
    "social-post",
    async (job) => handleSocialPost(job as Job<SocialPostPayload>),
    {
      connection,
      concurrency: 1,
    },
  );

  worker.on("completed", (job) => {
    console.log(`[social-post] Job ${job.id} (${job.name}) completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[social-post] Job ${job?.id} (${job?.name}) failed:`, err.message);
  });

  return worker;
}
