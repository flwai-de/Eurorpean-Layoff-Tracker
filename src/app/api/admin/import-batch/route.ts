import { NextResponse } from "next/server";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { companies, layoffs } from "@/lib/db/schema";
import { generateSlug } from "@/lib/utils/slug";

interface LayoffInput {
  company: string;
  date: string;
  affected: number;
  percentage: string | null;
  country: string;
  countryHq: string;
  industry: string;
  source: string;
}

const LAYOFFS: LayoffInput[] = [
  { company: "TSB Bank", date: "2024-05-08", affected: 250, percentage: "5.00", country: "GB", countryHq: "GB", industry: "finance", source: "https://www.reuters.com/business/finance/sabadells-uk-arm-tsb-plans-fresh-job-cuts-branch-closures-2024-05-08/" },
  { company: "Metso", date: "2024-05-06", affected: 240, percentage: null, country: "WW", countryHq: "FI", industry: "manufacturing", source: "https://www.reuters.com/markets/commodities/finlands-metso-cut-240-jobs-minerals-business-2024-05-06/" },
  { company: "thyssenkrupp Schulte", date: "2024-04-24", affected: 450, percentage: "20.00", country: "DE", countryHq: "DE", industry: "manufacturing", source: "https://www.n-tv.de/wirtschaft/Thyssenkrupp-Schulte-streicht-450-Stellen-in-Deutschland-article24898711.html" },
  { company: "Umicore", date: "2024-06-18", affected: 140, percentage: "14.00", country: "DE", countryHq: "BE", industry: "automotive", source: "https://hr.economictimes.indiatimes.com/news/workplace-4-0/talent-management/umicore-to-cut-14-of-workforce-at-its-largest-german-site-121031960" },
  { company: "Casino Guichard-Perrachon", date: "2024-04-24", affected: 1293, percentage: null, country: "FR", countryHq: "FR", industry: "retail", source: "https://www.reuters.com/business/retail-consumer/retailer-casino-cut-between-1293-3267-jobs-part-reorganization-2024-04-24/" },
  { company: "Haleon", date: "2024-04-30", affected: 435, percentage: null, country: "GB", countryHq: "GB", industry: "healthcare", source: "https://www.itv.com/news/meridian/2024-04-30/435-jobs-to-go-at-sensodyne-maker-haleon-as-it-plans-to-shut-uk-factory" },
  { company: "Ted Baker", date: "2024-04-08", affected: 245, percentage: null, country: "GB", countryHq: "GB", industry: "retail", source: "https://www.rte.ie/news/business/2024/0408/1452853-ted-baker-to-shut-15-uk-stores-250-jobs-at-risk/" },
  { company: "Telenor", date: "2024-04-03", affected: 100, percentage: null, country: "NO", countryHq: "NO", industry: "telecom", source: "https://www.reuters.com/business/media-telecom/telenor-cut-around-100-jobs-norway-part-reorganisation-2024-04-03/" },
  { company: "Vodafone Spain", date: "2024-06-12", affected: 1198, percentage: "36.00", country: "ES", countryHq: "GB", industry: "telecom", source: "https://www.advanced-television.com/2024/06/13/zegona-to-cut-1198-vodafone-spain-jobs/" },
  { company: "Bouygues Immobilier", date: "2024-04-08", affected: 225, percentage: "21.00", country: "FR", countryHq: "FR", industry: "real_estate", source: "https://www.reuters.com/markets/europe/bouygues-immobilier-plans-layoffs-construction-market-weakens-2024-04-08/" },
  { company: "Novartis", date: "2024-04-09", affected: 440, percentage: null, country: "CH", countryHq: "CH", industry: "pharma", source: "https://www.reuters.com/business/world-at-work/novartis-cut-680-jobs-product-development-2024-04-09/" },
  { company: "Siemens Gamesa", date: "2024-05-28", affected: 4100, percentage: "15.00", country: "WW", countryHq: "ES", industry: "energy", source: "https://www.reuters.com/business/energy/siemens-gamesa-cut-4100-jobs-overhaul-ceo-says-staff-letter-2024-05-28/" },
  { company: "UPM Communication Papers", date: "2024-05-29", affected: 345, percentage: null, country: "DE", countryHq: "FI", industry: "manufacturing", source: "https://www.devdiscourse.com/article/headlines/2954201-upm-to-close-german-mills-amid-decline-in-paper-demand" },
  { company: "Ford Valencia", date: "2024-06-12", affected: 1600, percentage: "34.00", country: "ES", countryHq: "US", industry: "automotive", source: "https://kwsn.com/2024/06/12/ford-plans-to-cut-up-to-1600-jobs-at-valencia-plant-in-spain/" },
  { company: "Whirlpool", date: "2024-04-24", affected: 1000, percentage: "2.00", country: "WW", countryHq: "US", industry: "manufacturing", source: "https://hr.economictimes.indiatimes.com/news/workplace-4-0/talent-management/whirlpool-to-cut-1000-jobs-globally/109602232" },
];

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

async function handler() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  const details: string[] = [];

  await db.transaction(async (tx) => {
    for (const row of LAYOFFS) {
      try {
        const existing = await tx
          .select({ id: companies.id })
          .from(companies)
          .where(sql`LOWER(${companies.name}) = LOWER(${row.company})`)
          .limit(1);

        let companyId: string;

        if (existing.length > 0) {
          companyId = existing[0].id;
        } else {
          const slug = generateSlug(row.company);
          const slugExists = await tx
            .select({ id: companies.id })
            .from(companies)
            .where(eq(companies.slug, slug))
            .limit(1);

          if (slugExists.length > 0) {
            companyId = slugExists[0].id;
          } else {
            const [newCompany] = await tx
              .insert(companies)
              .values({
                name: row.company,
                slug,
                industrySlug: row.industry,
                countryHq: row.countryHq,
                companyType: "enterprise",
              })
              .returning({ id: companies.id });
            companyId = newCompany.id;
          }
        }

        const minDate = addDays(row.date, -7);
        const maxDate = addDays(row.date, 7);

        const dupes = await tx
          .select({ id: layoffs.id, affectedCount: layoffs.affectedCount })
          .from(layoffs)
          .where(
            and(
              eq(layoffs.companyId, companyId),
              gte(layoffs.date, minDate),
              lte(layoffs.date, maxDate),
            ),
          );

        const isDuplicate = dupes.some((d) => {
          if (d.affectedCount == null) return true;
          const diff = Math.abs(d.affectedCount - row.affected);
          return diff <= row.affected * 0.1;
        });

        if (isDuplicate) {
          skipped++;
          details.push(`SKIP  ${row.company} (${row.date})`);
          continue;
        }

        await tx.insert(layoffs).values({
          companyId,
          date: row.date,
          affectedCount: row.affected,
          affectedPercentage: row.percentage,
          country: row.country,
          sourceUrl: row.source,
          sourceName: extractDomain(row.source),
          titleEn: `${row.company} to cut ${row.affected.toLocaleString("en-US")} jobs`,
          titleDe: `${row.company} streicht ${row.affected.toLocaleString("de-DE")} Stellen`,
          status: "verified",
          reason: "restructuring",
          isShutdown: false,
        });

        inserted++;
        details.push(`OK    ${row.company} (${row.date}) — ${row.affected}`);
      } catch (err) {
        errors++;
        details.push(`ERR   ${row.company}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  });

  return NextResponse.json({ inserted, skipped, errors, details });
}

export { handler as GET, handler as POST };

