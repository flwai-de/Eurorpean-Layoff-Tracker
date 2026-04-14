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
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
              active ? "" : "pill-inactive border"
            }`}
            style={
              active
                ? {
                    backgroundColor: "var(--pill-active-bg)",
                    color: "var(--pill-active-fg)",
                  }
                : {
                    borderColor: "var(--pill-inactive-border)",
                    color: "var(--pill-inactive-text)",
                  }
            }
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
