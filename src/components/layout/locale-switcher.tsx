"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/lib/i18n/routing";

export default function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(next: "de" | "en") {
    router.replace(pathname, { locale: next });
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      <button
        onClick={() => switchLocale("de")}
        className={`px-1.5 py-0.5 transition ${
          locale === "de"
            ? "font-bold text-white"
            : "text-neutral-400 hover:text-white"
        }`}
      >
        DE
      </button>
      <span className="text-neutral-600">|</span>
      <button
        onClick={() => switchLocale("en")}
        className={`px-1.5 py-0.5 transition ${
          locale === "en"
            ? "font-bold text-white"
            : "text-neutral-400 hover:text-white"
        }`}
      >
        EN
      </button>
    </div>
  );
}
