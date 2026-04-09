import { getCountryName } from "@/lib/utils/countries";

interface TemplateData {
  companyName: string;
  affectedCount: number | null;
  affectedPercentage: string | null;
  country: string;
  reason: string | null;
  industryName: string;
  sourceUrl: string;
  layoffId: string;
}

const SITE_URL = "https://dimissio.eu";

const REASON_LABELS: Record<string, string> = {
  restructuring: "Restructuring",
  cost_cutting: "Cost Cutting",
  ai_replacement: "AI Replacement",
  market_downturn: "Market Downturn",
  merger: "Merger/Acquisition",
  shutdown: "Shutdown",
  other: "Other",
};

function affectedText(data: TemplateData): string {
  if (data.affectedCount == null) return "";
  const pct = data.affectedPercentage
    ? ` (${Number(data.affectedPercentage)}%)`
    : "";
  return `${data.affectedCount.toLocaleString("en-US")}${pct}`;
}

function countryHashtag(code: string): string {
  const name = getCountryName(code, "en");
  return name.replace(/[^a-zA-Z]/g, "");
}

// ============================================================
// X/Twitter (max 280 chars, URLs count as 23)
// ============================================================

export function generateXPost(data: TemplateData): string {
  const countryName = getCountryName(data.country, "en");
  const reason = data.reason ? REASON_LABELS[data.reason] ?? data.reason : "";
  const affected = affectedText(data);
  const hashtag = countryHashtag(data.country);

  const affectedPart = affected ? ` lays off ${affected} employees` : " announces layoffs";
  const reasonLine = reason ? `\n\n${reason}` : "";
  const hashtagLine = `\n\n#layoffs #europe #${hashtag}`;

  // Source URL counts as 23 chars on X
  const sourceLine = `\n\nSource: ${data.sourceUrl}`;

  const base = `\u{1F6A8} ${data.companyName}${affectedPart} in ${countryName}${reasonLine}${sourceLine}${hashtagLine}`;

  // Truncate if needed (approximate: URL = 23 chars)
  if (base.length <= 280) return base;

  // Remove hashtags first, then reason
  const shorter = `\u{1F6A8} ${data.companyName}${affectedPart} in ${countryName}${sourceLine}`;
  if (shorter.length <= 280) return shorter;

  return shorter.slice(0, 277) + "...";
}

// ============================================================
// LinkedIn
// ============================================================

export function generateLinkedInPost(data: TemplateData): string {
  const countryName = getCountryName(data.country, "en");
  const reason = data.reason ? REASON_LABELS[data.reason] ?? data.reason : "Not specified";
  const affected = affectedText(data);
  const hashtag = countryHashtag(data.country);
  const layoffUrl = `${SITE_URL}/en/layoff/${data.layoffId}`;

  const affectedPart = affected
    ? `is laying off ${affected} employees`
    : "is announcing layoffs";

  return [
    `\u{1F4CA} European Layoff Update`,
    ``,
    `${data.companyName} ${affectedPart} in ${countryName}.`,
    ``,
    `Reason: ${reason}`,
    `Industry: ${data.industryName}`,
    ``,
    `Read more: ${layoffUrl}`,
    ``,
    `#Layoffs #EuropeanJobs #${data.industryName.replace(/[^a-zA-Z]/g, "")} #${hashtag}`,
  ].join("\n");
}

// ============================================================
// Reddit (title + body)
// ============================================================

export function generateRedditTitle(data: TemplateData): string {
  const countryName = getCountryName(data.country, "en");
  const affected = affectedText(data);

  if (affected) {
    return `${data.companyName} lays off ${affected} employees in ${countryName}`;
  }
  return `${data.companyName} announces layoffs in ${countryName}`;
}

export function generateRedditBody(data: TemplateData): string {
  const countryName = getCountryName(data.country, "en");
  const reason = data.reason ? REASON_LABELS[data.reason] ?? data.reason : "Not specified";
  const affected = affectedText(data);
  const layoffUrl = `${SITE_URL}/en/layoff/${data.layoffId}`;

  const affectedPart = affected
    ? `by ${affected} employees`
    : "";

  return [
    `**${data.companyName}** is reducing its workforce ${affectedPart} in ${countryName}.`,
    ``,
    `**Reason:** ${reason}`,
    `**Industry:** ${data.industryName}`,
    ``,
    `[Source](${data.sourceUrl}) | [Details on Dimissio](${layoffUrl})`,
  ].join("\n");
}
