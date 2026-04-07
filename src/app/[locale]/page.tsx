import { Suspense } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";
import { db } from "@/lib/db";
import { industries } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import {
  getHeroStats,
  getTrendChartData,
  getVerifiedLayoffs,
  getTrendingLayoffs,
} from "@/lib/queries/public";
import { getCountryFlag, getCountryName } from "@/lib/utils/countries";
import { generateLayoffTitle } from "@/lib/utils/generate-title";
import HeroStats from "@/components/layoffs/hero-stats";
import TrendChart from "@/components/charts/trend-chart";
import LayoffFeed from "@/components/layoffs/layoff-feed";
import LayoffFilters from "@/components/layoffs/layoff-filters";

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

  const [stats, chartData, layoffsResult, trending, industryList] = await Promise.all([
    getHeroStats(),
    getTrendChartData(),
    getVerifiedLayoffs({
      limit: PER_PAGE,
      offset: (page - 1) * PER_PAGE,
      country,
      industrySlug: industry,
      dateFrom,
    }),
    getTrendingLayoffs(),
    db.select().from(industries).orderBy(asc(industries.sortOrder)),
  ]);

  return (
    <>
      <HeroStats stats={stats} />
      <TrendChart data={chartData} />

      <section className="mx-auto max-w-6xl px-6 py-8">
        {/* Filters */}
        <div className="mb-6">
          <Suspense>
            <LayoffFilters industries={industryList} />
          </Suspense>
        </div>

        {/* Feed + Trending */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Feed — 2/3 */}
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

          {/* Trending sidebar — 1/3 */}
          <div>
            <TrendingSidebar trending={trending} />
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

function TrendingSidebar({
  trending,
}: {
  trending: Awaited<ReturnType<typeof getTrendingLayoffs>>;
}) {
  const t = useTranslations("home");
  const tLayoff = useTranslations("layoff");
  const locale = useLocale() as "de" | "en";

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
        {t("trendingTitle")}
      </h3>
      {trending.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-400">{t("noData")}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {trending.map((layoff, i) => {
            const rawTitle = locale === "de" ? layoff.titleDe : layoff.titleEn;
            const title = rawTitle ?? generateLayoffTitle({
              companyName: layoff.company.name,
              affectedCount: layoff.affectedCount,
              affectedPercentage: layoff.affectedPercentage,
              isShutdown: layoff.isShutdown,
            }, locale);
            return (
              <li key={layoff.id}>
                <Link
                  href={`/layoff/${layoff.id}`}
                  className="group block"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-900 transition group-hover:text-teal-700 dark:text-white dark:group-hover:text-teal-400">
                        {layoff.company.name}
                      </p>
                      <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {title}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
                        <span>{getCountryFlag(layoff.country)} {getCountryName(layoff.country, locale)}</span>
                        {layoff.affectedCount != null && (
                          <span>{tLayoff("affected")}: {layoff.affectedCount.toLocaleString("de-DE")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
