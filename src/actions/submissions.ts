"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { submissions } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/utils/rate-limit";

type ActionResult<T = undefined> = { success: boolean; error?: string; data?: T };

// ============================================================
// Public: create submission
// ============================================================

const submissionSchema = z.object({
  companyName: z.string().min(1).max(200),
  details: z.string().min(20).max(5000),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  submitterEmail: z.string().email().optional().or(z.literal("")),
  gdprConsent: z.literal("on", { errorMap: () => ({ message: "GDPR consent is required" }) }),
});

export async function createSubmission(formData: FormData): Promise<ActionResult> {
  // Rate limit by IP
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(ip, { limit: 5, windowMs: 60 * 60 * 1000 });
  if (!rl.success) {
    return { success: false, error: "RATE_LIMITED" };
  }

  const parsed = submissionSchema.safeParse({
    companyName: formData.get("companyName"),
    details: formData.get("details"),
    sourceUrl: formData.get("sourceUrl"),
    submitterEmail: formData.get("submitterEmail"),
    gdprConsent: formData.get("gdprConsent"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Validation failed" };
  }

  await db.insert(submissions).values({
    companyName: parsed.data.companyName,
    details: parsed.data.details,
    sourceUrl: parsed.data.sourceUrl || null,
    submitterEmail: parsed.data.submitterEmail || null,
    gdprConsent: true,
  });

  return { success: true };
}

// ============================================================
// Admin: list submissions
// ============================================================

export async function getSubmissions(
  status?: "pending" | "processed" | "rejected",
  page = 1,
  perPage = 25,
) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };

  const offset = (page - 1) * perPage;
  const where = status ? eq(submissions.status, status) : undefined;

  const [items, [total]] = await Promise.all([
    db
      .select()
      .from(submissions)
      .where(where)
      .orderBy(desc(submissions.createdAt))
      .limit(perPage)
      .offset(offset),
    db.select({ count: count() }).from(submissions).where(where),
  ]);

  return { success: true as const, data: items, total: total.count };
}

// ============================================================
// Admin: process / reject
// ============================================================

export async function processSubmission(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" };

  await db
    .update(submissions)
    .set({ status: "processed" })
    .where(eq(submissions.id, id));

  return { success: true };
}

export async function rejectSubmission(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" };

  await db
    .update(submissions)
    .set({ status: "rejected" })
    .where(eq(submissions.id, id));

  return { success: true };
}
