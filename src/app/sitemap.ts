import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { layoffs, companies, industries } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

const BASE_URL = "https://dimissio.eu";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // Static pages
  for (const locale of ["de", "en"]) {
    entries.push({
      url: `${BASE_URL}/${locale}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
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
    for (const locale of ["de", "en"]) {
      entries.push({
        url: `${BASE_URL}/${locale}/layoff/${layoff.id}`,
        lastModified: layoff.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
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
    for (const locale of ["de", "en"]) {
      entries.push({
        url: `${BASE_URL}/${locale}/company/${company.slug}`,
        lastModified: company.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  // All industries
  const allIndustries = await db.select({ slug: industries.slug }).from(industries);

  for (const industry of allIndustries) {
    for (const locale of ["de", "en"]) {
      entries.push({
        url: `${BASE_URL}/${locale}/industry/${industry.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
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
    for (const locale of ["de", "en"]) {
      entries.push({
        url: `${BASE_URL}/${locale}/country/${row.country}`,
        lastModified: row.lastUpdated,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
