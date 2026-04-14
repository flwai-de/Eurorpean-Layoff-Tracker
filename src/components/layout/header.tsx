import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";
import LocaleSwitcher from "./locale-switcher";
import ThemeToggle from "./theme-toggle";
import MobileNav from "./mobile-nav";

export default function Header() {
  const t = useTranslations("common");

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur"
      style={{
        backgroundColor: "color-mix(in srgb, var(--bg-base) 80%, transparent)",
        borderColor: "var(--border-default)",
      }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-[19px] font-medium tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          dimissio
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          <Link
            href="/"
            className="nav-link text-[13px] font-normal transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("home")}
          </Link>
          <Link
            href="/industries"
            className="nav-link text-[13px] font-normal transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("industries")}
          </Link>
          <Link
            href="/newsletter"
            className="nav-link text-[13px] font-normal transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("newsletter")}
          </Link>
          <Link
            href="/submit"
            className="nav-link text-[13px] font-normal transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("submitTip")}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
