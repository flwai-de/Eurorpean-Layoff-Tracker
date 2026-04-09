import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";
import LocaleSwitcher from "./locale-switcher";
import ThemeToggle from "./theme-toggle";
import MobileNav from "./mobile-nav";

export default function Header() {
  const t = useTranslations("common");

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-xl font-bold text-neutral-900 dark:text-white">
          dimissio
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/" className="text-sm text-neutral-600 transition hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white">
            {t("home")}
          </Link>
          <Link href="/industries" className="text-sm text-neutral-600 transition hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white">
            {t("industries")}
          </Link>
          <Link href="/#newsletter" className="text-sm text-neutral-600 transition hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white">
            {t("newsletter")}
          </Link>
          <Link href="/submit" className="text-sm text-neutral-600 transition hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white">
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
