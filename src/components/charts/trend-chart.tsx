"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
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
    <div
      className="rounded-lg border p-3 text-[12px] shadow-lg"
      style={{
        backgroundColor: "var(--bg-elevated)",
        borderColor: "var(--border-default)",
      }}
    >
      <p className="font-medium" style={{ color: "var(--text-primary)" }}>
        {label}
      </p>
      <p style={{ color: "var(--text-secondary)" }}>
        Layoffs: {entry.layoffCount}
      </p>
      <p style={{ color: "var(--text-secondary)" }}>
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
    <section className="mx-auto max-w-6xl px-6 pt-6 pb-12">
      <p
        className="mb-4 text-[10px] font-medium uppercase tracking-[1.5px]"
        style={{ color: "var(--text-muted)" }}
      >
        {t("chartTitle", { year: activeYear })}
      </p>

      {years.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-1">
          {years.map((y) => {
            const active = y === activeYear;
            const s = summaryMap.get(y);
            return (
              <button
                key={y}
                onClick={() => setActiveYear(y)}
                className="rounded-lg px-4 py-2 text-left text-[12px] font-medium transition"
                style={
                  active
                    ? {
                        backgroundColor: "var(--tab-active-bg)",
                        color: "var(--tab-active-fg)",
                      }
                    : { color: "var(--text-muted)" }
                }
              >
                <span className="block">{y}</span>
                {s ? (
                  <span
                    className="block text-[10px] font-normal"
                    style={
                      active
                        ? { color: "var(--text-muted)", opacity: 0.7 }
                        : { color: "var(--text-muted)" }
                    }
                  >
                    {s.layoffCount.toLocaleString(nf)} {t("layoffsWord")} &middot;{" "}
                    {s.affectedCount.toLocaleString(nf)} {t("affectedWord")}
                  </span>
                ) : (
                  <span
                    className="block text-[10px] font-normal"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {t("noData")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div
        className="rounded-xl border p-6"
        style={{ borderColor: "var(--chart-border)" }}
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid
              vertical={false}
              stroke="var(--chart-grid)"
              strokeDasharray="0"
            />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "rgba(115,115,115,0.08)" }}
            />
            <Bar
              dataKey="layoffCount"
              fill="#4DB8A0"
              fillOpacity={0.55}
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
