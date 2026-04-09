import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";

export default function UnsubscribedPage() {
  const t = useTranslations("newsletter");

  return (
    <div className="mx-auto max-w-lg px-6 py-20 text-center">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
        {t("unsubscribedTitle")}
      </h1>
      <p className="mt-3 text-neutral-600 dark:text-neutral-400">
        {t("unsubscribedDescription")}
      </p>
      <Link
        href="/"
        className="mt-8 inline-block text-sm text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
      >
        &larr; {t("backHome")}
      </Link>
    </div>
  );
}
