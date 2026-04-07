import { useTranslations } from "next-intl";

interface HeroStatsProps {
  stats: {
    totalLayoffs: number;
    totalAffected: number;
    thisMonth: number;
    thisWeek: number;
  };
}

export default function HeroStats({ stats }: HeroStatsProps) {
  const t = useTranslations("home");

  const cards = [
    { label: t("totalLayoffs"), value: stats.totalLayoffs },
    { label: t("totalAffected"), value: stats.totalAffected },
    { label: t("thisMonth"), value: stats.thisMonth },
    { label: t("thisWeek"), value: stats.thisWeek },
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
            <p className="text-3xl font-bold tabular-nums text-teal-700 dark:text-teal-400 sm:text-4xl">
              {card.value.toLocaleString("de-DE")}
            </p>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {card.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
