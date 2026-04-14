import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";
import NewsletterForm from "./newsletter-form";

export default function Footer() {
  const t = useTranslations();
  const year = new Date().getFullYear();

  const linkClass =
    "text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-neutral-300";

  return (
    <footer className="mt-16 border-t border-neutral-200/70 bg-transparent dark:border-neutral-800/50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* About */}
          <div>
            <p className="text-[13px] font-medium text-neutral-900 dark:text-white">
              dimissio
            </p>
            <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-500">
              {t("common.footerText")}
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[1.5px] text-neutral-500 dark:text-neutral-500">
              Links
            </p>
            <ul className="mt-3 space-y-2 text-[11px]">
              <li>
                <Link href="/datenschutz" className={linkClass}>
                  {t("common.privacy")}
                </Link>
              </li>
              <li>
                <Link href="/impressum" className={linkClass}>
                  {t("common.imprint")}
                </Link>
              </li>
              <li>
                <Link href="/api-docs" className={linkClass}>
                  {t("common.apiDocs")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter mini signup */}
          <div id="newsletter">
            <p className="text-[10px] font-medium uppercase tracking-[1.5px] text-neutral-500 dark:text-neutral-500">
              {t("newsletter.subscribe")}
            </p>
            <NewsletterForm />
            <p className="mt-2 text-[10px] text-neutral-400 dark:text-neutral-600">
              {t("newsletter.gdprNotice")}
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-neutral-200/70 pt-6 text-center text-[10px] text-neutral-400 dark:border-neutral-800/30 dark:text-neutral-600">
          &copy; {year} Dimissio
        </div>
      </div>
    </footer>
  );
}
