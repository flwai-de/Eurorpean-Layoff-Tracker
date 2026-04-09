"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { processSubmission, rejectSubmission } from "@/actions/submissions";
import type { Submission } from "@/lib/db/schema";

export default function SubmissionList({ submissions }: { submissions: Submission[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleProcess(sub: Submission) {
    startTransition(async () => {
      await processSubmission(sub.id);
      const params = new URLSearchParams();
      if (sub.companyName) params.set("companyName", sub.companyName);
      if (sub.sourceUrl) params.set("sourceUrl", sub.sourceUrl);
      router.push(`/admin/layoffs/new?${params.toString()}`);
    });
  }

  function handleReject(id: string) {
    startTransition(async () => {
      await rejectSubmission(id);
      router.refresh();
    });
  }

  if (submissions.length === 0) {
    return <p className="text-sm text-neutral-400">No submissions found.</p>;
  }

  return (
    <div className="space-y-4">
      {submissions.map((sub) => (
        <div
          key={sub.id}
          className="rounded-lg border border-neutral-800 bg-neutral-900 p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white">{sub.companyName}</p>
              <p className="mt-1 text-sm text-neutral-300">
                {sub.details.length > 300
                  ? sub.details.slice(0, 300) + "..."
                  : sub.details}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400">
                {sub.sourceUrl && (
                  <a
                    href={sub.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-400 hover:underline"
                  >
                    Source
                  </a>
                )}
                {sub.submitterEmail && <span>{sub.submitterEmail}</span>}
                <span>{new Date(sub.createdAt).toLocaleDateString("de-DE")}</span>
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${
                    sub.status === "pending"
                      ? "bg-yellow-900/50 text-yellow-400"
                      : sub.status === "processed"
                        ? "bg-green-900/50 text-green-400"
                        : "bg-red-900/50 text-red-400"
                  }`}
                >
                  {sub.status}
                </span>
              </div>
            </div>
            {sub.status === "pending" && (
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => handleProcess(sub)}
                  disabled={isPending}
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-200 disabled:opacity-50"
                >
                  Process
                </button>
                <button
                  onClick={() => handleReject(sub.id)}
                  disabled={isPending}
                  className="rounded-lg border border-red-900 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-950 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
