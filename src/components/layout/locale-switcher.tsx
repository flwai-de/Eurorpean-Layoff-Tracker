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
    <div className="flex items-center gap-1 text-[12px]">
      <button
        onClick={() => switchLocale("de")}
        className="nav-link px-1.5 py-0.5 transition-colors"
        style={{
          color:
            locale === "de" ? "var(--text-primary)" : "var(--text-muted)",
          fontWeight: locale === "de" ? 500 : 400,
        }}
      >
        DE
      </button>
      <span style={{ color: "var(--text-muted)", opacity: 0.5 }}>|</span>
      <button
        onClick={() => switchLocale("en")}
        className="nav-link px-1.5 py-0.5 transition-colors"
        style={{
          color:
            locale === "en" ? "var(--text-primary)" : "var(--text-muted)",
          fontWeight: locale === "en" ? 500 : 400,
        }}
      >
        EN
      </button>
    </div>
  );
}
