import Link from "next/link";
import { Suspense } from "react";
import { getLayoffs, getLayoffFilterOptions } from "@/actions/layoffs";
import { auth } from "@/lib/auth";
import LayoffActions from "./layoff-actions";
import FilterSelects from "./filter-selects";

const STATUS_COLORS: Record<string, string> = {
  unverified: "bg-yellow-900/50 text-yellow-300 border-yellow-700/50",
  verified: "bg-green-900/50 text-green-300 border-green-700/50",
  rejected: "bg-red-900/50 text-red-300 border-red-700/50",
};

type SortField = "date" | "company" | "affected" | "country" | "status";

function buildUrl(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && v !== "all" && v !== "") sp.set(k, v);
  }
  return `/admin/layoffs${sp.size > 0 ? `?${sp.toString()}` : ""}`;
}

function SortHeader({
  label,
  field,
  currentSort,
  currentOrder,
  baseParams,
}: {
  label: string;
  field: SortField;
  currentSort: SortField;
  currentOrder: string;
  baseParams: Record<string, string | undefined>;
}) {
  const isActive = currentSort === field;
  const nextOrder = isActive && currentOrder === "asc" ? "desc" : isActive && currentOrder === "desc" ? "asc" : "desc";
  const arrow = isActive ? (currentOrder === "asc" ? " \u25b2" : " \u25bc") : "";

  return (
    <th className="px-4 py-3 text-left font-medium text-neutral-400">
      <Link
        href={buildUrl({ ...baseParams, sort: field, order: nextOrder, page: undefined })}
        className="inline-flex items-center gap-0.5 hover:text-white transition"
      >
        {label}{arrow && <span className="text-xs text-neutral-300">{arrow}</span>}
      </Link>
    </th>
  );
}

export default async function LayoffsPage({ searchParams }: { searchParams: Promise<{ status?: string; search?: string; page?: string; sort?: string; order?: string; country?: string; industry?: string }> }) {
  const params = await searchParams;
  const status = (params.status ?? "all") as "all" | "unverified" | "verified" | "rejected";
  const sort = (params.sort ?? "date") as SortField;
  const order = (params.order ?? "desc") as "asc" | "desc";
  const page = Number(params.page) || 1;

  const [result, filterResult, session] = await Promise.all([
    getLayoffs({ status, search: params.search, country: params.country, industry: params.industry, sort, order, page }),
    getLayoffFilterOptions(),
    auth(),
  ]);
  const sessionUser = session?.user as Record<string, unknown> | undefined;
  const isAdmin = sessionUser?.role === "admin";

  if (!result.success || !result.data) return <p>Error loading layoffs.</p>;

  const { items, total, perPage } = result.data;
  const totalPages = Math.ceil(total / perPage);
  const tabs = [
    { value: "all", label: "All" }, { value: "unverified", label: "Unverified" },
    { value: "verified", label: "Verified" }, { value: "rejected", label: "Rejected" },
  ];

  const filterCountries = filterResult.success && filterResult.data ? filterResult.data.countries : [];
  const filterIndustries = filterResult.success && filterResult.data ? filterResult.data.industries : [];

  const baseParams: Record<string, string | undefined> = {
    status: params.status,
    search: params.search,
    country: params.country,
    industry: params.industry,
    sort: params.sort,
    order: params.order,
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Layoffs ({total})</h1>
        <Link href="/admin/layoffs/new" className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-200">+ New Layoff</Link>
      </div>
      <div className="mb-4 flex gap-1 rounded-lg border border-neutral-800 bg-neutral-900 p-1 w-fit">
        {tabs.map((tab) => (
          <Link key={tab.value} href={buildUrl({ ...baseParams, status: tab.value, page: undefined })}
            className={`rounded-md px-4 py-1.5 text-sm transition ${status === tab.value ? "bg-neutral-700 text-white" : "text-neutral-400 hover:text-white"}`}>{tab.label}</Link>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <form className="flex-1 min-w-[200px] max-w-md">
          <input type="hidden" name="status" value={status} />
          {params.country && <input type="hidden" name="country" value={params.country} />}
          {params.industry && <input type="hidden" name="industry" value={params.industry} />}
          {params.sort && <input type="hidden" name="sort" value={params.sort} />}
          {params.order && <input type="hidden" name="order" value={params.order} />}
          <input name="search" defaultValue={params.search} placeholder="Search by company name…"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none" />
        </form>
        <Suspense>
          <div className="flex flex-wrap gap-2">
            <FilterSelects countries={filterCountries} industries={filterIndustries} />
          </div>
        </Suspense>
      </div>
      <div className="overflow-hidden rounded-xl border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-800 bg-neutral-900">
            <tr>
              <SortHeader label="Date" field="date" currentSort={sort} currentOrder={order} baseParams={baseParams} />
              <SortHeader label="Company" field="company" currentSort={sort} currentOrder={order} baseParams={baseParams} />
              <th className="px-4 py-3 text-left font-medium text-neutral-400">Title</th>
              <SortHeader label="Affected" field="affected" currentSort={sort} currentOrder={order} baseParams={baseParams} />
              <SortHeader label="Country" field="country" currentSort={sort} currentOrder={order} baseParams={baseParams} />
              <SortHeader label="Status" field="status" currentSort={sort} currentOrder={order} baseParams={baseParams} />
              <th className="px-4 py-3 text-right font-medium text-neutral-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {items.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-neutral-500">No layoffs found.</td></tr>}
            {items.map((l) => (
              <tr key={l.id} className="transition hover:bg-neutral-900/50">
                <td className="px-4 py-3 text-neutral-400">{l.date}</td>
                <td className="px-4 py-3 font-medium">{l.companyName}</td>
                <td className="px-4 py-3 max-w-[250px] truncate text-neutral-300">{l.titleEn}</td>
                <td className="px-4 py-3">{l.affectedCount?.toLocaleString() ?? "—"}{l.isShutdown && <span className="ml-1 text-red-400" title="Shutdown">💀</span>}</td>
                <td className="px-4 py-3 text-neutral-400">{l.country}</td>
                <td className="px-4 py-3"><span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_COLORS[l.status]}`}>{l.status}</span></td>
                <td className="px-4 py-3 text-right"><LayoffActions id={l.id} status={l.status} isAdmin={isAdmin} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={buildUrl({ ...baseParams, page: String(p) })}
              className={`rounded px-3 py-1 text-sm ${p === page ? "bg-white text-neutral-900" : "text-neutral-400 hover:text-white"}`}>{p}</Link>
          ))}
        </div>
      )}
    </div>
  );
}
