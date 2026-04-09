"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { subscribeToNewsletter } from "@/actions/newsletter";

export default function NewsletterPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("newsletter");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    formData.set("language", locale);
    setError(null);
    startTransition(async () => {
      const result = await subscribeToNewsletter(formData);
      if (result.success) {
        router.push("/newsletter/confirm-pending");
      } else if (result.error === "RATE_LIMITED") {
        setError(t("rateLimited"));
      } else if (result.error === "ALREADY_SUBSCRIBED") {
        setError(t("alreadySubscribed"));
      } else {
        setError(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        {t("description")}
      </p>

      <form action={handleSubmit} className="mt-8 space-y-5">
        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </div>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t("emailPlaceholder")}
          </span>
          <input
            name="email"
            type="email"
            required
            placeholder="name@example.com"
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-500"
          />
        </label>

        <input type="hidden" name="language" value={locale} />

        <label className="flex items-start gap-3">
          <input
            name="gdprConsent"
            type="checkbox"
            required
            className="mt-1 rounded border-neutral-300 dark:border-neutral-600"
          />
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            {t("gdprConsent")}
          </span>
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {isPending ? t("sending") : t("submitButton")}
        </button>
      </form>
    </div>
  );
}
