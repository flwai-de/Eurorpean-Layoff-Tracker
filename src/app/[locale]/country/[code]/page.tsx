import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";
import { europeanCountries, getCountryFlag, getCountryName } from "@/lib/utils/countries";
import { getLayoffsByCountry } from "@/lib/queries/public";
import LayoffFeed from "@/components/layoffs/layoff-feed";

const PER_PAGE = 20;

interface Props {
  params: Promise<{ locale: string; code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, code } = await params;
  const upper = code.toUpperCase();
  if (!europeanCountries.has(upper)) return {};

  const t = await getTranslations({ locale, namespace: "country" });
  const name = getCountryName(upper, locale as "de" | "en");
  const title = t("metaTitle", { country: name });

  return {
    title,
    alternates: {
      languages: { de: `/de/country/${upper}`, en: `/en/country/${upper}` },
    },
  };
}

export default async function CountryPage({ params, searchParams }: Props) {
  const { code } = await params;
  const sp = await searchParams;
  const upper = code.toUpperCase();
  if (!europeanCountries.has(upper)) notFound();

  const page = Math.max(1, Number(sp.page) || 1);
  const result = await getLayoffsByCountry(upper, PER_PAGE, (page - 1) * PER_PAGE);

  const totalAffected = result.data.reduce(
    (sum, l) => sum + (l.affectedCount ?? 0),
    0,
  );

  return (
    <CountryContent
      code={upper}
      layoffs={result.data}
      total={result.total}
      totalAffected={totalAffected}
      page={page}
    />
  );
}

function CountryContent({
  code,
  layoffs,
  total,
  totalAffected,
  page,
}: {
  code: string;
  layoffs: Awaited<ReturnType<typeof getLayoffsByCountry>>["data"];
  total: number;
  totalAffected: number;
  page: number;
}) {
  const locale = useLocale() as "de" | "en";
  const t = useTranslations("country");
  const tLayoff = useTranslations("layoff");
  const name = getCountryName(code, locale);
  const flag = getCountryFlag(code);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">
        {flag} {t("heading", { country: name })}
      </h1>

      {/* Stats */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-neutral-500 dark:text-neutral-400">
        <span>{t("layoffCount", { count: total })}</span>
        {totalAffected > 0 && (
          <span>{t("totalAffected", { count: totalAffected.toLocaleString("de-DE") })}</span>
        )}
      </div>

      {/* Disclaimer */}
      <p className="mt-3 text-xs text-neutral-400">
        {t("disclaimer", { country: name })}
      </p>

      {/* Feed */}
      <div className="mt-8">
        <LayoffFeed layoffs={layoffs} total={total} page={page} perPage={PER_PAGE} />
      </div>

      {/* Back */}
      <div className="mt-8">
        <Link href="/" className="text-sm text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
          &larr; {tLayoff("backToOverview")}
        </Link>
      </div>
    </div>
  );
}
