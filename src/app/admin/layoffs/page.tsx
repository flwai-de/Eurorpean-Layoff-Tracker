import Link from "next/link";
import { getLayoffs } from "@/actions/layoffs";
import LayoffActions from "./layoff-actions";

const STATUS_COLORS: Record<string, string> = {
  unverified: "bg-yellow-900/50 text-yellow-300 border-yellow-700/50",
  verified: "bg-green-900/50 text-green-300 border-green-700/50",
  rejected: "bg-red-900/50 text-red-300 border-red-700/50",
};

export default async function LayoffsPage({ searchParams }: { searchParams: Promise<{ status?: string; search?: string; page?: string }> }) {
  const params = await searchParams;
  const status = (params.status ?? "all") as "all" | "unverified" | "verified" | "rejected";
  const page = Number(params.page) || 1;
  const result = await getLayoffs(status, params.search, page);
  if (!result.success || !result.data) return <p>Error loading layoffs.</p>;

  const { items, total, perPage } = result.data;
  const totalPages = Math.ceil(total / perPage);
  const tabs = [
    { value: "all", label: "All" }, { value: "unverified", label: "Unverified" },
    { value: "verified", label: "Verified" }, { value: "rejected", label: "Rejected" },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Layoffs ({total})</h1>
        <Link href="/admin/layoffs/new" className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-200">+ New Layoff</Link>
      </div>
      <div className="mb-4 flex gap-1 rounded-lg border border-neutral-800 bg-neutral-900 p-1 w-fit">
        {tabs.map((tab) => (
          <Link key={tab.value} href={`/admin/layoffs?status=${tab.value}${params.search ? `&search=${params.search}` : ""}`}
            className={`rounded-md px-4 py-1.5 text-sm transition ${status === tab.value ? "bg-neutral-700 text-white" : "text-neutral-400 hover:text-white"}`}>{tab.label}</Link>
        ))}
      </div>
      <form className="mb-6">
        <input type="hidden" name="status" value={status} />
        <input name="search" defaultValue={params.search} placeholder="Search by company name…"
          className="w-full max-w-md rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none" />
      </form>
      <div className="overflow-hidden rounded-xl border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-800 bg-neutral-900">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-neutral-400">Date</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-400">Company</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-400">Title</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-400">Affected</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-400">Country</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-400">Status</th>
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
                <td className="px-4 py-3 text-right"><LayoffActions id={l.id} status={l.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={`/admin/layoffs?status=${status}&page=${p}${params.search ? `&search=${params.search}` : ""}`}
              className={`rounded px-3 py-1 text-sm ${p === page ? "bg-white text-neutral-900" : "text-neutral-400 hover:text-white"}`}>{p}</Link>
          ))}
        </div>
      )}
    </div>
  );
}
