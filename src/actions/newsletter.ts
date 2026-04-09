"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { newsletterSubscribers, newsletterIssues, layoffs } from "@/lib/db/schema";
import { eq, desc, count, inArray } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/utils/rate-limit";
import { Resend } from "resend";
import { newsletterSendQueue } from "@/lib/queue";

const resend = new Resend(process.env.RESEND_API_KEY);

type ActionResult = { success: boolean; error?: string };

// ============================================================
// Public: subscribe
// ============================================================

const subscribeSchema = z.object({
  email: z.string().email(),
  language: z.enum(["de", "en"]),
  gdprConsent: z.literal("on", { errorMap: () => ({ message: "Consent required" }) }),
});

function generateToken(): string {
  return crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
}

async function sendConfirmationEmail(
  email: string,
  token: string,
  language: "de" | "en",
) {
  const confirmUrl = `https://dimissio.eu/api/public/newsletter/confirm/${token}`;

  const subject = language === "de"
    ? "Bitte bestätige deine Anmeldung — Dimissio"
    : "Please confirm your subscription — Dimissio";

  const body = language === "de"
    ? `Hallo,\n\nbitte bestätige deine Newsletter-Anmeldung bei Dimissio:\n\n${confirmUrl}\n\nFalls du dich nicht angemeldet hast, kannst du diese E-Mail ignorieren.\n\nViele Grüße,\nDimissio`
    : `Hi,\n\nplease confirm your newsletter subscription at Dimissio:\n\n${confirmUrl}\n\nIf you didn't sign up, you can safely ignore this email.\n\nBest,\nDimissio`;

  await resend.emails.send({
    from: "Dimissio <newsletter@dimissio.eu>",
    to: email,
    subject,
    text: body,
  });
}

export async function subscribeToNewsletter(formData: FormData): Promise<ActionResult> {
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(ip, { limit: 3, windowMs: 60 * 60 * 1000 });
  if (!rl.success) {
    return { success: false, error: "RATE_LIMITED" };
  }

  const parsed = subscribeSchema.safeParse({
    email: formData.get("email"),
    language: formData.get("language"),
    gdprConsent: formData.get("gdprConsent"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Validation failed" };
  }

  const { email, language } = parsed.data;

  const existing = await db.query.newsletterSubscribers.findFirst({
    where: eq(newsletterSubscribers.email, email),
  });

  if (existing) {
    if (existing.status === "active") {
      return { success: false, error: "ALREADY_SUBSCRIBED" };
    }

    // pending or unsubscribed — regenerate token and resend
    const token = generateToken();
    await db
      .update(newsletterSubscribers)
      .set({
        status: "pending",
        confirmationToken: token,
        language,
        unsubscribedAt: null,
      })
      .where(eq(newsletterSubscribers.id, existing.id));

    await sendConfirmationEmail(email, token, language);
    return { success: true };
  }

  // New subscriber
  const token = generateToken();
  await db.insert(newsletterSubscribers).values({
    email,
    language,
    confirmationToken: token,
    status: "pending",
  });

  await sendConfirmationEmail(email, token, language);
  return { success: true };
}

// ============================================================
// Admin: get subscribers
// ============================================================

export async function getSubscribers(
  status?: "pending" | "active" | "unsubscribed" | "bounced",
  page = 1,
  perPage = 50,
) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };

  const offset = (page - 1) * perPage;
  const where = status ? eq(newsletterSubscribers.status, status) : undefined;

  const [items, [total]] = await Promise.all([
    db
      .select()
      .from(newsletterSubscribers)
      .where(where)
      .orderBy(desc(newsletterSubscribers.createdAt))
      .limit(perPage)
      .offset(offset),
    db.select({ count: count() }).from(newsletterSubscribers).where(where),
  ]);

  // Stats
  const stats = await db
    .select({
      status: newsletterSubscribers.status,
      count: count(),
    })
    .from(newsletterSubscribers)
    .groupBy(newsletterSubscribers.status);

  return {
    success: true as const,
    data: items,
    total: total.count,
    stats: Object.fromEntries(stats.map((s) => [s.status, s.count])),
  };
}

// ============================================================
// Admin: send newsletter
// ============================================================

const sendSchema = z.object({
  subjectEn: z.string().min(1).max(200),
  subjectDe: z.string().min(1).max(200),
  layoffIds: z.array(z.string().uuid()).min(1),
});

export async function sendNewsletter(formData: FormData): Promise<ActionResult & { data?: { id: string } }> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" };

  const layoffIdStrings = formData.getAll("layoffIds") as string[];

  const parsed = sendSchema.safeParse({
    subjectEn: formData.get("subjectEn"),
    subjectDe: formData.get("subjectDe"),
    layoffIds: layoffIdStrings,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Validation failed" };
  }

  const { subjectEn, subjectDe, layoffIds: ids } = parsed.data;

  // Create issue
  const [issue] = await db
    .insert(newsletterIssues)
    .values({ subjectEn, subjectDe, layoffIds: ids, status: "draft" })
    .returning({ id: newsletterIssues.id });

  // Mark layoffs as published to newsletter
  await db
    .update(layoffs)
    .set({ publishedToNewsletter: true, updatedAt: new Date() })
    .where(inArray(layoffs.id, ids));

  // Build optional sponsor payload
  const sponsorHeadline = formData.get("sponsorHeadline") as string | null;
  const sponsorBody = formData.get("sponsorBody") as string | null;
  const sponsorUrl = formData.get("sponsorUrl") as string | null;
  const sponsor = sponsorHeadline && sponsorBody && sponsorUrl
    ? { headline: sponsorHeadline, body: sponsorBody, url: sponsorUrl }
    : undefined;

  // Enqueue send job
  await newsletterSendQueue.add("send", { issueId: issue.id, sponsor }, {
    removeOnComplete: 50,
    removeOnFail: 100,
  });

  return { success: true, data: { id: issue.id } };
}

// ============================================================
// Admin: get newsletter issues
// ============================================================

export async function getNewsletterIssues(page = 1, perPage = 25) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };

  const offset = (page - 1) * perPage;

  const items = await db
    .select()
    .from(newsletterIssues)
    .orderBy(desc(newsletterIssues.createdAt))
    .limit(perPage)
    .offset(offset);

  return { success: true as const, data: items };
}
