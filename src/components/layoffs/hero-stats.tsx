import { useLocale, useTranslations } from "next-intl";
import type { HeroStats as HeroStatsData } from "@/lib/queries/public";

interface HeroStatsProps {
  stats: HeroStatsData;
}

function fmt(n: number, locale: string) {
  return n.toLocaleString(locale === "de" ? "de-DE" : "en-US");
}

function trendPct(current: number, prev: number | null): number | null {
  if (prev == null || prev === 0) return null;
  return Math.round(((current - prev) / prev) * 100);
}

function TrendIndicator({
  pct,
  prevYear,
  locale,
}: {
  pct: number | null;
  prevYear: number;
  locale: string;
}) {
  if (pct == null) return <p className="mt-1 h-4" />;
  const up = pct >= 0;
  const arrow = up ? "\u2191" : "\u2193";
  const color = up
    ? "text-red-500 dark:text-red-400"
    : "text-green-600 dark:text-green-400";
  const abs = Math.abs(pct);
  return (
    <p className={`mt-1 text-xs font-medium ${color}`}>
      {arrow} {abs}% {locale === "de" ? "vs." : "vs."} {prevYear}
    </p>
  );
}

export default function HeroStats({ stats }: HeroStatsProps) {
  const t = useTranslations("home");
  const locale = useLocale();
  const prevYear = stats.currentYear - 1;

  const cards = [
    {
      label: t("totalLayoffs"),
      value: fmt(stats.totalLayoffs, locale),
      pct: trendPct(stats.yearLayoffs, stats.totalLayoffsPrev),
    },
    {
      label: t("totalAffected"),
      value: fmt(stats.totalAffected, locale),
      pct: trendPct(stats.yearAffected, stats.totalAffectedPrev),
    },
    {
      label: t("thisYear", { year: stats.currentYear }),
      value: `${fmt(stats.yearLayoffs, locale)} \u00b7 ${fmt(stats.yearAffected, locale)}`,
      pct: trendPct(stats.yearAffected, stats.prevYearAffected),
      small: true,
    },
    {
      label: t("dailyAvg"),
      value: fmt(stats.dailyAvgAffected, locale),
      pct: trendPct(stats.dailyAvgAffected, stats.prevDailyAvgAffected),
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-center text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
        {t("heroHeadline")}
      </h1>
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <p
              className={`font-bold tabular-nums text-teal-700 dark:text-teal-400 ${
                card.small ? "text-xl sm:text-2xl" : "text-3xl sm:text-4xl"
              }`}
            >
              {card.value}
            </p>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {card.label}
            </p>
            <TrendIndicator pct={card.pct} prevYear={prevYear} locale={locale} />
          </div>
        ))}
      </div>
    </section>
  );
}
