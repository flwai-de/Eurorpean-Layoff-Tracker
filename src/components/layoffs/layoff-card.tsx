import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";
import { getCountryFlag, getCountryName } from "@/lib/utils/countries";
import { generateLayoffTitle } from "@/lib/utils/generate-title";
import type { LayoffWithCompany } from "@/lib/queries/public";

interface LayoffCardProps {
  layoff: LayoffWithCompany;
}

function getRelativeTime(dateStr: string, locale: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return locale === "de" ? "Heute" : "Today";
  if (diffDays === 1) return locale === "de" ? "Gestern" : "Yesterday";
  if (diffDays < 7) return locale === "de" ? `vor ${diffDays} Tagen` : `${diffDays}d ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return locale === "de" ? `vor ${weeks} Wo.` : `${weeks}w ago`;
  }
  const months = Math.floor(diffDays / 30);
  return locale === "de" ? `vor ${months} Mon.` : `${months}mo ago`;
}

export default function LayoffCard({ layoff }: LayoffCardProps) {
  const locale = useLocale() as "de" | "en";
  const t = useTranslations("layoff");
  const rawTitle = locale === "de" ? layoff.titleDe : layoff.titleEn;
  const title = rawTitle ?? generateLayoffTitle({
    companyName: layoff.company.name,
    affectedCount: layoff.affectedCount,
    affectedPercentage: layoff.affectedPercentage,
    isShutdown: layoff.isShutdown,
  }, locale);
  const flag = getCountryFlag(layoff.country);
  const countryName = getCountryName(layoff.country, locale);
  const initials = layoff.company.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const industryName = layoff.company.industry
    ? locale === "de"
      ? layoff.company.industry.nameDe
      : layoff.company.industry.nameEn
    : null;

  return (
    <div className="group relative flex items-center gap-4 border-b border-neutral-200 py-4 transition dark:border-neutral-800/50">
      <Link
        href={`/layoff/${layoff.id}`}
        className="absolute inset-0 z-0"
        aria-label={title}
      />

      {/* Logo / Initials */}
      {layoff.company.logoUrl ? (
        <Image
          src={layoff.company.logoUrl}
          alt={layoff.company.name}
          width={34}
          height={34}
          unoptimized
          className="h-[34px] w-[34px] shrink-0 rounded-lg object-contain"
        />
      ) : (
        <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-[13px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          {initials}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <Link
            href={`/company/${layoff.company.slug}`}
            className="text-[14px] font-medium text-neutral-900 hover:underline dark:text-white"
          >
            {layoff.company.name}
          </Link>
          {industryName && layoff.company.industrySlug && (
            <Link
              href={`/industry/${layoff.company.industrySlug}`}
              className="text-[11px] text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
            >
              {industryName}
            </Link>
          )}
        </div>
        <p className="mt-0.5 truncate text-[13px] text-neutral-500 dark:text-neutral-400">
          {title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-neutral-400 dark:text-neutral-500">
          <Link
            href={`/country/${layoff.country}`}
            className="relative z-10 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            {flag} {countryName}
          </Link>
          {layoff.affectedCount != null && (
            <span>
              · {t("affected")}: {layoff.affectedCount.toLocaleString("de-DE")}
            </span>
          )}
        </div>
      </div>

      {/* Right-aligned affected count + date */}
      <div className="relative z-0 shrink-0 text-right">
        {layoff.affectedCount != null ? (
          <p className="text-[18px] font-medium tabular-nums tracking-[-0.5px] text-red-500">
            {layoff.affectedCount.toLocaleString("de-DE")}
          </p>
        ) : (
          <p className="text-[18px] font-medium text-neutral-400 dark:text-neutral-600">—</p>
        )}
        <p className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">
          {getRelativeTime(layoff.date, locale)}
        </p>
      </div>
    </div>
  );
}
