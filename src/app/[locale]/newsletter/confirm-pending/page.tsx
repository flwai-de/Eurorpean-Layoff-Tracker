import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";

export default function ConfirmPendingPage() {
  const t = useTranslations("newsletter");

  return (
    <div className="mx-auto max-w-lg px-6 py-20 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-3xl dark:bg-blue-900/30">
        &#9993;
      </div>
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
        {t("pendingTitle")}
      </h1>
      <p className="mt-3 text-neutral-600 dark:text-neutral-400">
        {t("pendingDescription")}
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
