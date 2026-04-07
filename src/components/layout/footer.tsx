import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* About */}
          <div>
            <p className="text-lg font-bold text-neutral-900 dark:text-white">dimissio</p>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              {t("common.footerText")}
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">Links</p>
            <ul className="mt-2 space-y-2 text-sm">
              <li>
                <a href="#" className="text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
                  {t("common.privacy")}
                </a>
              </li>
              <li>
                <a href="#" className="text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
                  {t("common.imprint")}
                </a>
              </li>
              <li>
                <a href="#" className="text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
                  {t("common.apiDocs")}
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter mini signup */}
          <div id="newsletter">
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
              {t("newsletter.subscribe")}
            </p>
            <form className="mt-2 flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder={t("newsletter.emailPlaceholder")}
                className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500"
              />
              <button
                type="submit"
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                {t("newsletter.submitButton")}
              </button>
            </form>
            <p className="mt-2 text-xs text-neutral-400">
              {t("newsletter.gdprNotice")}
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-neutral-200 pt-6 text-center text-xs text-neutral-400 dark:border-neutral-800">
          &copy; {year} Dimissio
        </div>
      </div>
    </footer>
  );
}
