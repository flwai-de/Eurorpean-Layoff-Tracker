"use client";

import { useTranslations } from "next-intl";

export default function NewsletterForm() {
  const t = useTranslations("newsletter");

  return (
    <form className="mt-2 flex gap-2" onSubmit={(e) => e.preventDefault()}>
      <input
        type="email"
        placeholder={t("emailPlaceholder")}
        className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500"
      />
      <button
        type="submit"
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {t("submitButton")}
      </button>
    </form>
  );
}
