"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

export default function ConfirmationBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("newsletter");

  const confirmed = searchParams.get("confirmed");
  const [visible, setVisible] = useState(confirmed === "success" || confirmed === "already");

  if (!visible || (confirmed !== "success" && confirmed !== "already")) return null;

  const message =
    confirmed === "success" ? t("bannerSuccess") : t("bannerAlready");

  function close() {
    setVisible(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("confirmed");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="animate-in fade-in slide-in-from-top-2 w-full bg-teal-600 text-white duration-300 dark:bg-teal-700">
      <div className="mx-auto flex max-w-6xl items-start gap-3 px-6 py-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-0.5 shrink-0"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <p className="flex-1 text-sm font-medium">{message}</p>
        <button
          onClick={close}
          aria-label="Close"
          className="shrink-0 rounded p-1 text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
