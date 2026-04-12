"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/routing";
import { useSearchParams } from "next/navigation";

interface Chip {
  slug: string;
  nameEn: string;
  nameDe: string;
}

interface IndustryChipsProps {
  chips: Chip[];
}

export default function IndustryChips({ chips }: IndustryChipsProps) {
  const t = useTranslations("filters");
  const locale = useLocale() as "de" | "en";
  const router = useRouter();
  const searchParams = useSearchParams();

  const current = searchParams.get("industry") ?? "";

  function select(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!slug) params.delete("industry");
    else params.set("industry", slug);
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  const items: Array<{ slug: string; label: string }> = [
    { slug: "", label: t("all") },
    ...chips.map((c) => ({
      slug: c.slug,
      label: locale === "de" ? c.nameDe : c.nameEn,
    })),
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {items.map((item) => {
        const active = item.slug === current;
        return (
          <button
            key={item.slug || "all"}
            onClick={() => select(item.slug)}
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
