"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import type { Company, Industry } from "@/lib/db/schema";

type Props = {
  industries: Industry[];
  company?: Company;
  defaultName?: string;
  action: (formData: FormData) => Promise<{ success: boolean; error?: string; data?: { id: string } }>;
};

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

export default function CompanyForm({ industries, company, defaultName, action }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (result.success) {
        if (defaultName) {
          router.back();
        } else {
          router.push("/admin/companies");
        }
        router.refresh();
      } else {
        setError(result.error ?? "Something went wrong");
      }
    });
  }

  const parents = industries.filter((i) => !i.parentSlug);
  const children = industries.filter((i) => i.parentSlug);

  return (
    <form action={handleSubmit} className="max-w-2xl space-y-6">
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <Field label="Company Name *">
        <input name="name" defaultValue={company?.name ?? defaultName ?? ""} required className={inputCls} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Industry *">
          <select name="industrySlug" defaultValue={company?.industrySlug} required className={inputCls}>
            <option value="">Select…</option>
            {parents.map((p) => (
              <optgroup key={p.slug} label={p.nameEn}>
                <option value={p.slug}>{p.nameEn}</option>
                {children.filter((c) => c.parentSlug === p.slug).map((c) => (
                  <option key={c.slug} value={c.slug}>↳ {c.nameEn}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="Company Type *">
          <select name="companyType" defaultValue={company?.companyType} required className={inputCls}>
            <option value="">Select…</option>
            <option value="startup">Startup</option>
            <option value="scaleup">Scaleup</option>
            <option value="public">Public</option>
            <option value="enterprise">Enterprise</option>
            <option value="government">Government</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="HQ Country *">
          <select name="countryHq" defaultValue={company?.countryHq} required className={inputCls}>
            <option value="">Select…</option>
            {EUROPEAN_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="HQ City">
          <input name="cityHq" defaultValue={company?.cityHq ?? ""} className={inputCls} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Website">
          <input name="website" type="url" defaultValue={company?.website ?? ""} placeholder="https://…" className={inputCls} />
        </Field>
        <Field label="Employees">
          <input name="employeeCount" type="number" defaultValue={company?.employeeCount ?? ""} className={inputCls} />
        </Field>
        <Field label="Founded Year">
          <input name="foundedYear" type="number" defaultValue={company?.foundedYear ?? ""} className={inputCls} />
        </Field>
      </div>

      <Field label="Description (EN)">
        <textarea name="descriptionEn" rows={3} defaultValue={company?.descriptionEn ?? ""} className={inputCls} />
      </Field>
      <Field label="Description (DE)">
        <textarea name="descriptionDe" rows={3} defaultValue={company?.descriptionDe ?? ""} className={inputCls} />
      </Field>

      <div className="flex gap-3 pt-4">
        <button type="submit" disabled={isPending} className="rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200 disabled:opacity-50">
          {isPending ? "Saving…" : company ? "Update Company" : "Create Company"}
        </button>
        <button type="button" onClick={() => router.back()} className="rounded-lg border border-neutral-700 px-6 py-2.5 text-sm transition hover:bg-neutral-800">
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

const inputCls = "w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none";
