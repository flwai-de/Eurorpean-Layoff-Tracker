"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { europeanCountries, regionCodes, getCountryName } from "@/lib/utils/countries";

interface IndustryOption {
  slug: string;
  nameEn: string;
  nameDe: string;
}

interface LayoffFiltersProps {
  industries: IndustryOption[];
}

const PERIOD_VALUES = [
  { key: "all", days: 0 },
  { key: "lastWeek", days: 7 },
  { key: "lastMonth", days: 30 },
  { key: "last3Months", days: 90 },
  { key: "lastYear", days: 365 },
] as const;

export default function LayoffFilters({ industries }: LayoffFiltersProps) {
  const t = useTranslations("filters");
  const locale = useLocale() as "de" | "en";
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCountry = searchParams.get("country") ?? "";
  const currentIndustry = searchParams.get("industry") ?? "";
  const currentPeriod = searchParams.get("period") ?? "all";

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  function resetFilters() {
    router.push("/");
  }

  const hasFilters = currentCountry || currentIndustry || currentPeriod !== "all";

  const regions = Array.from(europeanCountries.entries()).filter(([code]) => regionCodes.has(code));
  const countries = Array.from(europeanCountries.entries())
    .filter(([code]) => !regionCodes.has(code))
    .sort((a, b) => {
      const nameA = locale === "de" ? a[1].nameDe : a[1].nameEn;
      const nameB = locale === "de" ? b[1].nameDe : b[1].nameEn;
      return nameA.localeCompare(nameB, locale);
    });

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Country */}
      <select
        value={currentCountry}
        onChange={(e) => updateFilter("country", e.target.value)}
        className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
      >
        <option value="">{t("country")}: {t("all")}</option>
        {regions.map(([code]) => (
          <option key={code} value={code}>
            {getCountryName(code, locale)}
          </option>
        ))}
        <option disabled>───────────</option>
        {countries.map(([code]) => (
          <option key={code} value={code}>
            {getCountryName(code, locale)}
          </option>
        ))}
      </select>

      {/* Industry */}
      <select
        value={currentIndustry}
        onChange={(e) => updateFilter("industry", e.target.value)}
        className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
      >
        <option value="">{t("industry")}: {t("all")}</option>
        {industries.map((ind) => (
          <option key={ind.slug} value={ind.slug}>
            {locale === "de" ? ind.nameDe : ind.nameEn}
          </option>
        ))}
      </select>

      {/* Period */}
      <select
        value={currentPeriod}
        onChange={(e) => updateFilter("period", e.target.value)}
        className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
      >
        {PERIOD_VALUES.map((p) => (
          <option key={p.key} value={p.key}>
            {t(p.key)}
          </option>
        ))}
      </select>

      {/* Reset */}
      {hasFilters && (
        <button
          onClick={resetFilters}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-500 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          {t("reset")}
        </button>
      )}
    </div>
  );
}
