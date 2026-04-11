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
  reason: string | null;
  companyName: string;
  industrySlug: string;
  titleEn: string | null;
  titleDe: string | null;
  summaryEn: string | null;
  summaryDe: string | null;
}

const COUNTRY_FLAGS: Record<string, string> = {
  DE: "\ud83c\udde9\ud83c\uddea", AT: "\ud83c\udde6\ud83c\uddf9", CH: "\ud83c\udde8\ud83c\udded",
  FR: "\ud83c\uddeb\ud83c\uddf7", NL: "\ud83c\uddf3\ud83c\uddf1", BE: "\ud83c\udde7\ud83c\uddea",
  ES: "\ud83c\uddea\ud83c\uddf8", IT: "\ud83c\uddee\ud83c\uddf9", PT: "\ud83c\uddf5\ud83c\uddf9",
  GB: "\ud83c\uddec\ud83c\udde7", IE: "\ud83c\uddee\ud83c\uddea", SE: "\ud83c\uddf8\ud83c\uddea",
  NO: "\ud83c\uddf3\ud83c\uddf4", DK: "\ud83c\udde9\ud83c\uddf0", FI: "\ud83c\uddeb\ud83c\uddee",
  PL: "\ud83c\uddf5\ud83c\uddf1", CZ: "\ud83c\udde8\ud83c\uddff", RO: "\ud83c\uddf7\ud83c\uddf4",
  HU: "\ud83c\udded\ud83c\uddfa", GR: "\ud83c\uddec\ud83c\uddf7", LU: "\ud83c\uddf1\ud83c\uddfa",
};

const REASON_LABELS: Record<string, { de: string; en: string }> = {
  restructuring: { de: "Restrukturierung", en: "Restructuring" },
  cost_cutting: { de: "Kostensenkung", en: "Cost Cutting" },
  ai_replacement: { de: "KI-Ersatz", en: "AI Replacement" },
  market_downturn: { de: "Marktabschwung", en: "Market Downturn" },
  merger: { de: "Fusion", en: "Merger" },
  shutdown: { de: "Schließung", en: "Shutdown" },
  other: { de: "Sonstiges", en: "Other" },
};

function generateHtml(
  issue: { subjectEn: string; subjectDe: string },
  layoffData: LayoffData[],
  language: "de" | "en",
  email: string,
  sponsor?: SponsorData,
): string {
  const isDE = language === "de";
  const unsubUrl = `${SITE_URL}/api/public/newsletter/unsubscribe?email=${Buffer.from(email).toString("base64")}`;
  const webUrl = `${SITE_URL}/${language}`;

  const totalAffected = layoffData.reduce((sum, l) => sum + (l.affectedCount ?? 0), 0);
  const heroStat = totalAffected > 0 ? totalAffected.toLocaleString(isDE ? "de-DE" : "en-US") : "?";
  const heroSubtext = isDE
    ? `Betroffene in ${layoffData.length} Entlassungen`
    : `people affected across ${layoffData.length} layoffs`;

  const now = new Date();
  const dateStr = now.toLocaleDateString(isDE ? "de-DE" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  const viewOnWeb = isDE ? "Im Browser ansehen" : "View on web";
  const sectionTitle = isDE ? "\ud83d\udcca Entlassungen dieser Woche" : "\ud83d\udcca This Week&#39;s Layoffs";
  const submitCta = isDE ? "Tipp einreichen" : "Submit a Tip";
  const submitText = isDE
    ? "Kennst du eine Entlassung, die wir verpasst haben?"
    : "Know about a layoff we missed?";

  const layoffCards = layoffData.map((l) => {
    const summary = isDE ? (l.summaryDe ?? l.summaryEn ?? "") : (l.summaryEn ?? l.summaryDe ?? "");
    const detailUrl = `${SITE_URL}/${language}/layoff/${l.id}`;
    const flag = COUNTRY_FLAGS[l.country] ?? "";
    const affectedStr = l.affectedCount
      ? l.affectedCount.toLocaleString(isDE ? "de-DE" : "en-US") + (isDE ? " Betroffene" : " affected")
      : "";
    const reasonLabel = l.reason ? REASON_LABELS[l.reason]?.[language] ?? l.reason : "";
    const industryLabel = escapeHtml(l.industrySlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
    const readDetails = isDE ? "Details lesen \u2192" : "Read details \u2192";
    const jobsLabel = isDE ? `Jobs bei ${escapeHtml(l.companyName)} \u2192` : `Jobs at ${escapeHtml(l.companyName)} \u2192`;
    const jobsUrl = `https://www.stepstone.de/jobs/${encodeURIComponent(l.companyName)}?utm_source=dimissio&amp;utm_medium=newsletter&amp;utm_campaign=affiliate`;

    const metaParts: string[] = [];
    if (flag) metaParts.push(`${flag} ${escapeHtml(l.country)}`);
    if (affectedStr) metaParts.push(`<span style="color:#f87171;font-weight:600;">${affectedStr}</span>`);
    if (reasonLabel) metaParts.push(escapeHtml(reasonLabel));

    return `<tr><td style="padding:0 0 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#111;border:1px solid #2a2a2a;border-radius:8px;">
        <tr><td style="padding:20px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-size:16px;font-weight:700;color:#fff;">${escapeHtml(l.companyName)}</td>
            <td align="right"><span style="display:inline-block;background-color:#1a2e2a;color:#2dd4bf;font-size:11px;font-weight:600;padding:3px 10px;border-radius:12px;">${industryLabel}</span></td>
          </tr></table>
          ${summary ? `<p style="margin:10px 0 0;font-size:13px;color:#ccc;line-height:1.5;">${escapeHtml(summary)}</p>` : ""}
          <p style="margin:12px 0 0;font-size:12px;color:#888;">${metaParts.join(" &nbsp;\u00b7&nbsp; ")}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;border-top:1px solid #2a2a2a;padding-top:12px;">
            <tr>
              <td><a href="${detailUrl}" style="font-size:13px;color:#2dd4bf;text-decoration:none;font-weight:500;">${readDetails}</a></td>
              <td align="right"><a href="${jobsUrl}" style="font-size:13px;color:#888;text-decoration:none;">${jobsLabel}</a></td>
            </tr>
          </table>
        </td></tr>
      </table>
    </td></tr>`;
  }).join("");

  const sponsorBlock = sponsor ? `<tr><td style="padding:0 0 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#111;border:1px solid #2a2a2a;border-radius:8px;">
      <tr><td style="padding:20px;">
        <p style="color:#888;font-size:10px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">SPONSORED</p>
        <p style="color:#fff;font-size:15px;font-weight:600;margin:0 0 8px;">${escapeHtml(sponsor.headline)}</p>
        <p style="color:#ccc;font-size:13px;margin:0 0 14px;line-height:1.5;">${escapeHtml(sponsor.body)}</p>
        <a href="${escapeHtml(sponsor.url)}" style="color:#2dd4bf;font-size:13px;text-decoration:none;font-weight:500;">Learn more \u2192</a>
      </td></tr>
    </table>
  </td></tr>` : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;">
    <tr><td align="center" style="padding:0 16px;">
      <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">

        <!-- Header -->
        <tr><td style="padding:40px 0 24px;" align="center">
          <span style="font-size:28px;font-weight:700;color:#2dd4bf;letter-spacing:-0.5px;">dimissio</span>
          <br/>
          <span style="font-size:13px;color:#888;">${isDE ? "Europas Layoff-Tracker" : "Europe&#39;s Layoff Tracker"}</span>
          <br/>
          <span style="font-size:12px;color:#555;margin-top:8px;display:inline-block;">${dateStr} &nbsp;&middot;&nbsp; <a href="${webUrl}" style="color:#555;text-decoration:underline;">${viewOnWeb}</a></span>
        </td></tr>

        <!-- Hero Stat -->
        <tr><td align="center" style="padding:24px 0 32px;">
          <span style="font-size:48px;font-weight:800;color:#fff;letter-spacing:-1px;">${heroStat}</span>
          <br/>
          <span style="font-size:14px;color:#888;">${heroSubtext}</span>
        </td></tr>

        <!-- Sponsor -->
        ${sponsorBlock}

        <!-- Section Title -->
        <tr><td style="padding:0 0 16px;">
          <p style="margin:0;font-size:18px;font-weight:700;color:#fff;">${sectionTitle}</p>
        </td></tr>

        <!-- Layoff Cards -->
        ${layoffCards}

        <!-- Submit CTA -->
        <tr><td align="center" style="padding:32px 0;">
          <p style="margin:0 0 16px;font-size:14px;color:#888;">${submitText}</p>
          <a href="${SITE_URL}/${language}/submit" style="display:inline-block;background-color:#2dd4bf;color:#0a0a0a;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;padding:12px 28px;">${submitCta}</a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 0;border-top:1px solid #2a2a2a;text-align:center;">
          <p style="margin:0 0 8px;">
            <a href="${SITE_URL}" style="font-size:12px;color:#555;text-decoration:none;">dimissio.eu</a>
          </p>
          <p style="margin:0;">
            <a href="${unsubUrl}" style="font-size:12px;color:#555;text-decoration:underline;">${isDE ? "Newsletter abbestellen" : "Unsubscribe"}</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
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
      reason: layoffs.reason,
      titleEn: layoffs.titleEn,
      titleDe: layoffs.titleDe,
      summaryEn: layoffs.summaryEn,
      summaryDe: layoffs.summaryDe,
      companyName: companies.name,
      industrySlug: companies.industrySlug,
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
