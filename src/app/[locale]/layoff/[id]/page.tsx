import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";
import { getLayoffById } from "@/lib/queries/public";
import { getCountryFlag, getCountryName } from "@/lib/utils/countries";
import { generateLayoffTitle } from "@/lib/utils/generate-title";
import ViewCounter from "./view-counter";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const layoff = await getLayoffById(id);
  if (!layoff) return {};

  const t = await getTranslations({ locale, namespace: "layoff" });
  const title = layoff.affectedCount
    ? t("metaTitle", { company: layoff.company.name, count: layoff.affectedCount })
    : t("metaTitleNoCount", { company: layoff.company.name });
  const description = locale === "de" ? layoff.summaryDe : layoff.summaryEn;

  return {
    title,
    description: description ?? undefined,
    openGraph: {
      title,
      description: description ?? undefined,
      type: "article",
      url: `/${locale}/layoff/${id}`,
    },
    alternates: {
      languages: { de: `/de/layoff/${id}`, en: `/en/layoff/${id}`, "x-default": `/en/layoff/${id}` },
    },
  };
}

function formatDate(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleDateString(locale === "de" ? "de-DE" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function LayoffDetailPage({ params }: Props) {
  const { id } = await params;
  const layoff = await getLayoffById(id);
  if (!layoff) notFound();

  return (
    <>
      <ViewCounter id={id} />
      <LayoffContent layoff={layoff} />
    </>
  );
}

function LayoffContent({ layoff }: { layoff: NonNullable<Awaited<ReturnType<typeof getLayoffById>>> }) {
  const locale = useLocale() as "de" | "en";
  const t = useTranslations("layoff");
  const tReasons = useTranslations("reasons");
  const tCommon = useTranslations("common");

  const rawTitle = locale === "de" ? layoff.titleDe : layoff.titleEn;
  const title = rawTitle ?? generateLayoffTitle({
    companyName: layoff.company.name,
    affectedCount: layoff.affectedCount,
    affectedPercentage: layoff.affectedPercentage,
    isShutdown: layoff.isShutdown,
  }, locale);
  const summary = locale === "de" ? layoff.summaryDe : layoff.summaryEn;
  const severanceDetails = locale === "de" ? layoff.severanceDetailsDe : layoff.severanceDetailsEn;
  const flag = getCountryFlag(layoff.country);
  const countryName = getCountryName(layoff.country, locale);
  const industryName = locale === "de" ? layoff.company.industry.nameDe : layoff.company.industry.nameEn;

  const initials = layoff.company.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    datePublished: layoff.date,
    publisher: { "@type": "Organization", name: "Dimissio" },
  };

  return (
    <article className="mx-auto max-w-4xl px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-neutral-400">
        <Link href="/" className="transition hover:text-neutral-900 dark:hover:text-white">
          {tCommon("home")}
        </Link>
        <span>/</span>
        <span>{t("breadcrumbLayoffs")}</span>
        <span>/</span>
        <span className="text-neutral-600 dark:text-neutral-300">{layoff.company.name}</span>
      </nav>

      {/* Company header */}
      <div className="mb-6 flex items-center gap-4">
        {layoff.company.logoUrl ? (
          <Image src={layoff.company.logoUrl} alt={layoff.company.name} width={56} height={56} unoptimized className="h-14 w-14 rounded-xl object-contain" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-100 text-lg font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            {initials}
          </div>
        )}
        <div>
          <Link
            href={`/company/${layoff.company.slug}`}
            className="text-lg font-bold text-neutral-900 transition hover:text-teal-700 dark:text-white dark:hover:text-teal-400"
          >
            {layoff.company.name}
          </Link>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {formatDate(layoff.date, locale)}
          </p>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">
        {title}
      </h1>

      {/* Summary */}
      {summary && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            {t("summary")}
          </h2>
          <p className="mt-2 leading-relaxed text-neutral-700 dark:text-neutral-300">
            {summary}
          </p>
        </div>
      )}

      {/* Facts grid */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {layoff.affectedCount != null && (
          <FactCard label={t("affected")} value={layoff.affectedCount.toLocaleString("de-DE")} />
        )}
        {layoff.affectedPercentage != null && (
          <FactCard label="%" value={t("affectedPercent", { percent: layoff.affectedPercentage })} />
        )}
        {layoff.totalEmployeesAtTime != null && (
          <FactCard label={t("totalEmployees")} value={layoff.totalEmployeesAtTime.toLocaleString("de-DE")} />
        )}
        <FactCard label={t("country")} value={`${flag} ${countryName}${layoff.city ? `, ${layoff.city}` : ""}`} />
        {layoff.reason && (
          <FactCard label={t("reason")} value={tReasons(layoff.reason)} />
        )}
        <FactCard
          label={t("industry")}
          value={industryName}
          href={`/industry/${layoff.company.industrySlug}`}
        />
        {layoff.severanceWeeks != null && (
          <FactCard
            label={t("severance")}
            value={`${t("severanceWeeks", { weeks: layoff.severanceWeeks })}${severanceDetails ? ` — ${severanceDetails}` : ""}`}
          />
        )}
      </div>

      {/* Source + Back */}
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <a
          href={layoff.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          {t("sourceLink")}
          {layoff.sourceName && (
            <span className="text-neutral-400">({layoff.sourceName})</span>
          )}
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
        </a>
        <Link
          href="/"
          className="text-sm text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
        >
          &larr; {t("backToOverview")}
        </Link>
      </div>
    </article>
  );
}

function FactCard({ label, value, href }: { label: string; value: string; href?: string }) {
  const content = (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-white">{value}</p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="transition hover:ring-2 hover:ring-teal-500/30 rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
}
