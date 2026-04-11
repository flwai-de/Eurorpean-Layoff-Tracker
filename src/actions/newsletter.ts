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

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

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

function buildConfirmationHtml(confirmUrl: string, language: "de" | "en"): string {
  const isDE = language === "de";
  const tagline = isDE
    ? "Europas Layoff-Tracker"
    : "Europe&#39;s Layoff Tracker";
  const greeting = isDE ? "Hallo," : "Hi there,";
  const bodyText = isDE
    ? "vielen Dank f\u00fcr dein Interesse am dimissio Newsletter. Bitte best\u00e4tige deine Anmeldung, indem du auf den Button klickst:"
    : "thanks for signing up for the dimissio newsletter. Please confirm your subscription by clicking the button below:";
  const ctaText = isDE ? "Anmeldung best\u00e4tigen" : "Confirm Subscription";
  const disclaimer = isDE
    ? "Falls du dich nicht angemeldet hast, kannst du diese E-Mail einfach ignorieren."
    : "If you didn&#39;t sign up, you can safely ignore this email.";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-size:28px;font-weight:700;color:#2dd4bf;letter-spacing:-0.5px;">dimissio</span>
              <br/>
              <span style="font-size:13px;color:#888;">${tagline}</span>
            </td>
          </tr>
          <tr>
            <td style="background-color:#111;border:1px solid #2a2a2a;border-radius:8px;padding:32px;">
              <p style="margin:0 0 16px;font-size:15px;color:#fff;">${greeting}</p>
              <p style="margin:0 0 28px;font-size:14px;color:#ccc;line-height:1.6;">${bodyText}</p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${confirmUrl}" style="display:inline-block;background-color:#2dd4bf;color:#0a0a0a;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;padding:14px 32px;">${ctaText}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0;font-size:12px;color:#888;line-height:1.5;">${disclaimer}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <a href="https://dimissio.eu" style="font-size:12px;color:#555;text-decoration:none;">dimissio.eu</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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

  const textBody = language === "de"
    ? `Hallo,\n\nbitte bestätige deine Newsletter-Anmeldung bei Dimissio:\n\n${confirmUrl}\n\nFalls du dich nicht angemeldet hast, kannst du diese E-Mail ignorieren.\n\nViele Grüße,\nDimissio`
    : `Hi,\n\nplease confirm your newsletter subscription at Dimissio:\n\n${confirmUrl}\n\nIf you didn't sign up, you can safely ignore this email.\n\nBest,\nDimissio`;

  await getResend().emails.send({
    from: "Dimissio <newsletter@dimissio.eu>",
    to: email,
    subject,
    html: buildConfirmationHtml(confirmUrl, language),
    text: textBody,
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
