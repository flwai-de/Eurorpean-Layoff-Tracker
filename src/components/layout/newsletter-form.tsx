"use client";

import { useTransition, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { subscribeToNewsletter } from "@/actions/newsletter";

export default function NewsletterForm() {
  const t = useTranslations("newsletter");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleSubmit(formData: FormData) {
    formData.set("language", locale);
    formData.set("gdprConsent", "on");
    setStatus("idle");
    startTransition(async () => {
      const result = await subscribeToNewsletter(formData);
      if (result.success) {
        setStatus("success");
      } else {
        setStatus("error");
        if (result.error === "ALREADY_SUBSCRIBED") {
          setErrorMsg(t("alreadySubscribed"));
        } else if (result.error === "RATE_LIMITED") {
          setErrorMsg(t("rateLimited"));
        } else {
          setErrorMsg(result.error ?? "Error");
        }
      }
    });
  }

  if (status === "success") {
    return (
      <p className="mt-2 text-sm text-green-600 dark:text-green-400">
        {t("pendingTitle")}
      </p>
    );
  }

  return (
    <form className="mt-3" action={handleSubmit}>
      <div className="flex gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder={t("emailPlaceholder")}
          className="flex-1 rounded-lg border border-neutral-200 bg-transparent px-3 py-2 text-[12px] text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none dark:border-neutral-800/50 dark:text-white dark:placeholder:text-neutral-600 dark:focus:border-neutral-600"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-[12px] font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {isPending ? "..." : t("submitButton")}
        </button>
      </div>
      {status === "error" && (
        <p className="mt-1 text-[10px] text-red-500 dark:text-red-400">{errorMsg}</p>
      )}
    </form>
  );
}
