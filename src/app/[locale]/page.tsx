import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { db } from "@/lib/db";
import { industries } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import {
  getHeroStats,
  getVerifiedLayoffs,
  getTrendingLayoffs,
  getYearSummaries,
  getTrendChartByYears,
  getIndustryChipStats,
  getTopLayoffsOfYear,
} from "@/lib/queries/public";
import { resolveIndustryFilter } from "@/lib/utils/industry-groups";
import HeroStats from "@/components/layoffs/hero-stats";
import TrendChart from "@/components/charts/trend-chart";
import LayoffFeed from "@/components/layoffs/layoff-feed";
import LayoffFilters from "@/components/layoffs/layoff-filters";
import IndustryChips from "@/components/layoffs/industry-chips";
import SidebarRankings from "@/components/layoffs/sidebar-rankings";

const PER_PAGE = 20;

const PERIOD_DAYS: Record<string, number> = {
  lastWeek: 7,
  lastMonth: 30,
  last3Months: 90,
  lastYear: 365,
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const country = typeof params.country === "string" ? params.country : undefined;
  const industry = typeof params.industry === "string" ? params.industry : undefined;
  const period = typeof params.period === "string" ? params.period : undefined;
  const page = Math.max(1, Number(params.page) || 1);

  let dateFrom: string | undefined;
  if (period && PERIOD_DAYS[period]) {
    const d = new Date();
    d.setDate(d.getDate() - PERIOD_DAYS[period]);
    dateFrom = d.toISOString().split("T")[0];
  }

  const stats = await getHeroStats();
  const summaries = await getYearSummaries();
  const currentYear = stats.currentYear;

  // Years for chart tabs: current year + up to 3 prior years with data, always include currentYear
  const yearSet = new Set<number>([currentYear, ...summaries.map((s) => s.year)]);
  const chartYears = Array.from(yearSet)
    .sort((a, b) => b - a)
    .slice(0, 4);

  const [yearsData, layoffsResult, trending, topOfYear, industryList, chipStats] =
    await Promise.all([
      getTrendChartByYears(chartYears),
      getVerifiedLayoffs({
        limit: PER_PAGE,
        offset: (page - 1) * PER_PAGE,
        country,
        ...resolveIndustryFilter(industry),
        dateFrom,
      }),
      getTrendingLayoffs(),
      getTopLayoffsOfYear(currentYear, 5),
      db.select().from(industries).orderBy(asc(industries.sortOrder)),
      getIndustryChipStats(),
    ]);

  return (
    <>
      <HeroStats stats={stats} />
      <TrendChart
        yearsData={yearsData}
        summaries={summaries}
        defaultYear={currentYear}
      />

      <section className="mx-auto max-w-6xl px-6 py-8">
        {/* Filters */}
        <div className="mb-4">
          <Suspense>
            <LayoffFilters industries={industryList} />
          </Suspense>
        </div>

        {/* Industry chips */}
        <div className="mb-6">
          <Suspense>
            <IndustryChips chips={chipStats} />
          </Suspense>
        </div>

        {/* Feed + Sidebar */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <FeedTitle />
            <div className="mt-4">
              <LayoffFeed
                layoffs={layoffsResult.data}
                total={layoffsResult.total}
                page={page}
                perPage={PER_PAGE}
              />
            </div>
          </div>

          <div>
            <SidebarRankings
              topLayoffs={topOfYear}
              trending={trending}
              currentYear={currentYear}
            />
          </div>
        </div>
      </section>
    </>
  );
}

function FeedTitle() {
  const t = useTranslations("home");
  return (
    <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
      {t("recentTitle")}
    </h2>
  );
}
