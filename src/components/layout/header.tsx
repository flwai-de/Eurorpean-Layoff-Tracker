import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";
import LocaleSwitcher from "./locale-switcher";
import ThemeToggle from "./theme-toggle";
import MobileNav from "./mobile-nav";

export default function Header() {
  const t = useTranslations("common");

  const navLinkClass =
    "text-[13px] font-normal text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white";

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/70 bg-white/80 backdrop-blur dark:border-neutral-800/50 dark:bg-neutral-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-[19px] font-medium tracking-tight text-neutral-900 dark:text-white"
        >
          dimissio
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          <Link href="/" className={navLinkClass}>
            {t("home")}
          </Link>
          <Link href="/industries" className={navLinkClass}>
            {t("industries")}
          </Link>
          <Link href="/newsletter" className={navLinkClass}>
            {t("newsletter")}
          </Link>
          <Link href="/submit" className={navLinkClass}>
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
