"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function FilterSelects({
  countries,
  industries,
}: {
  countries: string[];
  industries: { slug: string; nameEn: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(key: string, value: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value) {
      sp.set(key, value);
    } else {
      sp.delete(key);
    }
    sp.delete("page");
    router.push(`/admin/layoffs?${sp.toString()}`);
  }

  return (
    <>
      <select
        value={searchParams.get("country") ?? ""}
        onChange={(e) => handleChange("country", e.target.value)}
        className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white focus:border-neutral-500 focus:outline-none"
      >
        <option value="">All Countries</option>
        {countries.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <select
        value={searchParams.get("industry") ?? ""}
        onChange={(e) => handleChange("industry", e.target.value)}
        className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white focus:border-neutral-500 focus:outline-none"
      >
        <option value="">All Industries</option>
        {industries.map((i) => (
          <option key={i.slug} value={i.slug}>{i.nameEn}</option>
        ))}
      </select>
    </>
  );
}
