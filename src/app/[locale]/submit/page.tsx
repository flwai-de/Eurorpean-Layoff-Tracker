"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { useTranslations } from "next-intl";
import { createSubmission } from "@/actions/submissions";

export default function SubmitPage() {
  const router = useRouter();
  const t = useTranslations("submit");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createSubmission(formData);
      if (result.success) {
        router.push("/submit/thanks");
      } else if (result.error === "RATE_LIMITED") {
        setError(t("rateLimited"));
      } else {
        setError(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        {t("description")}
      </p>

      <form action={handleSubmit} className="mt-8 space-y-6">
        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </div>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t("companyName")} *
          </span>
          <input
            name="companyName"
            required
            placeholder={t("companyNamePlaceholder")}
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t("details")} *
          </span>
          <textarea
            name="details"
            required
            minLength={20}
            rows={5}
            placeholder={t("detailsPlaceholder")}
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t("sourceUrl")}
          </span>
          <input
            name="sourceUrl"
            type="url"
            placeholder={t("sourceUrlPlaceholder")}
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t("email")}
          </span>
          <input
            name="submitterEmail"
            type="email"
            placeholder={t("emailPlaceholder")}
            className={inputCls}
          />
        </label>

        <label className="flex items-start gap-3">
          <input
            name="gdprConsent"
            type="checkbox"
            required
            className="mt-1 rounded border-neutral-300 dark:border-neutral-600"
          />
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            {t("gdprConsent")} *
          </span>
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {isPending ? t("sending") : t("send")}
        </button>
      </form>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-neutral-500";
