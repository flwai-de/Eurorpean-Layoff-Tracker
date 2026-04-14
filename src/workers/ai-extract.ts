import { Worker, type Job } from "bullmq";
import { z } from "zod";
import { connection } from "@/lib/queue";
import { getAnthropic } from "@/lib/api/anthropic";
import { db } from "@/lib/db";
import { rssArticles, layoffs, companies } from "@/lib/db/schema";
import { eq, and, sql, between } from "drizzle-orm";
import { generateSlug } from "@/lib/utils/slug";
import { sendTelegramAlert, formatLayoffReady } from "@/lib/telegram";

// ============================================================
// System prompt — European layoff tracker with EU filter
// ============================================================

const SYSTEM_PROMPT = `Du bist ein Daten-Extraktions-Assistent für einen EUROPÄISCHEN Layoff-Tracker.

Analysiere den folgenden Nachrichtenartikel und bestimme:
1. Handelt es sich um einen tatsächlichen Layoff / Stellenabbau / Massenentlassung?
2. Hat der Layoff einen klaren Bezug zu Europa? (europäisches Land, europäische Stadt, europäischer Standort betroffen)
3. Wenn ja zu beiden, extrahiere die folgenden Felder als JSON.

Antworte ausschließlich mit validem JSON, kein anderer Text.

{
  "is_relevant": true/false,
  "reasoning": "Kurze Begründung in einem Satz",
  "data": {
    "company_name": "Exakter Firmenname",
    "affected_count": Zahl oder null,
    "affected_percentage": Zahl oder null,
    "total_employees": Zahl oder null,
    "country": "ISO 3166-1 Alpha-2 Code des EUROPÄISCHEN Landes wo entlassen wird",
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
- is_relevant = false wenn der Artikel KEINEN klaren Bezug zu Europa hat.
  Beispiel: "Meta lays off 20% globally" → relevant nur wenn europäische Standorte explizit erwähnt werden.
  Beispiel: "Pinterest cuts 15% of staff" ohne Erwähnung europäischer Offices → is_relevant = false mit reasoning "No European connection identified".
- is_relevant = false bei reinen US/Asien-Layoffs ohne europäischen Bezug.
- Nur relevant markieren bei TATSÄCHLICHEN Entlassungen — nicht bei Gerüchten,
  geplanten Umstrukturierungen ohne Stellenabbau, oder Einstellungsstopps.
- is_relevant = false bei Meinungsartikeln, Analysen, Rückblicken oder "Lessons Learned"-Artikeln über vergangene Layoffs.
- "country" ist das europäische Land wo entlassen wird, NICHT das HQ-Land der Firma.
- Bei mehreren europäischen Ländern: das Land mit den meisten Betroffenen nehmen.
- Bei unklaren Zahlen: lieber null als raten.
- is_relevant = false bei reinen Gewinnwarnungen, Aktienbewegungen,
  Analysteneinschätzungen oder Spekulationen.
- Europäische Länder umfassen: alle EU-Mitgliedsstaaten, UK, Schweiz, Norwegen, Island, Liechtenstein, Westbalkan, Ukraine, Moldau, Türkei.`;

// ============================================================
// Zod schema for AI response validation
// ============================================================

const REASON_VALUES = [
  "restructuring",
  "cost_cutting",
  "ai_replacement",
  "market_downturn",
  "merger",
  "shutdown",
  "other",
] as const;

const AiDataSchema = z.object({
  company_name: z.string().min(1),
  affected_count: z.number().int().nullable(),
  affected_percentage: z.number().nullable(),
  total_employees: z.number().int().nullable(),
  country: z.string().length(2),
  city: z.string().nullable(),
  is_shutdown: z.boolean(),
  reason: z.enum(REASON_VALUES).or(z.string()),
  title_en: z.string().min(1).max(200),
  title_de: z.string().min(1).max(200),
  summary_en: z.string().min(1),
  summary_de: z.string().min(1),
  severance_weeks: z.number().int().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const AiResponseSchema = z.object({
  is_relevant: z.boolean(),
  reasoning: z.string(),
  data: AiDataSchema.optional().nullable(),
});

type AiResponse = z.infer<typeof AiResponseSchema>;

// ============================================================
// JSON parsing (strips markdown fences) + Zod validation
// ============================================================

function parseAiJson(text: string): AiResponse {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }
  const raw: unknown = JSON.parse(cleaned);
  return AiResponseSchema.parse(raw);
}

// ============================================================
// Company lookup / creation
// ============================================================

async function findOrCreateCompany(
  companyName: string,
  countryCode: string,
): Promise<string> {
  const existing = await db
    .select({ id: companies.id })
    .from(companies)
    .where(sql`LOWER(${companies.name}) = LOWER(${companyName})`)
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

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
// Duplicate detection — same company, ±7 days, status != rejected
// ============================================================

async function findDuplicateLayoff(
  companyId: string,
  date: string,
): Promise<string | null> {
  const existing = await db
    .select({ id: layoffs.id })
    .from(layoffs)
    .where(
      and(
        eq(layoffs.companyId, companyId),
        between(
          layoffs.date,
          sql`${date}::date - INTERVAL '7 days'`,
          sql`${date}::date + INTERVAL '7 days'`,
        ),
        sql`${layoffs.status} != 'rejected'`,
      ),
    )
    .limit(1);

  return existing.length > 0 ? existing[0].id : null;
}

// ============================================================
// Main handler
// ============================================================

interface ExtractPayload {
  articleId: string;
}

async function handleExtract(job: Job<ExtractPayload>) {
  const { articleId } = job.data;

  // Graceful degradation when API key missing — log + mark processed, skip.
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "[ai-extract] ANTHROPIC_API_KEY not set — cannot enrich articles, skipping",
    );
    await db
      .update(rssArticles)
      .set({
        processedAt: new Date(),
        relevanceReasoning: "Skipped: ANTHROPIC_API_KEY not configured",
      })
      .where(eq(rssArticles.id, articleId));
    return { skipped: true, reason: "ANTHROPIC_API_KEY missing" };
  }

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

  const userMessage = `Titel: ${article.title}\n\nQuelle: ${article.url}\n\nInhalt:\n${article.rawContent ?? article.title}`;

  let aiResponse: AiResponse;
  try {
    const response = await getAnthropic().messages.create({
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
    const isInvalidJson =
      error instanceof SyntaxError || error instanceof z.ZodError;
    if (isInvalidJson) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(
        `[ai-extract] Invalid AI response for article "${article.title}": ${msg}`,
      );
      await db
        .update(rssArticles)
        .set({
          isRelevant: false,
          relevanceReasoning: `Invalid AI response: ${msg.slice(0, 200)}`,
          processedAt: new Date(),
        })
        .where(eq(rssArticles.id, articleId));
      return { articleId, error: "Invalid AI response" };
    }
    // API-side failures (429, 500) — let BullMQ retry
    throw error;
  }

  // Not relevant (no European connection, speculation, duplicate topic, etc.)
  if (!aiResponse.is_relevant || !aiResponse.data) {
    await db
      .update(rssArticles)
      .set({
        isRelevant: false,
        relevanceReasoning: aiResponse.reasoning,
        processedAt: new Date(),
      })
      .where(eq(rssArticles.id, articleId));
    return { articleId, relevant: false, reasoning: aiResponse.reasoning };
  }

  const data = aiResponse.data;

  const companyId = await findOrCreateCompany(data.company_name, data.country);

  const duplicateId = await findDuplicateLayoff(companyId, data.date);
  if (duplicateId) {
    await db
      .update(rssArticles)
      .set({
        isRelevant: false,
        relevanceReasoning: "Duplicate of existing layoff",
        layoffId: duplicateId,
        processedAt: new Date(),
      })
      .where(eq(rssArticles.id, articleId));
    return {
      articleId,
      relevant: true,
      duplicate: true,
      layoffId: duplicateId,
    };
  }

  const reason = (REASON_VALUES as readonly string[]).includes(data.reason)
    ? (data.reason as (typeof REASON_VALUES)[number])
    : null;

  const [newLayoff] = await db
    .insert(layoffs)
    .values({
      companyId,
      date: data.date,
      affectedCount: data.affected_count,
      affectedPercentage:
        data.affected_percentage != null
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

  await db
    .update(rssArticles)
    .set({
      isRelevant: true,
      relevanceReasoning: aiResponse.reasoning,
      layoffId: newLayoff.id,
      processedAt: new Date(),
    })
    .where(eq(rssArticles.id, articleId));

  // Second-stage Telegram alert: LLM-verified + European
  await sendTelegramAlert(
    formatLayoffReady({
      layoffId: newLayoff.id,
      companyName: data.company_name,
      affectedCount: data.affected_count,
      country: data.country,
      reason,
    }),
  );

  console.log(
    `[ai-extract] Created unverified layoff for "${data.company_name}" (${data.affected_count ?? "?"} affected in ${data.country})`,
  );

  return {
    articleId,
    relevant: true,
    duplicate: false,
    layoffId: newLayoff.id,
  };
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
