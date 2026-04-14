import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";
import { getGroupsWithCounts } from "@/lib/queries/public";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "industry" });

  return {
    title: `${t("indexTitle")} | Dimissio`,
    description: t("indexDescription"),
    alternates: {
      languages: { de: "/de/industries", en: "/en/industries", "x-default": "/en/industries" },
    },
  };
}

export default async function IndustriesPage({ params }: Props) {
  const { locale } = await params;
  const groups = await getGroupsWithCounts();
  return <IndustriesContent groups={groups} locale={locale as "de" | "en"} />;
}

function IndustriesContent({
  groups,
  locale,
}: {
  groups: Awaited<ReturnType<typeof getGroupsWithCounts>>;
  locale: "de" | "en";
}) {
  const t = useTranslations("industry");
  const tLayoff = useTranslations("layoff");
  const tGroups = useTranslations("industryGroups");

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">
        {t("indexTitle")}
      </h1>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        {t("indexDescription")}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => {
          let label: string;
          try {
            label = tGroups(group.key);
          } catch {
            label = locale === "de" ? group.labelDe : group.labelEn;
          }
          return (
            <Link
              key={group.key}
              href={`/industry/${group.key}`}
              className="rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
            >
              <p className="font-semibold text-neutral-900 dark:text-white">{label}</p>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {t("layoffCount", { count: group.layoffCount })}
              </p>
            </Link>
          );
        })}
      </div>

      <div className="mt-8">
        <Link
          href="/"
          className="text-sm text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
        >
          &larr; {tLayoff("backToOverview")}
        </Link>
      </div>
    </div>
  );
}
