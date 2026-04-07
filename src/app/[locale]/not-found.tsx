import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";

export default function NotFoundPage() {
  const t = useTranslations("notFound");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-6xl font-bold text-neutral-300 dark:text-neutral-700">404</p>
      <h1 className="mt-4 text-xl font-bold text-neutral-900 dark:text-white">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        {t("description")}
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
