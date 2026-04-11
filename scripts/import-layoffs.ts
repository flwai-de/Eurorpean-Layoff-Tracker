import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { companies, layoffs } from "../src/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import * as XLSX from "xlsx";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const client = postgres(connectionString);
const db = drizzle(client);

// ============================================================
// Mappings
// ============================================================

const INDUSTRY_MAP: Record<string, string> = {
  "Technology": "technology",
  "SaaS": "saas",
  "FinTech": "fintech",
  "E-Commerce": "ecommerce",
  "Gaming": "gaming",
  "Automotive": "automotive",
  "Electric Vehicles": "ev",
  "Finance & Banking": "finance",
  "Manufacturing": "manufacturing",
  "Energy": "energy",
  "Healthcare": "healthcare",
  "Logistics": "logistics",
  "Retail": "retail",
  "Media & Entertainment": "media",
  "Telecom": "telecom",
  "Consulting": "consulting",
  "Real Estate": "real_estate",
  "Travel & Hospitality": "travel",
  "Education": "education",
  "Pharma & Biotech": "pharma",
  "Defense & Aerospace": "defense",
  "Other": "technology",
};

// ============================================================
// Helpers
// ============================================================

const TRANSLITERATION: Record<string, string> = {
  "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss",
  "Ä": "Ae", "Ö": "Oe", "Ü": "Ue",
  "à": "a", "á": "a", "â": "a", "ã": "a", "å": "a",
  "è": "e", "é": "e", "ê": "e", "ë": "e",
  "ì": "i", "í": "i", "î": "i", "ï": "i",
  "ò": "o", "ó": "o", "ô": "o", "õ": "o",
  "ù": "u", "ú": "u", "û": "u",
  "ý": "y", "ÿ": "y",
  "ñ": "n", "ç": "c", "ð": "d", "þ": "th",
  "Ø": "O", "ø": "o", "Æ": "Ae", "æ": "ae",
  "Đ": "D", "đ": "d", "ł": "l", "Ł": "L",
  "ń": "n", "ś": "s", "ź": "z", "ż": "z",
  "č": "c", "ř": "r", "š": "s", "ž": "z", "ě": "e", "ů": "u",
  "ă": "a", "ș": "s", "ț": "t",
};

function transliterate(text: string): string {
  return text.replace(/[^\x00-\x7F]/g, (ch) => TRANSLITERATION[ch] ?? "");
}

function slugify(name: string): string {
  return transliterate(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

interface ExcelRow {
  "#": number;
  "Firma": string;
  "Datum (YYYY-MM-DD)": string | number;
  "Betroffene (Zahl)": number | null;
  "% der Belegschaft": number | null;
  "Land der Entlassungen": string;
  "HQ-Land (ISO)": string;
  "Branche": string;
  "Quelle (URL)": string;
}

// ============================================================
// Main
// ============================================================

async function main() {
  const wb = XLSX.readFile("entlassungen_europa.xlsx");
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<ExcelRow>(ws);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  await db.transaction(async (tx) => {
    for (const row of rows) {
      const companyName = String(row["Firma"]).trim();
      if (!companyName) {
        errors++;
        console.error(`Row ${row["#"]}: missing company name`);
        continue;
      }

      // Parse date — xlsx may return a serial number
      let dateStr: string;
      const rawDate = row["Datum (YYYY-MM-DD)"];
      if (typeof rawDate === "number") {
        const parsed = XLSX.SSF.parse_date_code(rawDate);
        dateStr = `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
      } else {
        dateStr = String(rawDate).trim();
      }

      const affectedCount = row["Betroffene (Zahl)"] ? Number(row["Betroffene (Zahl)"]) : null;
      const rawPct = row["% der Belegschaft"];
      const affectedPercentage = rawPct != null ? String((Number(rawPct) * 100).toFixed(2)) : null;
      const country = String(row["Land der Entlassungen"]).trim().toUpperCase();
      const countryHq = String(row["HQ-Land (ISO)"]).trim().toUpperCase();
      const industry = String(row["Branche"]).trim();
      const sourceUrl = String(row["Quelle (URL)"]).trim();
      const industrySlug = INDUSTRY_MAP[industry] ?? "technology";

      try {
        // Company upsert
        const existing = await tx
          .select({ id: companies.id })
          .from(companies)
          .where(sql`LOWER(${companies.name}) = LOWER(${companyName})`)
          .limit(1);

        let companyId: string;

        if (existing.length > 0) {
          companyId = existing[0].id;
        } else {
          // Check if slug already exists (different company name, same slug)
          let slug = slugify(companyName);
          const slugExists = await tx
            .select({ id: companies.id })
            .from(companies)
            .where(eq(companies.slug, slug))
            .limit(1);

          if (slugExists.length > 0) {
            // Slug collision with a different company name — use existing company
            companyId = slugExists[0].id;
          } else {
            const [newCompany] = await tx
              .insert(companies)
              .values({
                name: companyName,
                slug,
                industrySlug,
                countryHq,
                companyType: "enterprise",
              })
              .returning({ id: companies.id });
            companyId = newCompany.id;
          }
        }

        // Duplicate check: same company + date ±7 days + affected_count ±10%
        const minDate = addDays(dateStr, -7);
        const maxDate = addDays(dateStr, 7);

        const dupeConditions = [
          eq(layoffs.companyId, companyId),
          gte(layoffs.date, minDate),
          lte(layoffs.date, maxDate),
        ];

        const dupes = await tx
          .select({ id: layoffs.id, affectedCount: layoffs.affectedCount })
          .from(layoffs)
          .where(and(...dupeConditions));

        const isDuplicate = dupes.some((d) => {
          if (affectedCount == null || d.affectedCount == null) return true;
          const diff = Math.abs(d.affectedCount - affectedCount);
          return diff <= affectedCount * 0.1;
        });

        if (isDuplicate) {
          skipped++;
          continue;
        }

        // Insert layoff
        await tx.insert(layoffs).values({
          companyId,
          date: dateStr,
          affectedCount,
          affectedPercentage,
          country,
          sourceUrl,
          sourceName: extractDomain(sourceUrl),
          titleEn: affectedCount
            ? `${companyName} to cut ${affectedCount.toLocaleString("en-US")} jobs`
            : `${companyName} announces layoffs`,
          titleDe: affectedCount
            ? `${companyName} streicht ${affectedCount.toLocaleString("de-DE")} Stellen`
            : `${companyName} kündigt Entlassungen an`,
          status: "unverified",
          reason: "restructuring",
          isShutdown: false,
        });

        inserted++;
      } catch (err) {
        errors++;
        console.error(`Row ${row["#"]} (${companyName}):`, err instanceof Error ? err.message : err);
      }
    }
  });

  console.log(`\nImport complete: ${inserted} inserted, ${skipped} skipped, ${errors} errors (total rows: ${rows.length})`);
  await client.end();
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
