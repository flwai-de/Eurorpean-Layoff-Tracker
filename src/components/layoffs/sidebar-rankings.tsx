"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";
import { getCountryFlag, getCountryName } from "@/lib/utils/countries";
import { generateLayoffTitle } from "@/lib/utils/generate-title";
import type { LayoffWithCompany } from "@/lib/queries/public";

interface SidebarRankingsProps {
  topLayoffs: LayoffWithCompany[];
  trending: LayoffWithCompany[];
  currentYear: number;
}

type Tab = "top" | "trending";

export default function SidebarRankings({
  topLayoffs,
  trending,
  currentYear,
}: SidebarRankingsProps) {
  const t = useTranslations("home");
  const tLayoff = useTranslations("layoff");
  const locale = useLocale() as "de" | "en";
  const [tab, setTab] = useState<Tab>("top");

  const list = tab === "top" ? topLayoffs : trending;
  const nf = locale === "de" ? "de-DE" : "en-US";

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-3 flex gap-2 border-b border-neutral-200 dark:border-neutral-800">
        <button
          onClick={() => setTab("top")}
          className={`-mb-px border-b-2 px-2 py-2 text-sm font-semibold transition ${
            tab === "top"
              ? "border-teal-600 text-teal-700 dark:border-teal-400 dark:text-teal-400"
              : "border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          }`}
        >
          {t("topLayoffsTitle", { year: currentYear })}
        </button>
        <button
          onClick={() => setTab("trending")}
          className={`-mb-px border-b-2 px-2 py-2 text-sm font-semibold transition ${
            tab === "trending"
              ? "border-teal-600 text-teal-700 dark:border-teal-400 dark:text-teal-400"
              : "border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          }`}
        >
          {t("trendingTitle")}
        </button>
      </div>

      {list.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-400">{t("noData")}</p>
      ) : (
        <ul className="space-y-3">
          {list.map((layoff, i) => {
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
            return (
              <li key={layoff.id}>
                <Link href={`/layoff/${layoff.id}`} className="group block">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-900 transition group-hover:text-teal-700 dark:text-white dark:group-hover:text-teal-400">
                        {layoff.company.name}
                      </p>
                      <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {title}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
                        <span>
                          {getCountryFlag(layoff.country)}{" "}
                          {getCountryName(layoff.country, locale)}
                        </span>
                        {layoff.affectedCount != null && (
                          <span>
                            {tLayoff("affected")}:{" "}
                            {layoff.affectedCount.toLocaleString(nf)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
