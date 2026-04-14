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
    <div>
      <div className="mb-3 flex gap-5">
        <button
          onClick={() => setTab("top")}
          className={`pb-2 text-[11px] font-medium uppercase tracking-[0.5px] transition ${
            tab === "top"
              ? "border-b-[1.5px] border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
              : "text-neutral-400 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white"
          }`}
        >
          {t("topLayoffsTitle", { year: currentYear })}
        </button>
        <button
          onClick={() => setTab("trending")}
          className={`pb-2 text-[11px] font-medium uppercase tracking-[0.5px] transition ${
            tab === "trending"
              ? "border-b-[1.5px] border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
              : "text-neutral-400 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white"
          }`}
        >
          {t("trendingTitle")}
        </button>
      </div>

      {list.length === 0 ? (
        <p className="mt-4 text-[12px] text-neutral-400 dark:text-neutral-500">
          {t("noData")}
        </p>
      ) : (
        <ul>
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
              <li
                key={layoff.id}
                className="border-b border-neutral-200/70 last:border-b-0 dark:border-neutral-800/30"
              >
                <Link href={`/layoff/${layoff.id}`} className="group block py-2.5">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 w-5 shrink-0 text-[14px] font-medium tabular-nums text-neutral-400 dark:text-neutral-600">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-neutral-900 transition group-hover:underline dark:text-white">
                        {layoff.company.name}
                      </p>
                      <p className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">
                        {title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-neutral-400 dark:text-neutral-500">
                        <span>
                          {getCountryFlag(layoff.country)}{" "}
                          {getCountryName(layoff.country, locale)}
                        </span>
                        {layoff.affectedCount != null && (
                          <span>
                            · {tLayoff("affected")}:{" "}
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
