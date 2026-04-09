import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";

export const metadata: Metadata = {
  title: "Thank you | Dimissio",
};

export default function ThanksPage() {
  const t = useTranslations("submit");

  return (
    <div className="mx-auto max-w-2xl px-6 py-20 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl dark:bg-green-900/30">
        &#10003;
      </div>
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
        {t("thanksTitle")}
      </h1>
      <p className="mt-3 text-neutral-600 dark:text-neutral-400">
        {t("thanksDescription")}
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
