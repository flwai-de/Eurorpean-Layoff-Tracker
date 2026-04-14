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

  const tabStyle = (active: boolean) =>
    active
      ? {
          color: "var(--text-primary)",
          borderBottom: "1.5px solid var(--text-primary)",
        }
      : { color: "var(--text-muted)" };

  return (
    <div>
      <div className="mb-3 flex gap-5">
        <button
          onClick={() => setTab("top")}
          className="pb-2 text-[11px] font-medium uppercase tracking-[0.5px] transition-colors"
          style={tabStyle(tab === "top")}
        >
          {t("topLayoffsTitle", { year: currentYear })}
        </button>
        <button
          onClick={() => setTab("trending")}
          className="pb-2 text-[11px] font-medium uppercase tracking-[0.5px] transition-colors"
          style={tabStyle(tab === "trending")}
        >
          {t("trendingTitle")}
        </button>
      </div>

      {list.length === 0 ? (
        <p
          className="mt-4 text-[12px]"
          style={{ color: "var(--text-muted)" }}
        >
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
              <li key={layoff.id}>
                <Link
                  href={`/layoff/${layoff.id}`}
                  className="row-link -mx-2 flex items-start gap-3 rounded-md px-2 py-2.5"
                >
                  <span
                    className="mt-0.5 w-5 shrink-0 text-[14px] font-medium tabular-nums"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[13px] font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {layoff.company.name}
                    </p>
                    <p
                      className="truncate text-[11px]"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {title}
                    </p>
                    <div
                      className="mt-0.5 flex items-center gap-2 text-[10px]"
                      style={{ color: "var(--text-muted)" }}
                    >
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
                  <svg
                    className="h-3.5 w-3.5 shrink-0 self-center opacity-30"
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
