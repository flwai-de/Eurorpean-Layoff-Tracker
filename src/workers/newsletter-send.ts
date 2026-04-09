import { Worker, type Job } from "bullmq";
import { Resend } from "resend";
import { connection } from "@/lib/queue";
import { db } from "@/lib/db";
import {
  newsletterIssues,
  newsletterSubscribers,
  layoffs,
  companies,
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

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

const SITE_URL = "https://dimissio.eu";
const BATCH_SIZE = 100;

interface SponsorData {
  headline: string;
  body: string;
  url: string;
}

interface SendPayload {
  issueId: string;
  sponsor?: SponsorData;
}

interface LayoffData {
  id: string;
  date: string;
  affectedCount: number | null;
  country: string;
  companyName: string;
  titleEn: string | null;
  titleDe: string | null;
  summaryEn: string | null;
  summaryDe: string | null;
}

function generateHtml(
  issue: { subjectEn: string; subjectDe: string },
  layoffData: LayoffData[],
  language: "de" | "en",
  email: string,
  sponsor?: SponsorData,
): string {
  const subject = language === "de" ? issue.subjectDe : issue.subjectEn;
  const unsubUrl = `${SITE_URL}/api/public/newsletter/unsubscribe?email=${Buffer.from(email).toString("base64")}`;
  const intro = language === "de"
    ? `Diese Woche in Europa: ${layoffData.length} neue Entlassungen`
    : `This week in Europe: ${layoffData.length} new layoffs`;

  const layoffRows = layoffData.map((l) => {
    const title = language === "de" ? (l.titleDe ?? l.titleEn ?? l.companyName) : (l.titleEn ?? l.titleDe ?? l.companyName);
    const summary = language === "de" ? (l.summaryDe ?? l.summaryEn ?? "") : (l.summaryEn ?? l.summaryDe ?? "");
    const affected = l.affectedCount ? ` \u2014 ${l.affectedCount.toLocaleString()} ${language === "de" ? "Betroffene" : "affected"}` : "";
    const url = `${SITE_URL}/${language}/layoff/${l.id}`;

    return `
      <tr>
        <td style="padding: 16px 0; border-bottom: 1px solid #333;">
          <a href="${url}" style="color: #2dd4bf; text-decoration: none; font-weight: 600; font-size: 15px;">
            ${escapeHtml(l.companyName)}${affected}
          </a>
          <div style="margin-top: 4px; font-size: 13px; color: #a3a3a3;">
            ${escapeHtml(title)}
          </div>
          ${summary ? `<div style="margin-top: 6px; font-size: 13px; color: #d4d4d4;">${escapeHtml(summary)}</div>` : ""}
        </td>
      </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background-color:#0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:0 auto; padding: 32px 24px;">
    <tr>
      <td style="padding-bottom: 24px; border-bottom: 1px solid #333;">
        <h1 style="margin:0; font-size: 24px; color: #fff;">dimissio</h1>
        <p style="margin: 8px 0 0; font-size: 13px; color: #a3a3a3;">${escapeHtml(subject)}</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px 0;">
        <p style="margin: 0; font-size: 15px; color: #d4d4d4;">${escapeHtml(intro)}</p>
      </td>
    </tr>${sponsor ? `
    <tr>
      <td style="padding: 0 0 24px;">
        <div style="background: #1a1a2e; border: 1px solid #333; border-radius: 8px; padding: 16px;">
          <p style="color: #888; font-size: 11px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">SPONSORED</p>
          <p style="color: #fff; font-size: 14px; margin: 0 0 8px;">${escapeHtml(sponsor.headline)}</p>
          <p style="color: #ccc; font-size: 13px; margin: 0 0 12px;">${escapeHtml(sponsor.body)}</p>
          <a href="${escapeHtml(sponsor.url)}" style="color: #2dd4bf; font-size: 13px; text-decoration: none;">Learn more \u2192</a>
        </div>
      </td>
    </tr>` : ""}
    <tr>
      <td>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${layoffRows}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding-top: 32px; border-top: 1px solid #333; font-size: 12px; color: #737373; text-align: center;">
        <p style="margin: 0;">
          <a href="${SITE_URL}" style="color: #737373; text-decoration: none;">dimissio.eu</a>
        </p>
        <p style="margin: 8px 0 0;">
          <a href="${unsubUrl}" style="color: #737373; text-decoration: underline;">
            ${language === "de" ? "Newsletter abbestellen" : "Unsubscribe"}
          </a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function handleSend(job: Job<SendPayload>) {
  const { issueId, sponsor } = job.data;

  const issue = await db.query.newsletterIssues.findFirst({
    where: eq(newsletterIssues.id, issueId),
  });

  if (!issue) {
    return { skipped: true, reason: "Issue not found" };
  }

  if (issue.status === "sent") {
    return { skipped: true, reason: "Already sent" };
  }

  // Load layoff data
  const layoffData = await db
    .select({
      id: layoffs.id,
      date: layoffs.date,
      affectedCount: layoffs.affectedCount,
      country: layoffs.country,
      titleEn: layoffs.titleEn,
      titleDe: layoffs.titleDe,
      summaryEn: layoffs.summaryEn,
      summaryDe: layoffs.summaryDe,
      companyName: companies.name,
    })
    .from(layoffs)
    .innerJoin(companies, eq(layoffs.companyId, companies.id))
    .where(inArray(layoffs.id, issue.layoffIds));

  // Load active subscribers
  const subscribers = await db
    .select({ id: newsletterSubscribers.id, email: newsletterSubscribers.email, language: newsletterSubscribers.language })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.status, "active"));

  if (subscribers.length === 0) {
    await db
      .update(newsletterIssues)
      .set({ status: "sent", sentAt: new Date(), recipientCount: 0 })
      .where(eq(newsletterIssues.id, issueId));
    return { issueId, sent: 0 };
  }

  // Group by language
  const deSubs = subscribers.filter((s) => s.language === "de");
  const enSubs = subscribers.filter((s) => s.language === "en");

  let totalSent = 0;

  // Send in batches
  for (const group of [
    { subs: deSubs, lang: "de" as const },
    { subs: enSubs, lang: "en" as const },
  ]) {
    for (let i = 0; i < group.subs.length; i += BATCH_SIZE) {
      const batch = group.subs.slice(i, i + BATCH_SIZE);
      const subject = group.lang === "de" ? issue.subjectDe : issue.subjectEn;

      await getResend().batch.send(
        batch.map((sub) => ({
          from: "Dimissio <newsletter@dimissio.eu>",
          to: sub.email,
          subject,
          html: generateHtml(issue, layoffData, group.lang, sub.email, sponsor),
        })),
      );

      totalSent += batch.length;
    }
  }

  // Update issue
  await db
    .update(newsletterIssues)
    .set({ status: "sent", sentAt: new Date(), recipientCount: totalSent })
    .where(eq(newsletterIssues.id, issueId));

  console.log(`[newsletter-send] Sent issue ${issueId} to ${totalSent} subscribers`);
  return { issueId, sent: totalSent };
}

export function createNewsletterSendWorker() {
  const worker = new Worker(
    "newsletter-send",
    async (job) => handleSend(job as Job<SendPayload>),
    {
      connection,
      concurrency: 1,
    },
  );

  worker.on("completed", (job) => {
    console.log(`[newsletter-send] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[newsletter-send] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
