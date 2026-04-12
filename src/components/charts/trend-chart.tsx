"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts";

interface MonthlyPoint {
  month: string;
  layoffCount: number;
  affectedCount: number;
}

interface YearSummary {
  year: number;
  layoffCount: number;
  affectedCount: number;
}

interface TrendChartProps {
  yearsData: Record<number, MonthlyPoint[]>;
  summaries: YearSummary[];
  defaultYear: number;
}

const MONTHS_DE: Record<string, string> = {
  "01": "Jan", "02": "Feb", "03": "Mär", "04": "Apr",
  "05": "Mai", "06": "Jun", "07": "Jul", "08": "Aug",
  "09": "Sep", "10": "Okt", "11": "Nov", "12": "Dez",
};

const MONTHS_EN: Record<string, string> = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Aug",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
};

function formatMonth(yyyymm: string, locale: string): string {
  const mm = yyyymm.split("-")[1];
  const map = locale === "de" ? MONTHS_DE : MONTHS_EN;
  return map[mm] ?? mm;
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload as (MonthlyPoint & { label: string }) | undefined;
  if (!entry) return null;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3 text-sm shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
      <p className="font-medium text-neutral-900 dark:text-white">{label}</p>
      <p className="text-neutral-600 dark:text-neutral-300">
        Layoffs: {entry.layoffCount}
      </p>
      <p className="text-neutral-600 dark:text-neutral-300">
        Affected: {entry.affectedCount.toLocaleString()}
      </p>
    </div>
  );
}

export default function TrendChart({ yearsData, summaries, defaultYear }: TrendChartProps) {
  const t = useTranslations("home");
  const locale = useLocale();
  const [activeYear, setActiveYear] = useState(defaultYear);

  const years = useMemo(
    () => Object.keys(yearsData).map(Number).sort((a, b) => b - a),
    [yearsData],
  );

  const summaryMap = useMemo(
    () => new Map(summaries.map((s) => [s.year, s])),
    [summaries],
  );

  const chartData = (yearsData[activeYear] ?? []).map((d) => ({
    ...d,
    label: formatMonth(d.month, locale),
  }));

  const nf = locale === "de" ? "de-DE" : "en-US";

  return (
    <section className="mx-auto max-w-6xl px-6 py-8">
      <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
        {t("chartTitle", { year: activeYear })}
      </h2>

      {years.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {years.map((y) => {
            const active = y === activeYear;
            const s = summaryMap.get(y);
            return (
              <button
                key={y}
                onClick={() => setActiveYear(y)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                  active
                    ? "border-teal-500 bg-teal-50 text-teal-800 dark:border-teal-400 dark:bg-teal-950/40 dark:text-teal-300"
                    : "border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                }`}
              >
                <span className="block font-semibold">{y}</span>
                {s ? (
                  <span className="block text-xs opacity-80">
                    {s.layoffCount.toLocaleString(nf)} {t("layoffsWord")} &middot;{" "}
                    {s.affectedCount.toLocaleString(nf)} {t("affectedWord")}
                  </span>
                ) : (
                  <span className="block text-xs opacity-60">{t("noData")}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <XAxis
              dataKey="label"
              tick={{ fill: "#a3a3a3", fontSize: 12 }}
              axisLine={{ stroke: "#404040" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#a3a3a3", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(115,115,115,0.1)" }} />
            <Bar dataKey="layoffCount" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
