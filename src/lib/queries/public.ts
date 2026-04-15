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
import { eq, and, sql, desc, asc, gte, lte, count, sum, inArray, isNull } from "drizzle-orm";
import { cache } from "@/lib/utils/cache";
import {
  INDUSTRY_GROUPS,
  OTHER_GROUP,
  ALL_GROUPS,
  getGroupForSlug,
  getSlugsForGroup,
} from "@/lib/utils/industry-groups";

// ============================================================
// Types
// ============================================================

export type LayoffWithCompany = Layoff & {
  company: Pick<Company, "name" | "slug" | "logoUrl" | "industrySlug" | "countryHq"> & {
    industry: Pick<Industry, "nameEn" | "nameDe">;
  };
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
  industrySlugs?: string[];
  dateFrom?: string;
  dateTo?: string;
} = {}): Promise<{ data: LayoffWithCompany[]; total: number }> {
  const { limit = 20, offset = 0, country, industrySlug, industrySlugs, dateFrom, dateTo } = opts;

  const conditions = [eq(layoffs.status, "verified")];
  if (country) conditions.push(eq(layoffs.country, country));
  if (dateFrom) conditions.push(gte(layoffs.date, dateFrom));
  if (dateTo) conditions.push(lte(layoffs.date, dateTo));
  if (industrySlugs && industrySlugs.length > 0) {
    conditions.push(inArray(companies.industrySlug, industrySlugs));
  } else if (industrySlug) {
    conditions.push(eq(companies.industrySlug, industrySlug));
  }

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
        industryNameEn: industries.nameEn,
        industryNameDe: industries.nameDe,
      })
      .from(layoffs)
      .innerJoin(companies, eq(layoffs.companyId, companies.id))
      .innerJoin(industries, eq(companies.industrySlug, industries.slug))
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
        industry: {
          nameEn: row.industryNameEn,
          nameDe: row.industryNameDe,
        },
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

export interface HeroStats {
  totalLayoffs: number;
  totalAffected: number;
  currentYear: number;
  yearLayoffs: number;
  yearAffected: number;
  dailyAvgAffected: number;
  // Prior year same-period (Jan 1 → same day/month)
  prevYearLayoffs: number | null;
  prevYearAffected: number | null;
  prevDailyAvgAffected: number | null;
  // For total trend — compares YTD layoffs/affected to prior YTD
  totalLayoffsPrev: number | null;
  totalAffectedPrev: number | null;
}

export async function getHeroStats(): Promise<HeroStats> {
  const cached = cache.get<HeroStats>("heroStats");
  if (cached) return cached;

  const now = new Date();
  const year = now.getFullYear();
  const yearStart = `${year}-01-01`;
  const todayStr = now.toISOString().split("T")[0];

  // Prior year window: Jan 1 (Y-1) through same month/day of (Y-1)
  const prevYearStart = `${year - 1}-01-01`;
  const prevYearFullEnd = `${year - 1}-12-31`;
  const mmdd = todayStr.slice(4); // "-MM-DD"
  const prevYearEnd = `${year - 1}${mmdd}`;

  // Day count (inclusive) since Jan 1
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysSinceJan1 =
    Math.floor((now.getTime() - new Date(yearStart).getTime()) / msPerDay) + 1;

  const verified = eq(layoffs.status, "verified");

  const [totals, yearRow, prevYearRow, prevYearFullRow] = await Promise.all([
    db
      .select({
        totalLayoffs: count(),
        totalAffected: sum(layoffs.affectedCount),
      })
      .from(layoffs)
      .where(verified),
    db
      .select({
        layoffCount: count(),
        affected: sum(layoffs.affectedCount),
      })
      .from(layoffs)
      .where(and(verified, gte(layoffs.date, yearStart))),
    db
      .select({
        layoffCount: count(),
        affected: sum(layoffs.affectedCount),
      })
      .from(layoffs)
      .where(
        and(
          verified,
          gte(layoffs.date, prevYearStart),
          lte(layoffs.date, prevYearEnd),
        ),
      ),
    db
      .select({
        affected: sum(layoffs.affectedCount),
      })
      .from(layoffs)
      .where(
        and(
          verified,
          gte(layoffs.date, prevYearStart),
          lte(layoffs.date, prevYearFullEnd),
        ),
      ),
  ]);

  const yearLayoffs = yearRow[0]?.layoffCount ?? 0;
  const yearAffected = Number(yearRow[0]?.affected ?? 0);
  const prevYearLayoffs = prevYearRow[0]?.layoffCount ?? 0;
  const prevYearAffected = Number(prevYearRow[0]?.affected ?? 0);

  const prevYearFullAffected = Number(prevYearFullRow[0]?.affected ?? 0);

  const hasPrev = prevYearLayoffs > 0 || prevYearAffected > 0;
  // Card 4 compares current YTD daily avg against the prior year's full-year
  // daily average (affected_prev_full / 365), per spec.
  const prevDailyAvg = prevYearFullAffected > 0
    ? Math.round(prevYearFullAffected / 365)
    : null;

  const stats: HeroStats = {
    totalLayoffs: totals[0]?.totalLayoffs ?? 0,
    totalAffected: Number(totals[0]?.totalAffected ?? 0),
    currentYear: year,
    yearLayoffs,
    yearAffected,
    dailyAvgAffected: Math.round(yearAffected / Math.max(1, daysSinceJan1)),
    prevYearLayoffs: hasPrev ? prevYearLayoffs : null,
    prevYearAffected: hasPrev ? prevYearAffected : null,
    prevDailyAvgAffected: prevDailyAvg,
    totalLayoffsPrev: hasPrev ? prevYearLayoffs : null,
    totalAffectedPrev: hasPrev ? prevYearAffected : null,
  };

  cache.set("heroStats", stats, 5 * 60 * 1000);
  return stats;
}

// ============================================================
// d2) Year-based chart + summaries
// ============================================================

export interface YearSummary {
  year: number;
  layoffCount: number;
  affectedCount: number;
}

export interface MonthlyPoint {
  month: string; // "YYYY-MM"
  layoffCount: number;
  affectedCount: number;
}

export async function getYearSummaries(): Promise<YearSummary[]> {
  const rows = await db
    .select({
      year: sql<string>`to_char(${layoffs.date}::date, 'YYYY')`,
      layoffCount: count(),
      affectedCount: sum(layoffs.affectedCount),
    })
    .from(layoffs)
    .where(eq(layoffs.status, "verified"))
    .groupBy(sql`to_char(${layoffs.date}::date, 'YYYY')`)
    .orderBy(desc(sql`to_char(${layoffs.date}::date, 'YYYY')`));

  return rows.map((r) => ({
    year: Number(r.year),
    layoffCount: r.layoffCount,
    affectedCount: Number(r.affectedCount ?? 0),
  }));
}

export async function getTrendChartByYears(years: number[]): Promise<Record<number, MonthlyPoint[]>> {
  if (years.length === 0) return {};
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const start = `${minYear}-01-01`;
  const end = `${maxYear}-12-31`;

  const rows = await db
    .select({
      month: sql<string>`to_char(${layoffs.date}::date, 'YYYY-MM')`,
      layoffCount: count(),
      affectedCount: sum(layoffs.affectedCount),
    })
    .from(layoffs)
    .where(
      and(
        eq(layoffs.status, "verified"),
        gte(layoffs.date, start),
        lte(layoffs.date, end),
      ),
    )
    .groupBy(sql`to_char(${layoffs.date}::date, 'YYYY-MM')`);

  const map = new Map<string, { layoffCount: number; affectedCount: number }>();
  for (const r of rows) {
    map.set(r.month, {
      layoffCount: r.layoffCount,
      affectedCount: Number(r.affectedCount ?? 0),
    });
  }

  const result: Record<number, MonthlyPoint[]> = {};
  for (const y of years) {
    const months: MonthlyPoint[] = [];
    for (let m = 1; m <= 12; m++) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      const v = map.get(key);
      months.push({
        month: key,
        layoffCount: v?.layoffCount ?? 0,
        affectedCount: v?.affectedCount ?? 0,
      });
    }
    result[y] = months;
  }
  return result;
}

// ============================================================
// Industry chip stats (industries with layoffs, ordered by affected)
// ============================================================

export interface IndustryChipStat {
  key: string;
  labelEn: string;
  labelDe: string;
  layoffCount: number;
  affected: number;
}

export async function getIndustryChipStats(): Promise<IndustryChipStat[]> {
  const rows = await db
    .select({
      slug: companies.industrySlug,
      layoffCount: count(layoffs.id),
      affected: sum(layoffs.affectedCount),
    })
    .from(layoffs)
    .innerJoin(companies, eq(layoffs.companyId, companies.id))
    .where(eq(layoffs.status, "verified"))
    .groupBy(companies.industrySlug);

  const agg = new Map<string, { layoffCount: number; affected: number }>();
  for (const r of rows) {
    const groupKey = getGroupForSlug(r.slug) ?? OTHER_GROUP.key;
    const cur = agg.get(groupKey) ?? { layoffCount: 0, affected: 0 };
    cur.layoffCount += r.layoffCount;
    cur.affected += Number(r.affected ?? 0);
    agg.set(groupKey, cur);
  }

  const groupOrder = [...INDUSTRY_GROUPS, OTHER_GROUP];
  const result: IndustryChipStat[] = [];
  for (const g of groupOrder) {
    const stat = agg.get(g.key);
    if (!stat || stat.layoffCount === 0) continue;
    result.push({
      key: g.key,
      labelEn: g.labelEn,
      labelDe: g.labelDe,
      layoffCount: stat.layoffCount,
      affected: stat.affected,
    });
  }
  result.sort((a, b) => b.affected - a.affected);
  return result;
}

// ============================================================
// Top layoffs of current year (by affectedCount)
// ============================================================

export async function getTopLayoffsOfYear(
  year: number,
  limit: number = 5,
): Promise<LayoffWithCompany[]> {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  const data = await db
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
      industryNameEn: industries.nameEn,
      industryNameDe: industries.nameDe,
    })
    .from(layoffs)
    .innerJoin(companies, eq(layoffs.companyId, companies.id))
    .innerJoin(industries, eq(companies.industrySlug, industries.slug))
    .where(
      and(
        eq(layoffs.status, "verified"),
        gte(layoffs.date, start),
        lte(layoffs.date, end),
        sql`${layoffs.affectedCount} is not null`,
      ),
    )
    .orderBy(desc(layoffs.affectedCount))
    .limit(limit);

  return data.map((row) => ({
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
      industry: {
        nameEn: row.industryNameEn,
        nameDe: row.industryNameDe,
      },
    },
  }));
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

  const dataMap = new Map(rows.map((row) => [row.month, {
    month: row.month,
    layoffCount: row.layoffCount,
    affectedCount: Number(row.affectedCount ?? 0),
  }]));

  // Build full array of last N months, filling gaps with 0
  const result: TrendDataPoint[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    result.push(dataMap.get(key) ?? { month: key, layoffCount: 0, affectedCount: 0 });
  }

  return result;
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
        industryNameEn: industries.nameEn,
        industryNameDe: industries.nameDe,
      })
      .from(layoffs)
      .innerJoin(companies, eq(layoffs.companyId, companies.id))
      .innerJoin(industries, eq(companies.industrySlug, industries.slug))
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
        industry: {
          nameEn: row.industryNameEn,
          nameDe: row.industryNameDe,
        },
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
      industryNameEn: industries.nameEn,
      industryNameDe: industries.nameDe,
      totalViews: sum(layoffViews.viewCount),
    })
    .from(layoffs)
    .innerJoin(companies, eq(layoffs.companyId, companies.id))
    .innerJoin(industries, eq(companies.industrySlug, industries.slug))
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
      industries.nameEn,
      industries.nameDe,
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
      industry: {
        nameEn: row.industryNameEn,
        nameDe: row.industryNameDe,
      },
    },
  }));
}

// ============================================================
// i) getIndustriesWithCounts
// ============================================================

export interface IndustryWithCount extends Industry {
  layoffCount: number;
}

export async function getIndustriesWithCounts(): Promise<IndustryWithCount[]> {
  // Get all parent industries (no parentSlug)
  const parents = await db
    .select()
    .from(industries)
    .where(isNull(industries.parentSlug))
    .orderBy(asc(industries.sortOrder));

  // Get all child industries
  const children = await db
    .select()
    .from(industries)
    .where(sql`${industries.parentSlug} IS NOT NULL`)
    .orderBy(asc(industries.sortOrder));

  // Count verified layoffs per industry slug
  const counts = await db
    .select({
      industrySlug: companies.industrySlug,
      layoffCount: count(),
    })
    .from(layoffs)
    .innerJoin(companies, eq(layoffs.companyId, companies.id))
    .where(eq(layoffs.status, "verified"))
    .groupBy(companies.industrySlug);

  const countMap = new Map(counts.map((c) => [c.industrySlug, c.layoffCount]));

  // Build result: parents with aggregated counts (own + children)
  const result: IndustryWithCount[] = [];
  for (const parent of parents) {
    const childSlugs = children.filter((c) => c.parentSlug === parent.slug);
    const parentCount = (countMap.get(parent.slug) ?? 0) +
      childSlugs.reduce((sum, c) => sum + (countMap.get(c.slug) ?? 0), 0);
    result.push({ ...parent, layoffCount: parentCount });
  }

  return result;
}

// ============================================================
// j) getLayoffsByGroup — fetch layoffs for an INDUSTRY_GROUP key
// ============================================================

export async function getLayoffsByGroup(
  groupKey: string,
  limit: number = 20,
  offset: number = 0,
): Promise<{ data: LayoffWithCompany[]; total: number }> {
  const slugs = getSlugsForGroup(groupKey);
  if (slugs.length === 0) return { data: [], total: 0 };

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
        industryNameEn: industries.nameEn,
        industryNameDe: industries.nameDe,
      })
      .from(layoffs)
      .innerJoin(companies, eq(layoffs.companyId, companies.id))
      .innerJoin(industries, eq(companies.industrySlug, industries.slug))
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
        industry: {
          nameEn: row.industryNameEn,
          nameDe: row.industryNameDe,
        },
      },
    })),
    total: totalResult[0]?.total ?? 0,
  };
}

// ============================================================
// k) getGroupsWithCounts — aggregated counts per INDUSTRY_GROUP
// ============================================================

export interface GroupWithCount {
  key: string;
  labelEn: string;
  labelDe: string;
  layoffCount: number;
  totalAffected: number;
}

export async function getGroupsWithCounts(): Promise<GroupWithCount[]> {
  const rows = await db
    .select({
      slug: companies.industrySlug,
      layoffCount: count(layoffs.id),
      affected: sum(layoffs.affectedCount),
    })
    .from(layoffs)
    .innerJoin(companies, eq(layoffs.companyId, companies.id))
    .where(eq(layoffs.status, "verified"))
    .groupBy(companies.industrySlug);

  const agg = new Map<string, { layoffCount: number; totalAffected: number }>();
  for (const r of rows) {
    const groupKey = getGroupForSlug(r.slug) ?? OTHER_GROUP.key;
    const cur = agg.get(groupKey) ?? { layoffCount: 0, totalAffected: 0 };
    cur.layoffCount += r.layoffCount;
    cur.totalAffected += Number(r.affected ?? 0);
    agg.set(groupKey, cur);
  }

  return ALL_GROUPS.map((g) => {
    const stat = agg.get(g.key) ?? { layoffCount: 0, totalAffected: 0 };
    return {
      key: g.key,
      labelEn: g.labelEn,
      labelDe: g.labelDe,
      layoffCount: stat.layoffCount,
      totalAffected: stat.totalAffected,
    };
  });
}
