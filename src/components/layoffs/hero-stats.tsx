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
}: {
  pct: number | null;
  prevYear: number;
}) {
  if (pct == null) {
    return <p className="mt-2.5 h-[15px] text-[11px]">&nbsp;</p>;
  }
  const up = pct >= 0;
  const arrow = up ? "\u2191" : "\u2193";
  // More layoffs y/y (up) = bad → danger; fewer (down) = good → success.
  const colorVar = up ? "var(--accent-danger)" : "var(--accent-success)";
  return (
    <p
      className="mt-2.5 text-[11px] font-medium"
      style={{ color: colorVar }}
    >
      {arrow} {Math.abs(pct)}% vs. {prevYear}
    </p>
  );
}

export default function HeroStats({ stats }: HeroStatsProps) {
  const t = useTranslations("home");
  const locale = useLocale();
  const prevYear = stats.currentYear - 1;

  const cards: Array<{
    label: string;
    value: string;
    pct: number | null;
    sub?: string;
  }> = [
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
      label: t("affectedYear", { year: stats.currentYear }),
      value: fmt(stats.yearAffected, locale),
      pct: trendPct(stats.yearAffected, stats.prevYearAffected),
      sub: t("yearLayoffsCount", { count: fmt(stats.yearLayoffs, locale) }),
    },
    {
      label: t("dailyAvg"),
      value: fmt(stats.dailyAvgAffected, locale),
      pct: trendPct(stats.dailyAvgAffected, stats.prevDailyAvgAffected),
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-6 pt-12 pb-10">
      <h1
        className="mx-auto text-center text-[32px] font-medium leading-[1.1] tracking-[-1.5px] sm:text-[40px]"
        style={{ color: "var(--text-primary)" }}
      >
        {t("heroHeadline")}
      </h1>
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="flex min-h-[130px] flex-col items-center rounded-xl p-5 text-center"
            style={{ backgroundColor: "var(--bg-surface)" }}
          >
            <p
              className="text-[30px] font-medium leading-none tracking-[-1px] tabular-nums"
              style={{ color: "var(--text-primary)" }}
            >
              {card.value}
            </p>
            <p
              className="mt-2 text-[11px]"
              style={{ color: "var(--text-secondary)" }}
            >
              {card.label}
            </p>
            {card.sub ? (
              <p
                className="mt-0.5 text-[10px]"
                style={{ color: "var(--text-muted)" }}
              >
                {card.sub}
              </p>
            ) : null}
            <div className="mt-auto">
              <TrendIndicator pct={card.pct} prevYear={prevYear} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
