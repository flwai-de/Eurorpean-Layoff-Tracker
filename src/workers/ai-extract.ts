import { Worker, type Job } from "bullmq";
import { connection } from "@/lib/queue";
import { anthropic } from "@/lib/api/anthropic";
import { db } from "@/lib/db";
import {
  rssArticles,
  rssFeeds,
  layoffs,
  companies,
} from "@/lib/db/schema";
import { eq, and, sql, between } from "drizzle-orm";
import { generateSlug } from "@/lib/utils/slug";

// ============================================================
// System prompt
// ============================================================

const SYSTEM_PROMPT = `Du bist ein Daten-Extraktions-Assistent für einen europäischen Layoff-Tracker.

Analysiere den folgenden Nachrichtenartikel und bestimme:
1. Handelt es sich um einen Layoff / Stellenabbau / Massenentlassung?
2. Wenn ja, extrahiere die folgenden Felder als JSON.

Antworte ausschließlich mit validem JSON, kein anderer Text.

{
  "is_relevant": true/false,
  "reasoning": "Kurze Begründung in einem Satz",
  "data": {
    "company_name": "Exakter Firmenname",
    "affected_count": Zahl oder null,
    "affected_percentage": Zahl oder null,
    "total_employees": Zahl oder null,
    "country": "ISO 3166-1 Alpha-2 Code des Landes WO entlassen wird",
    "city": "Stadt oder null",
    "is_shutdown": true/false,
    "reason": "restructuring|cost_cutting|ai_replacement|market_downturn|merger|shutdown|other",
    "title_en": "Englische Überschrift, max 100 Zeichen",
    "title_de": "Deutsche Überschrift, max 100 Zeichen",
    "summary_en": "2-3 Sätze Zusammenfassung auf Englisch",
    "summary_de": "2-3 Sätze Zusammenfassung auf Deutsch",
    "severance_weeks": Zahl oder null,
    "date": "YYYY-MM-DD des Layoff-Datums"
  }
}

Regeln:
- Nur relevant markieren bei TATSÄCHLICHEN Entlassungen — nicht bei Gerüchten, geplanten Umstrukturierungen ohne Stellenabbau, oder Einstellungsstopps.
- "country" ist das Land wo entlassen wird, NICHT das HQ-Land der Firma.
- Bei mehreren Ländern: das Land mit den meisten Betroffenen nehmen.
- Bei unklaren Zahlen: lieber null als raten.
- is_relevant = false bei reinen Gewinnwarnungen, Aktienbewegungen, Analysteneinschätzungen oder Spekulationen.`;

// ============================================================
// Types
// ============================================================

interface ExtractPayload {
  articleId: string;
}

interface AiResponse {
  is_relevant: boolean;
  reasoning: string;
  data?: {
    company_name: string;
    affected_count: number | null;
    affected_percentage: number | null;
    total_employees: number | null;
    country: string;
    city: string | null;
    is_shutdown: boolean;
    reason: string;
    title_en: string;
    title_de: string;
    summary_en: string;
    summary_de: string;
    severance_weeks: number | null;
    date: string;
  };
}

// ============================================================
// JSON parsing (strips markdown fences, handles edge cases)
// ============================================================

function parseAiJson(text: string): AiResponse {
  // Strip markdown code fences
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }
  return JSON.parse(cleaned) as AiResponse;
}

// ============================================================
// Company lookup / creation
// ============================================================

async function findOrCreateCompany(
  companyName: string,
  countryCode: string,
): Promise<string> {
  // Case-insensitive lookup
  const existing = await db
    .select({ id: companies.id })
    .from(companies)
    .where(sql`LOWER(${companies.name}) = LOWER(${companyName})`)
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  // Create new company
  const slug = generateSlug(companyName);
  const [newCompany] = await db
    .insert(companies)
    .values({
      name: companyName,
      slug,
      industrySlug: "technology",
      countryHq: countryCode,
      companyType: "enterprise",
    })
    .onConflictDoNothing()
    .returning({ id: companies.id });

  // If slug conflict, fetch existing
  if (!newCompany) {
    const bySlug = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);
    if (bySlug.length > 0) return bySlug[0].id;
    throw new Error(`Failed to create or find company: ${companyName}`);
  }

  return newCompany.id;
}

// ============================================================
// Duplicate detection
// ============================================================

async function findDuplicateLayoff(
  companyId: string,
  date: string,
  affectedCount: number | null,
): Promise<string | null> {
  const conditions = [
    eq(layoffs.companyId, companyId),
    between(layoffs.date, sql`${date}::date - INTERVAL '7 days'`, sql`${date}::date + INTERVAL '7 days'`),
  ];

  if (affectedCount != null) {
    conditions.push(
      sql`(${layoffs.affectedCount} = ${affectedCount} OR ${layoffs.affectedCount} IS NULL)`,
    );
  }

  const existing = await db
    .select({ id: layoffs.id })
    .from(layoffs)
    .where(and(...conditions))
    .limit(1);

  return existing.length > 0 ? existing[0].id : null;
}

// ============================================================
// Main handler
// ============================================================

const VALID_REASONS = [
  "restructuring", "cost_cutting", "ai_replacement",
  "market_downturn", "merger", "shutdown", "other",
] as const;

async function handleExtract(job: Job<ExtractPayload>) {
  const { articleId } = job.data;

  // Load article with feed info
  const article = await db.query.rssArticles.findFirst({
    where: eq(rssArticles.id, articleId),
    with: { feed: true },
  });

  if (!article) {
    return { skipped: true, reason: "Article not found" };
  }

  if (article.processedAt) {
    return { skipped: true, reason: "Already processed" };
  }

  // Call Claude Haiku
  const userMessage = `Titel: ${article.title}\n\nInhalt:\n${article.rawContent ?? article.title}`;

  let aiResponse: AiResponse;
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text block in response");
    }

    aiResponse = parseAiJson(textBlock.text);
  } catch (error) {
    // JSON parse failure — mark as processed, don't retry
    if (error instanceof SyntaxError) {
      console.error(`[ai-extract] Invalid JSON for article "${article.title}":`, error.message);
      await db
        .update(rssArticles)
        .set({ processedAt: new Date() })
        .where(eq(rssArticles.id, articleId));
      return { articleId, error: "Invalid JSON from AI" };
    }
    // API errors (429, 500) — let BullMQ retry
    throw error;
  }

  // Update article with relevance info
  await db
    .update(rssArticles)
    .set({
      isRelevant: aiResponse.is_relevant,
      relevanceReasoning: aiResponse.reasoning,
      processedAt: new Date(),
    })
    .where(eq(rssArticles.id, articleId));

  // If not relevant, we're done
  if (!aiResponse.is_relevant || !aiResponse.data) {
    return { articleId, relevant: false, reasoning: aiResponse.reasoning };
  }

  const data = aiResponse.data;

  // Find or create company
  const companyId = await findOrCreateCompany(
    data.company_name,
    data.country ?? "DE",
  );

  // Duplicate check
  const duplicateId = await findDuplicateLayoff(
    companyId,
    data.date,
    data.affected_count,
  );

  if (duplicateId) {
    // Link article to existing layoff
    await db
      .update(rssArticles)
      .set({ layoffId: duplicateId })
      .where(eq(rssArticles.id, articleId));

    return { articleId, relevant: true, duplicate: true, layoffId: duplicateId };
  }

  // Validate reason
  const reason = VALID_REASONS.includes(data.reason as typeof VALID_REASONS[number])
    ? (data.reason as typeof VALID_REASONS[number])
    : null;

  // Create new layoff — ALWAYS unverified
  const [newLayoff] = await db
    .insert(layoffs)
    .values({
      companyId,
      date: data.date,
      affectedCount: data.affected_count,
      affectedPercentage: data.affected_percentage != null
        ? String(data.affected_percentage)
        : null,
      totalEmployeesAtTime: data.total_employees,
      country: data.country,
      city: data.city,
      isShutdown: data.is_shutdown ?? false,
      reason,
      severanceWeeks: data.severance_weeks,
      sourceUrl: article.url,
      sourceName: article.feed?.name ?? null,
      titleEn: data.title_en,
      titleDe: data.title_de,
      summaryEn: data.summary_en,
      summaryDe: data.summary_de,
      status: "unverified",
    })
    .returning({ id: layoffs.id });

  // Link article to new layoff
  await db
    .update(rssArticles)
    .set({ layoffId: newLayoff.id })
    .where(eq(rssArticles.id, articleId));

  console.log(
    `[ai-extract] Created unverified layoff for "${data.company_name}" (${data.affected_count ?? "?"} affected)`,
  );

  return { articleId, relevant: true, duplicate: false, layoffId: newLayoff.id };
}

// ============================================================
// Worker factory
// ============================================================

export function createAiExtractWorker() {
  const worker = new Worker(
    "ai-extract",
    async (job) => handleExtract(job as Job<ExtractPayload>),
    {
      connection,
      concurrency: 3,
      limiter: {
        max: 20,
        duration: 60_000,
      },
    },
  );

  worker.on("completed", (job) => {
    console.log(`[ai-extract] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[ai-extract] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
