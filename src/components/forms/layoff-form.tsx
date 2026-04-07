"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState, useEffect, useRef } from "react";
import { searchCompanies } from "@/actions/companies";
import { generateLayoffTitle } from "@/lib/utils/generate-title";
import type { Layoff } from "@/lib/db/schema";

type Props = {
  layoff?: Layoff & { companyName?: string };
  action: (formData: FormData) => Promise<{ success: boolean; error?: string; data?: { id: string } }>;
};

const REGIONS = [
  { code: "EU", name: "Europe (EU-wide)" },
  { code: "WW", name: "Worldwide" },
];

const EUROPEAN_COUNTRIES = [
  { code: "AT", name: "Austria" }, { code: "BE", name: "Belgium" }, { code: "BG", name: "Bulgaria" },
  { code: "HR", name: "Croatia" }, { code: "CY", name: "Cyprus" }, { code: "CZ", name: "Czechia" },
  { code: "DK", name: "Denmark" }, { code: "EE", name: "Estonia" }, { code: "FI", name: "Finland" },
  { code: "FR", name: "France" }, { code: "DE", name: "Germany" }, { code: "GR", name: "Greece" },
  { code: "HU", name: "Hungary" }, { code: "IE", name: "Ireland" }, { code: "IT", name: "Italy" },
  { code: "LV", name: "Latvia" }, { code: "LT", name: "Lithuania" }, { code: "LU", name: "Luxembourg" },
  { code: "MT", name: "Malta" }, { code: "NL", name: "Netherlands" }, { code: "NO", name: "Norway" },
  { code: "PL", name: "Poland" }, { code: "PT", name: "Portugal" }, { code: "RO", name: "Romania" },
  { code: "SK", name: "Slovakia" }, { code: "SI", name: "Slovenia" }, { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" }, { code: "CH", name: "Switzerland" }, { code: "GB", name: "United Kingdom" },
  { code: "UA", name: "Ukraine" }, { code: "RS", name: "Serbia" }, { code: "IS", name: "Iceland" },
];

const REASONS = [
  { value: "restructuring", label: "Restructuring" },
  { value: "cost_cutting", label: "Cost Cutting" },
  { value: "ai_replacement", label: "AI Replacement" },
  { value: "market_downturn", label: "Market Downturn" },
  { value: "merger", label: "Merger / Acquisition" },
  { value: "shutdown", label: "Shutdown" },
  { value: "other", label: "Other" },
];

export default function LayoffForm({ layoff, action }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Company autocomplete state
  const [companyId, setCompanyId] = useState(layoff?.companyId ?? "");
  const [companyQuery, setCompanyQuery] = useState(layoff?.companyName ?? "");
  const [suggestions, setSuggestions] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Title preview state
  const [affectedCount, setAffectedCount] = useState(layoff?.affectedCount ?? null);
  const [affectedPercentage, setAffectedPercentage] = useState(layoff?.affectedPercentage ?? null);
  const [isShutdown, setIsShutdown] = useState(layoff?.isShutdown ?? false);
  const [showTitleOverride, setShowTitleOverride] = useState(!!(layoff?.titleEn || layoff?.titleDe));

  const previewEn = generateLayoffTitle(
    { companyName: companyQuery || "Company", affectedCount, affectedPercentage, isShutdown },
    "en",
  );
  const previewDe = generateLayoffTitle(
    { companyName: companyQuery || "Company", affectedCount, affectedPercentage, isShutdown },
    "de",
  );

  useEffect(() => {
    if (companyQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await searchCompanies(companyQuery);
      setSuggestions(results);
      setShowSuggestions(true);
    }, 300);
  }, [companyQuery]);

  function handleSubmit(formData: FormData) {
    if (!companyId) {
      setError("Please select a company");
      return;
    }
    formData.set("companyId", companyId);
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (result.success) {
        router.push("/admin/layoffs");
        router.refresh();
      } else {
        setError(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <form action={handleSubmit} className="max-w-2xl space-y-6">
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Company Autocomplete */}
      <Field label="Company *">
        <div className="relative">
          <input
            type="text"
            value={companyQuery}
            onChange={(e) => {
              setCompanyQuery(e.target.value);
              setCompanyId("");
            }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Start typing company name…"
            className={inputCls}
          />
          {companyId && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-400">&#10003;</span>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 py-1 shadow-lg">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-700"
                    onMouseDown={() => {
                      setCompanyId(s.id);
                      setCompanyQuery(s.name);
                      setShowSuggestions(false);
                    }}
                  >
                    {s.name} <span className="text-neutral-500">({s.slug})</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Field>
      <input type="hidden" name="companyId" value={companyId} />

      {/* Title Preview */}
      <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Auto-generated title</p>
        <p className="mt-1 text-sm text-white">EN: {previewEn}</p>
        <p className="mt-0.5 text-sm text-white">DE: {previewDe}</p>
        <button
          type="button"
          onClick={() => setShowTitleOverride(!showTitleOverride)}
          className="mt-2 text-xs text-neutral-400 underline transition hover:text-neutral-200"
        >
          {showTitleOverride ? "Hide title override" : "Override title (optional)"}
        </button>
      </div>

      {/* Title Override (optional) */}
      {showTitleOverride && (
        <>
          <Field label="Title Override (EN)">
            <input name="titleEn" defaultValue={layoff?.titleEn ?? ""} maxLength={200} placeholder="Leave empty for auto-generated title" className={inputCls} />
          </Field>
          <Field label="Title Override (DE)">
            <input name="titleDe" defaultValue={layoff?.titleDe ?? ""} maxLength={200} placeholder="Leave empty for auto-generated title" className={inputCls} />
          </Field>
        </>
      )}

      {/* Date + Location */}
      <div className="grid grid-cols-3 gap-4">
        <Field label="Date *">
          <input name="date" type="date" defaultValue={layoff?.date ?? ""} required className={inputCls} />
        </Field>
        <Field label="Country of Layoff *">
          <select name="country" defaultValue={layoff?.country} required className={inputCls}>
            <option value="">Select…</option>
            {REGIONS.map((r) => (
              <option key={r.code} value={r.code}>{r.name}</option>
            ))}
            <option disabled>───────────</option>
            {EUROPEAN_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="City">
          <input name="city" defaultValue={layoff?.city ?? ""} className={inputCls} />
        </Field>
      </div>

      {/* Numbers */}
      <div className="grid grid-cols-3 gap-4">
        <Field label="Affected Count">
          <input
            name="affectedCount"
            type="number"
            defaultValue={layoff?.affectedCount ?? ""}
            onChange={(e) => setAffectedCount(e.target.value ? Number(e.target.value) : null)}
            className={inputCls}
          />
        </Field>
        <Field label="Affected %">
          <input
            name="affectedPercentage"
            type="number"
            step="0.01"
            defaultValue={layoff?.affectedPercentage ?? ""}
            onChange={(e) => setAffectedPercentage(e.target.value || null)}
            className={inputCls}
          />
        </Field>
        <Field label="Total Employees">
          <input name="totalEmployeesAtTime" type="number" defaultValue={layoff?.totalEmployeesAtTime ?? ""} className={inputCls} />
        </Field>
      </div>

      {/* Reason + Shutdown */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Reason">
          <select name="reason" defaultValue={layoff?.reason ?? ""} className={inputCls}>
            <option value="">Select…</option>
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Severance (weeks)">
          <input name="severanceWeeks" type="number" defaultValue={layoff?.severanceWeeks ?? ""} className={inputCls} />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          name="isShutdown"
          type="checkbox"
          defaultChecked={layoff?.isShutdown}
          onChange={(e) => setIsShutdown(e.target.checked)}
          className="rounded border-neutral-600"
        />
        Company shutdown (full closure)
      </label>

      {/* Source */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Source URL *">
          <input name="sourceUrl" type="url" defaultValue={layoff?.sourceUrl} required className={inputCls} />
        </Field>
        <Field label="Source Name">
          <input name="sourceName" defaultValue={layoff?.sourceName ?? ""} placeholder="e.g. Reuters, Handelsblatt" className={inputCls} />
        </Field>
      </div>

      {/* Summaries */}
      <Field label="Summary (EN)">
        <textarea name="summaryEn" rows={3} defaultValue={layoff?.summaryEn ?? ""} className={inputCls} />
      </Field>
      <Field label="Summary (DE)">
        <textarea name="summaryDe" rows={3} defaultValue={layoff?.summaryDe ?? ""} className={inputCls} />
      </Field>

      {/* Severance Details */}
      <Field label="Severance Details (EN)">
        <textarea name="severanceDetailsEn" rows={2} defaultValue={layoff?.severanceDetailsEn ?? ""} className={inputCls} />
      </Field>
      <Field label="Severance Details (DE)">
        <textarea name="severanceDetailsDe" rows={2} defaultValue={layoff?.severanceDetailsDe ?? ""} className={inputCls} />
      </Field>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200 disabled:opacity-50"
        >
          {isPending ? "Saving…" : layoff ? "Update Layoff" : "Create Layoff"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-neutral-700 px-6 py-2.5 text-sm transition hover:bg-neutral-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-neutral-300">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none";
