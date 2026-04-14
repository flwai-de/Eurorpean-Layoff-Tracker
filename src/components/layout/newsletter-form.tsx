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
          className="select-filter flex-1 rounded-lg border bg-transparent px-3 py-2 text-[12px] focus:outline-none focus:ring-1"
          style={{
            borderColor: "var(--border-default)",
            color: "var(--text-primary)",
          }}
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg px-4 py-2 text-[12px] font-medium transition disabled:opacity-50"
          style={{
            backgroundColor: "var(--pill-active-bg)",
            color: "var(--pill-active-fg)",
          }}
        >
          {isPending ? "..." : t("submitButton")}
        </button>
      </div>
      {status === "error" && (
        <p className="mt-1 text-[10px]" style={{ color: "var(--accent-danger)" }}>
          {errorMsg}
        </p>
      )}
    </form>
  );
}
