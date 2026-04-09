"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { sendNewsletter } from "@/actions/newsletter";

interface LayoffOption {
  id: string;
  date: string;
  affectedCount: number | null;
  country: string;
  companyName: string;
}

export default function NewsletterComposer({ layoffs }: { layoffs: LayoffOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleLayoff(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(layoffs.map((l) => l.id)));
  }

  function handleSubmit(formData: FormData) {
    if (selected.size === 0) {
      setError("Select at least one layoff.");
      return;
    }

    // Append selected layoff IDs and sponsor data
    for (const id of selected) {
      formData.append("layoffIds", id);
    }

    setError(null);
    startTransition(async () => {
      const result = await sendNewsletter(formData);
      if (result.success) {
        setSuccess(true);
        router.refresh();
      } else {
        setError(result.error ?? "Failed to send");
      }
    });
  }

  if (success) {
    return (
      <div className="rounded-lg border border-green-800 bg-green-950/50 p-6 text-center">
        <p className="font-semibold text-green-400">Newsletter queued for sending!</p>
        <button
          onClick={() => { setSuccess(false); setSelected(new Set()); }}
          className="mt-4 text-sm text-neutral-400 hover:text-white"
        >
          Compose another
        </button>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-neutral-300">Subject (EN) *</span>
          <input
            name="subjectEn"
            required
            placeholder="European Layoff Roundup — Week of..."
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-neutral-300">Subject (DE) *</span>
          <input
            name="subjectDe"
            required
            placeholder="Europäische Entlassungen — Woche vom..."
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none"
          />
        </label>
      </div>

      {/* Sponsor (optional) */}
      <details className="rounded-lg border border-neutral-800 p-4">
        <summary className="cursor-pointer text-sm font-medium text-neutral-300">
          Sponsor Block (optional)
        </summary>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-400">Sponsor Headline</span>
            <input
              name="sponsorHeadline"
              placeholder="e.g. Presented by Acme HR"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-400">Sponsor Body</span>
            <input
              name="sponsorBody"
              placeholder="Short sponsor message..."
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-400">Sponsor URL</span>
            <input
              name="sponsorUrl"
              type="url"
              placeholder="https://..."
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none"
            />
          </label>
        </div>
      </details>

      {/* Layoff selection */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-300">
            Select Layoffs ({selected.size} selected)
          </span>
          <button type="button" onClick={selectAll} className="text-xs text-teal-400 hover:underline">
            Select all
          </button>
        </div>

        {layoffs.length === 0 ? (
          <p className="text-sm text-neutral-400">No unpublished verified layoffs in the last 2 weeks.</p>
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg border border-neutral-800 p-3">
            {layoffs.map((l) => (
              <label
                key={l.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg p-3 transition ${
                  selected.has(l.id)
                    ? "border border-teal-700 bg-teal-950/30"
                    : "border border-neutral-800 bg-neutral-900 hover:border-neutral-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(l.id)}
                  onChange={() => toggleLayoff(l.id)}
                  className="rounded border-neutral-600"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-white">{l.companyName}</span>
                  <span className="ml-2 text-xs text-neutral-400">
                    {l.country} {l.affectedCount ? `\u2022 ${l.affectedCount.toLocaleString()} affected` : ""} \u2022 {l.date}
                  </span>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending || selected.size === 0}
        className="rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200 disabled:opacity-50"
      >
        {isPending ? "Sending..." : "Send Newsletter"}
      </button>
    </form>
  );
}
