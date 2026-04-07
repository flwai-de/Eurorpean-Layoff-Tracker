import { db } from "@/lib/db";
import {
  layoffs,
  companies,
  industries,
  layoffViews,
  type Layoff,
  type Company,
  type Industry,
} from "@/lib/db/schema";
import { eq, and, sql, desc, gte, lte, count, sum, inArray } from "drizzle-orm";
import { cache } from "@/lib/utils/cache";

// ============================================================
// Types
// ============================================================

export type LayoffWithCompany = Layoff & {
  company: Pick<Company, "name" | "slug" | "logoUrl" | "industrySlug" | "countryHq">;
};

type LayoffDetail = Layoff & {
  company: Company & { industry: Industry };
};

type CompanyWithLayoffs = Company & {
  industry: Industry;
  layoffs: Layoff[];
};

// ============================================================
// a) getVerifiedLayoffs
// ============================================================

export async function getVerifiedLayoffs(opts: {
  limit?: number;
  offset?: number;
  country?: string;
  industrySlug?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}): Promise<{ data: LayoffWithCompany[]; total: number }> {
  const { limit = 20, offset = 0, country, industrySlug, dateFrom, dateTo } = opts;

  const conditions = [eq(layoffs.status, "verified")];
  if (country) conditions.push(eq(layoffs.country, country));
  if (dateFrom) conditions.push(gte(layoffs.date, dateFrom));
  if (dateTo) conditions.push(lte(layoffs.date, dateTo));
  if (industrySlug) conditions.push(eq(companies.industrySlug, industrySlug));

  const where = and(...conditions);

  const [data, totalResult] = await Promise.all([
    db
      .select({
        id: layoffs.id,
        companyId: layoffs.companyId,
        date: layoffs.date,
        affectedCount: layoffs.affectedCount,
        affectedPercentage: layoffs.affectedPercentage,
        totalEmployeesAtTime: layoffs.totalEmployeesAtTime,
        country: layoffs.country,
        city: layoffs.city,
        isShutdown: layoffs.isShutdown,
        reason: layoffs.reason,
        severanceWeeks: layoffs.severanceWeeks,
        severanceDetailsEn: layoffs.severanceDetailsEn,
        severanceDetailsDe: layoffs.severanceDetailsDe,
        sourceUrl: layoffs.sourceUrl,
        sourceName: layoffs.sourceName,
        titleEn: layoffs.titleEn,
        titleDe: layoffs.titleDe,
        summaryEn: layoffs.summaryEn,
        summaryDe: layoffs.summaryDe,
        status: layoffs.status,
        verifiedAt: layoffs.verifiedAt,
        verifiedBy: layoffs.verifiedBy,
        publishedToSocial: layoffs.publishedToSocial,
        publishedToNewsletter: layoffs.publishedToNewsletter,
        createdAt: layoffs.createdAt,
        updatedAt: layoffs.updatedAt,
        companyName: companies.name,
        companySlug: companies.slug,
        companyLogoUrl: companies.logoUrl,
        companyIndustrySlug: companies.industrySlug,
        companyCountryHq: companies.countryHq,
      })
      .from(layoffs)
      .innerJoin(companies, eq(layoffs.companyId, companies.id))
      .where(where)
      .orderBy(desc(layoffs.date))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(layoffs)
      .innerJoin(companies, eq(layoffs.companyId, companies.id))
      .where(where),
  ]);

  return {
    data: data.map((row) => ({
      id: row.id,
      companyId: row.companyId,
      date: row.date,
      affectedCount: row.affectedCount,
      affectedPercentage: row.affectedPercentage,
      totalEmployeesAtTime: row.totalEmployeesAtTime,
      country: row.country,
      city: row.city,
      isShutdown: row.isShutdown,
      reason: row.reason,
      severanceWeeks: row.severanceWeeks,
      severanceDetailsEn: row.severanceDetailsEn,
      severanceDetailsDe: row.severanceDetailsDe,
      sourceUrl: row.sourceUrl,
      sourceName: row.sourceName,
      titleEn: row.titleEn,
      titleDe: row.titleDe,
      summaryEn: row.summaryEn,
      summaryDe: row.summaryDe,
      status: row.status,
      verifiedAt: row.verifiedAt,
      verifiedBy: row.verifiedBy,
      publishedToSocial: row.publishedToSocial,
      publishedToNewsletter: row.publishedToNewsletter,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      company: {
        name: row.companyName,
        slug: row.companySlug,
        logoUrl: row.companyLogoUrl,
        industrySlug: row.companyIndustrySlug,
        countryHq: row.companyCountryHq,
      },
    })),
    total: totalResult[0]?.total ?? 0,
  };
}

// ============================================================
// b) getLayoffById
// ============================================================

export async function getLayoffById(id: string): Promise<LayoffDetail | null> {
  const result = await db.query.layoffs.findFirst({
    where: and(eq(layoffs.id, id), eq(layoffs.status, "verified")),
    with: {
      company: {
        with: {
          industry: true,
        },
      },
    },
  });

  return result ?? null;
}

// ============================================================
// c) getCompanyBySlug
// ============================================================

export async function getCompanyBySlug(slug: string): Promise<CompanyWithLayoffs | null> {
  const result = await db.query.companies.findFirst({
    where: eq(companies.slug, slug),
    with: {
      industry: true,
      layoffs: {
        where: eq(layoffs.status, "verified"),
        orderBy: [desc(layoffs.date)],
      },
    },
  });

  return result ?? null;
}

// ============================================================
// d) getHeroStats
// ============================================================

interface HeroStats {
  totalLayoffs: number;
  totalAffected: number;
  thisMonth: number;
  thisWeek: number;
}

export async function getHeroStats(): Promise<HeroStats> {
  const cached = cache.get<HeroStats>("heroStats");
  if (cached) return cached;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - mondayOffset);
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const verified = eq(layoffs.status, "verified");

  const [totals, monthly, weekly] = await Promise.all([
    db
      .select({
        totalLayoffs: count(),
        totalAffected: sum(layoffs.affectedCount),
      })
      .from(layoffs)
      .where(verified),
    db
      .select({ count: count() })
      .from(layoffs)
      .where(and(verified, gte(layoffs.date, monthStart))),
    db
      .select({ count: count() })
      .from(layoffs)
      .where(and(verified, gte(layoffs.date, weekStartStr))),
  ]);

  const stats: HeroStats = {
    totalLayoffs: totals[0]?.totalLayoffs ?? 0,
    totalAffected: Number(totals[0]?.totalAffected ?? 0),
    thisMonth: monthly[0]?.count ?? 0,
    thisWeek: weekly[0]?.count ?? 0,
  };

  cache.set("heroStats", stats, 5 * 60 * 1000);
  return stats;
}

// ============================================================
// e) getTrendChartData
// ============================================================

interface TrendDataPoint {
  month: string;
  layoffCount: number;
  affectedCount: number;
}

export async function getTrendChartData(months: number = 12): Promise<TrendDataPoint[]> {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-01`;

  const rows = await db
    .select({
      month: sql<string>`to_char(${layoffs.date}::date, 'YYYY-MM')`,
      layoffCount: count(),
      affectedCount: sum(layoffs.affectedCount),
    })
    .from(layoffs)
    .where(and(eq(layoffs.status, "verified"), gte(layoffs.date, startStr)))
    .groupBy(sql`to_char(${layoffs.date}::date, 'YYYY-MM')`)
    .orderBy(sql`to_char(${layoffs.date}::date, 'YYYY-MM')`);

  return rows.map((row) => ({
    month: row.month,
    layoffCount: row.layoffCount,
    affectedCount: Number(row.affectedCount ?? 0),
  }));
}

// ============================================================
// f) getLayoffsByCountry
// ============================================================

export async function getLayoffsByCountry(
  code: string,
  limit: number = 20,
  offset: number = 0,
): Promise<{ data: LayoffWithCompany[]; total: number }> {
  return getVerifiedLayoffs({ country: code, limit, offset });
}

// ============================================================
// g) getLayoffsByIndustry
// ============================================================

export async function getLayoffsByIndustry(
  slug: string,
  limit: number = 20,
  offset: number = 0,
): Promise<{ data: LayoffWithCompany[]; total: number }> {
  // Include child industries
  const children = await db
    .select({ slug: industries.slug })
    .from(industries)
    .where(eq(industries.parentSlug, slug));

  const slugs = [slug, ...children.map((c) => c.slug)];

  const where = and(
    eq(layoffs.status, "verified"),
    inArray(companies.industrySlug, slugs),
  );

  const [data, totalResult] = await Promise.all([
    db
      .select({
        id: layoffs.id,
        companyId: layoffs.companyId,
        date: layoffs.date,
        affectedCount: layoffs.affectedCount,
        affectedPercentage: layoffs.affectedPercentage,
        totalEmployeesAtTime: layoffs.totalEmployeesAtTime,
        country: layoffs.country,
        city: layoffs.city,
        isShutdown: layoffs.isShutdown,
        reason: layoffs.reason,
        severanceWeeks: layoffs.severanceWeeks,
        severanceDetailsEn: layoffs.severanceDetailsEn,
        severanceDetailsDe: layoffs.severanceDetailsDe,
        sourceUrl: layoffs.sourceUrl,
        sourceName: layoffs.sourceName,
        titleEn: layoffs.titleEn,
        titleDe: layoffs.titleDe,
        summaryEn: layoffs.summaryEn,
        summaryDe: layoffs.summaryDe,
        status: layoffs.status,
        verifiedAt: layoffs.verifiedAt,
        verifiedBy: layoffs.verifiedBy,
        publishedToSocial: layoffs.publishedToSocial,
        publishedToNewsletter: layoffs.publishedToNewsletter,
        createdAt: layoffs.createdAt,
        updatedAt: layoffs.updatedAt,
        companyName: companies.name,
        companySlug: companies.slug,
        companyLogoUrl: companies.logoUrl,
        companyIndustrySlug: companies.industrySlug,
        companyCountryHq: companies.countryHq,
      })
      .from(layoffs)
      .innerJoin(companies, eq(layoffs.companyId, companies.id))
      .where(where)
      .orderBy(desc(layoffs.date))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(layoffs)
      .innerJoin(companies, eq(layoffs.companyId, companies.id))
      .where(where),
  ]);

  return {
    data: data.map((row) => ({
      id: row.id,
      companyId: row.companyId,
      date: row.date,
      affectedCount: row.affectedCount,
      affectedPercentage: row.affectedPercentage,
      totalEmployeesAtTime: row.totalEmployeesAtTime,
      country: row.country,
      city: row.city,
      isShutdown: row.isShutdown,
      reason: row.reason,
      severanceWeeks: row.severanceWeeks,
      severanceDetailsEn: row.severanceDetailsEn,
      severanceDetailsDe: row.severanceDetailsDe,
      sourceUrl: row.sourceUrl,
      sourceName: row.sourceName,
      titleEn: row.titleEn,
      titleDe: row.titleDe,
      summaryEn: row.summaryEn,
      summaryDe: row.summaryDe,
      status: row.status,
      verifiedAt: row.verifiedAt,
      verifiedBy: row.verifiedBy,
      publishedToSocial: row.publishedToSocial,
      publishedToNewsletter: row.publishedToNewsletter,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      company: {
        name: row.companyName,
        slug: row.companySlug,
        logoUrl: row.companyLogoUrl,
        industrySlug: row.companyIndustrySlug,
        countryHq: row.companyCountryHq,
      },
    })),
    total: totalResult[0]?.total ?? 0,
  };
}

// ============================================================
// h) getRecentLayoffs
// ============================================================

export async function getRecentLayoffs(limit: number = 10): Promise<LayoffWithCompany[]> {
  const result = await getVerifiedLayoffs({ limit });
  return result.data;
}

// ============================================================
// i) getTrendingLayoffs
// ============================================================

export async function getTrendingLayoffs(limit: number = 5): Promise<LayoffWithCompany[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  const trending = await db
    .select({
      id: layoffs.id,
      companyId: layoffs.companyId,
      date: layoffs.date,
      affectedCount: layoffs.affectedCount,
      affectedPercentage: layoffs.affectedPercentage,
      totalEmployeesAtTime: layoffs.totalEmployeesAtTime,
      country: layoffs.country,
      city: layoffs.city,
      isShutdown: layoffs.isShutdown,
      reason: layoffs.reason,
      severanceWeeks: layoffs.severanceWeeks,
      severanceDetailsEn: layoffs.severanceDetailsEn,
      severanceDetailsDe: layoffs.severanceDetailsDe,
      sourceUrl: layoffs.sourceUrl,
      sourceName: layoffs.sourceName,
      titleEn: layoffs.titleEn,
      titleDe: layoffs.titleDe,
      summaryEn: layoffs.summaryEn,
      summaryDe: layoffs.summaryDe,
      status: layoffs.status,
      verifiedAt: layoffs.verifiedAt,
      verifiedBy: layoffs.verifiedBy,
      publishedToSocial: layoffs.publishedToSocial,
      publishedToNewsletter: layoffs.publishedToNewsletter,
      createdAt: layoffs.createdAt,
      updatedAt: layoffs.updatedAt,
      companyName: companies.name,
      companySlug: companies.slug,
      companyLogoUrl: companies.logoUrl,
      companyIndustrySlug: companies.industrySlug,
      companyCountryHq: companies.countryHq,
      totalViews: sum(layoffViews.viewCount),
    })
    .from(layoffs)
    .innerJoin(companies, eq(layoffs.companyId, companies.id))
    .innerJoin(layoffViews, eq(layoffs.id, layoffViews.layoffId))
    .where(
      and(
        eq(layoffs.status, "verified"),
        gte(layoffViews.viewedAt, sevenDaysAgoStr),
      ),
    )
    .groupBy(
      layoffs.id,
      companies.name,
      companies.slug,
      companies.logoUrl,
      companies.industrySlug,
      companies.countryHq,
    )
    .orderBy(desc(sum(layoffViews.viewCount)))
    .limit(limit);

  if (trending.length === 0) {
    return getRecentLayoffs(limit);
  }

  return trending.map((row) => ({
    id: row.id,
    companyId: row.companyId,
    date: row.date,
    affectedCount: row.affectedCount,
    affectedPercentage: row.affectedPercentage,
    totalEmployeesAtTime: row.totalEmployeesAtTime,
    country: row.country,
    city: row.city,
    isShutdown: row.isShutdown,
    reason: row.reason,
    severanceWeeks: row.severanceWeeks,
    severanceDetailsEn: row.severanceDetailsEn,
    severanceDetailsDe: row.severanceDetailsDe,
    sourceUrl: row.sourceUrl,
    sourceName: row.sourceName,
    titleEn: row.titleEn,
    titleDe: row.titleDe,
    summaryEn: row.summaryEn,
    summaryDe: row.summaryDe,
    status: row.status,
    verifiedAt: row.verifiedAt,
    verifiedBy: row.verifiedBy,
    publishedToSocial: row.publishedToSocial,
    publishedToNewsletter: row.publishedToNewsletter,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    company: {
      name: row.companyName,
      slug: row.companySlug,
      logoUrl: row.companyLogoUrl,
      industrySlug: row.companyIndustrySlug,
      countryHq: row.companyCountryHq,
    },
  }));
}
