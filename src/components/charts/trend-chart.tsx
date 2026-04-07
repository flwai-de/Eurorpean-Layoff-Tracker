"use client";

import { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts";

interface TrendChartProps {
  data: { month: string; layoffCount: number; affectedCount: number }[];
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

function formatMonth(yyyymm: string): string {
  const mm = yyyymm.split("-")[1];
  return MONTHS_EN[mm] ?? mm;
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload as TrendChartProps["data"][number] | undefined;
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

export default function TrendChart({ data }: TrendChartProps) {
  const t = useTranslations("home");

  if (data.length === 0) {
    return (
      <section className="mx-auto max-w-6xl px-6 py-8">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
          {t("chartTitle")}
        </h2>
        <div className="mt-4 flex h-48 items-center justify-center rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-sm text-neutral-400">{t("noData")}</p>
        </div>
      </section>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: formatMonth(d.month),
  }));

  return (
    <section className="mx-auto max-w-6xl px-6 py-8">
      <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
        {t("chartTitle")}
      </h2>
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
