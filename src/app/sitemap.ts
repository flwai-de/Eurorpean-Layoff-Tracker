import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { layoffs, companies, industries } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

const BASE_URL = "https://dimissio.eu";

function localeAlternates(path: string) {
  return {
    languages: {
      de: `${BASE_URL}/de${path}`,
      en: `${BASE_URL}/en${path}`,
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // Static pages — Homepage
  for (const locale of ["de", "en"]) {
    entries.push({
      url: `${BASE_URL}/${locale}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
      alternates: localeAlternates(""),
    });
  }

  // Static pages — Industries index
  for (const locale of ["de", "en"]) {
    entries.push({
      url: `${BASE_URL}/${locale}/industries`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: localeAlternates("/industries"),
    });
  }

  // Verified layoffs
  const verifiedLayoffs = await db
    .select({
      id: layoffs.id,
      updatedAt: layoffs.updatedAt,
    })
    .from(layoffs)
    .where(eq(layoffs.status, "verified"));

  for (const layoff of verifiedLayoffs) {
    const path = `/layoff/${layoff.id}`;
    for (const locale of ["de", "en"]) {
      entries.push({
        url: `${BASE_URL}/${locale}${path}`,
        lastModified: layoff.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6,
        alternates: localeAlternates(path),
      });
    }
  }

  // Companies with at least one verified layoff
  const companiesWithLayoffs = await db
    .selectDistinct({
      slug: companies.slug,
      updatedAt: companies.updatedAt,
    })
    .from(companies)
    .innerJoin(layoffs, eq(companies.id, layoffs.companyId))
    .where(eq(layoffs.status, "verified"));

  for (const company of companiesWithLayoffs) {
    const path = `/company/${company.slug}`;
    for (const locale of ["de", "en"]) {
      entries.push({
        url: `${BASE_URL}/${locale}${path}`,
        lastModified: company.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6,
        alternates: localeAlternates(path),
      });
    }
  }

  // Industries with at least one verified layoff
  const industriesWithLayoffs = await db
    .selectDistinct({
      slug: companies.industrySlug,
    })
    .from(companies)
    .innerJoin(layoffs, eq(companies.id, layoffs.companyId))
    .where(eq(layoffs.status, "verified"));

  const industrySlugs = new Set(industriesWithLayoffs.map((i) => i.slug));

  // Also include parent industries if any child has layoffs
  const allIndustries = await db.select().from(industries);
  for (const ind of allIndustries) {
    if (ind.parentSlug && industrySlugs.has(ind.slug)) {
      industrySlugs.add(ind.parentSlug);
    }
  }

  for (const slug of industrySlugs) {
    const path = `/industry/${slug}`;
    for (const locale of ["de", "en"]) {
      entries.push({
        url: `${BASE_URL}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
        alternates: localeAlternates(path),
      });
    }
  }

  // Countries with at least one verified layoff
  const countriesWithLayoffs = await db
    .selectDistinct({
      country: layoffs.country,
      lastUpdated: sql<Date>`max(${layoffs.updatedAt})`,
    })
    .from(layoffs)
    .where(eq(layoffs.status, "verified"))
    .groupBy(layoffs.country);

  for (const row of countriesWithLayoffs) {
    const path = `/country/${row.country}`;
    for (const locale of ["de", "en"]) {
      entries.push({
        url: `${BASE_URL}/${locale}${path}`,
        lastModified: row.lastUpdated,
        changeFrequency: "weekly",
        priority: 0.8,
        alternates: localeAlternates(path),
      });
    }
  }

  return entries;
}
