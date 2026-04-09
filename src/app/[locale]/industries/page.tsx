import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";
import { getIndustriesWithCounts } from "@/lib/queries/public";

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

export default async function IndustriesPage() {
  const industries = await getIndustriesWithCounts();

  return <IndustriesContent industries={industries} />;
}

function IndustriesContent({
  industries,
}: {
  industries: Awaited<ReturnType<typeof getIndustriesWithCounts>>;
}) {
  const locale = useLocale() as "de" | "en";
  const t = useTranslations("industry");
  const tLayoff = useTranslations("layoff");

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">
        {t("indexTitle")}
      </h1>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        {t("indexDescription")}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {industries.map((industry) => {
          const name = locale === "de" ? industry.nameDe : industry.nameEn;
          return (
            <Link
              key={industry.slug}
              href={`/industry/${industry.slug}`}
              className="rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
            >
              <p className="font-semibold text-neutral-900 dark:text-white">
                {name}
              </p>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {t("layoffCount", { count: industry.layoffCount })}
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
