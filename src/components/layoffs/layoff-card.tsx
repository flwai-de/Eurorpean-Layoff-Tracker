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
  const title =
    rawTitle ??
    generateLayoffTitle(
      {
        companyName: layoff.company.name,
        affectedCount: layoff.affectedCount,
        affectedPercentage: layoff.affectedPercentage,
        isShutdown: layoff.isShutdown,
      },
      locale,
    );
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
    <Link
      href={`/layoff/${layoff.id}`}
      aria-label={title}
      className="row-link -mx-2.5 flex items-center gap-3.5 rounded-lg px-2.5 py-3"
    >
      {/* Logo / Initials */}
      {layoff.company.logoUrl ? (
        <Image
          src={layoff.company.logoUrl}
          alt=""
          width={34}
          height={34}
          unoptimized
          className="h-[34px] w-[34px] shrink-0 rounded-lg object-contain"
        />
      ) : (
        <div
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg text-[13px] font-medium"
          style={{
            backgroundColor: "var(--initial-bg)",
            color: "var(--initial-text)",
          }}
        >
          {initials}
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span
            className="text-[14px] font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            {layoff.company.name}
          </span>
          {industryName && (
            <span
              className="text-[11px]"
              style={{ color: "var(--text-muted)" }}
            >
              {industryName}
            </span>
          )}
        </div>
        <p
          className="mt-0.5 truncate text-[13px]"
          style={{ color: "var(--text-secondary)" }}
        >
          {title}
        </p>
        <div
          className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px]"
          style={{ color: "var(--text-muted)" }}
        >
          <span>
            {flag} {countryName}
          </span>
          {layoff.affectedCount != null && (
            <span>
              · {t("affected")}: {layoff.affectedCount.toLocaleString("de-DE")}
            </span>
          )}
        </div>
      </div>

      {/* Right-aligned affected count + date */}
      <div className="shrink-0 text-right">
        {layoff.affectedCount != null ? (
          <p
            className="text-[18px] font-medium tabular-nums tracking-[-0.5px]"
            style={{ color: "var(--accent-danger)" }}
          >
            {layoff.affectedCount.toLocaleString("de-DE")}
          </p>
        ) : (
          <p
            className="text-[18px] font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            —
          </p>
        )}
        <p
          className="mt-0.5 text-[10px]"
          style={{ color: "var(--text-muted)" }}
        >
          {getRelativeTime(layoff.date, locale)}
        </p>
      </div>

      {/* Chevron */}
      <svg
        className="h-4 w-4 shrink-0 opacity-30"
        viewBox="0 0 16 16"
        fill="none"
        style={{ color: "var(--text-muted)" }}
        aria-hidden="true"
      >
        <path
          d="M6 4l4 4-4 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}
