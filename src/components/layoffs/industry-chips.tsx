"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/routing";
import { useSearchParams } from "next/navigation";

interface ChipStat {
  key: string;
  labelEn: string;
  labelDe: string;
}

interface IndustryChipsProps {
  chips: ChipStat[];
}

export default function IndustryChips({ chips }: IndustryChipsProps) {
  const t = useTranslations("filters");
  const tGroups = useTranslations("industryGroups");
  const locale = useLocale() as "de" | "en";
  const router = useRouter();
  const searchParams = useSearchParams();

  const current = searchParams.get("industry") ?? "";

  function select(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!key) params.delete("industry");
    else params.set("industry", key);
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  function labelFor(chip: ChipStat): string {
    try {
      return tGroups(chip.key);
    } catch {
      return locale === "de" ? chip.labelDe : chip.labelEn;
    }
  }

  const items: Array<{ key: string; label: string }> = [
    { key: "", label: t("all") },
    ...chips.map((c) => ({ key: c.key, label: labelFor(c) })),
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {items.map((item) => {
        const active = item.key === current;
        return (
          <button
            key={item.key || "all"}
            onClick={() => select(item.key)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-teal-600 text-white dark:bg-teal-500"
                : "border border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
