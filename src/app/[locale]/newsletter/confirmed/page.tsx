import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function ConfirmedPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const isError = error === "invalid";

  return <ConfirmedContent isError={isError} />;
}

function ConfirmedContent({ isError }: { isError: boolean }) {
  const t = useTranslations("newsletter");

  return (
    <div className="mx-auto max-w-lg px-6 py-20 text-center">
      <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full text-3xl ${
        isError ? "bg-red-100 dark:bg-red-900/30" : "bg-green-100 dark:bg-green-900/30"
      }`}>
        {isError ? "\u2717" : "\u2713"}
      </div>
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
        {isError ? t("confirmErrorTitle") : t("confirmedTitle")}
      </h1>
      <p className="mt-3 text-neutral-600 dark:text-neutral-400">
        {isError ? t("confirmErrorDescription") : t("confirmedDescription")}
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
