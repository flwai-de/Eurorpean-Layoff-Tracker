"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("common");

  const linkClass = "nav-link text-[13px] font-normal transition-colors";
  const linkStyle = { color: "var(--text-secondary)" };

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
        className="rounded-lg p-2 transition-colors"
        style={{ color: "var(--text-muted)" }}
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        )}
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 top-16 border-b p-4"
          style={{
            backgroundColor: "var(--bg-base)",
            borderColor: "var(--border-default)",
          }}
        >
          <nav className="flex flex-col gap-3">
            <Link href="/" onClick={() => setOpen(false)} className={linkClass} style={linkStyle}>
              {t("home")}
            </Link>
            <Link href="/industries" onClick={() => setOpen(false)} className={linkClass} style={linkStyle}>
              {t("industries")}
            </Link>
            <Link href="/newsletter" onClick={() => setOpen(false)} className={linkClass} style={linkStyle}>
              {t("newsletter")}
            </Link>
            <Link href="/submit" onClick={() => setOpen(false)} className={linkClass} style={linkStyle}>
              {t("submitTip")}
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
