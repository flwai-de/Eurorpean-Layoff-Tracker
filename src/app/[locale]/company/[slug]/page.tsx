import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";
import { getCompanyBySlug } from "@/lib/queries/public";
import { getCountryFlag, getCountryName } from "@/lib/utils/countries";
import LayoffCard from "@/components/layoffs/layoff-card";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company) return {};

  const t = await getTranslations({ locale, namespace: "company" });
  const title = t("metaTitle", { company: company.name });
  const description = locale === "de" ? company.descriptionDe : company.descriptionEn;

  return {
    title,
    description: description ?? undefined,
    alternates: {
      languages: { de: `/de/company/${slug}`, en: `/en/company/${slug}` },
    },
  };
}

export default async function CompanyDetailPage({ params }: Props) {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company) notFound();

  return <CompanyContent company={company} />;
}

function CompanyContent({ company }: { company: NonNullable<Awaited<ReturnType<typeof getCompanyBySlug>>> }) {
  const locale = useLocale() as "de" | "en";
  const t = useTranslations("company");
  const tType = useTranslations("companyType");
  const tHome = useTranslations("home");
  const tLayoff = useTranslations("layoff");

  const industryName = locale === "de" ? company.industry.nameDe : company.industry.nameEn;
  const description = locale === "de" ? company.descriptionDe : company.descriptionEn;
  const hqCountry = getCountryName(company.countryHq, locale);
  const hqFlag = getCountryFlag(company.countryHq);
  const hqDisplay = company.cityHq ? `${company.cityHq}, ${hqCountry}` : hqCountry;

  const totalAffected = company.layoffs.reduce(
    (sum, l) => sum + (l.affectedCount ?? 0),
    0,
  );

  const initials = company.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.name,
    url: company.website ?? undefined,
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <div className="flex items-start gap-5">
        {company.logoUrl ? (
          <Image src={company.logoUrl} alt={company.name} width={64} height={64} unoptimized className="h-16 w-16 rounded-xl object-contain" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-neutral-100 text-xl font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            {initials}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">
            {company.name}
          </h1>
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm text-teal-700 transition hover:underline dark:text-teal-400"
            >
              {company.website.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>
      </div>

      {description && (
        <p className="mt-4 leading-relaxed text-neutral-600 dark:text-neutral-300">
          {description}
        </p>
      )}

      {/* Info grid */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <InfoCard label={t("industry")} value={industryName} href={`/industry/${company.industrySlug}`} />
        <InfoCard label={t("headquarters")} value={`${hqFlag} ${hqDisplay}`} />
        {company.foundedYear != null && (
          <InfoCard label={t("founded")} value={String(company.foundedYear)} />
        )}
        {company.employeeCount != null && (
          <InfoCard label={t("employees")} value={company.employeeCount.toLocaleString("de-DE")} />
        )}
        <InfoCard label={t("type")} value={tType(company.companyType)} />
        <InfoCard label={t("totalLayoffs")} value={String(company.layoffs.length)} />
        {totalAffected > 0 && (
          <InfoCard label={t("totalAffected")} value={totalAffected.toLocaleString("de-DE")} />
        )}
      </div>

      {/* Layoff history */}
      <div className="mt-10">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
          {t("layoffHistory")}
        </h2>
        {company.layoffs.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-400">
            {tHome("noLayoffs")}
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {company.layoffs.map((layoff) => (
              <LayoffCard
                key={layoff.id}
                layoff={{
                  ...layoff,
                  company: {
                    name: company.name,
                    slug: company.slug,
                    logoUrl: company.logoUrl,
                    industrySlug: company.industrySlug,
                    countryHq: company.countryHq,
                  },
                }}
              />
            ))}
          </div>
        )}
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

function InfoCard({ label, value, href }: { label: string; value: string; href?: string }) {
  const inner = (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-white">{value}</p>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="rounded-xl transition hover:ring-2 hover:ring-teal-500/30">
        {inner}
      </Link>
    );
  }
  return inner;
}
