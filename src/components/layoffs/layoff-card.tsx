import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";
import { getCountryFlag, getCountryName } from "@/lib/utils/countries";
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
  const title = locale === "de" ? layoff.titleDe : layoff.titleEn;
  const flag = getCountryFlag(layoff.country);
  const countryName = getCountryName(layoff.country, locale);
  const initials = layoff.company.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <Link
      href={`/layoff/${layoff.id}`}
      className="group flex gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
    >
      {/* Logo / Initials */}
      {layoff.company.logoUrl ? (
        <Image
          src={layoff.company.logoUrl}
          alt={layoff.company.name}
          width={40}
          height={40}
          unoptimized
          className="h-10 w-10 shrink-0 rounded-lg object-contain"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-xs font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          {initials}
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
              {layoff.company.name}
            </p>
            <p className="mt-0.5 truncate text-sm text-neutral-600 dark:text-neutral-300">
              {title}
            </p>
          </div>
          <span className="shrink-0 text-xs text-neutral-400">
            {getRelativeTime(layoff.date, locale)}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
          <span>
            {flag} {countryName}
          </span>
          {layoff.affectedCount != null && (
            <span>
              {t("affected")}: {layoff.affectedCount.toLocaleString("de-DE")}
            </span>
          )}
          {layoff.company.industrySlug && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">
              {layoff.company.industrySlug}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
