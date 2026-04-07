import Link from "next/link";
import { getCompanies } from "@/actions/companies";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const result = await getCompanies(params.search, page);

  if (!result.success || !result.data) return <p>Error loading companies.</p>;

  const { items, total, perPage } = result.data;
  const totalPages = Math.ceil(total / perPage);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Companies ({total})</h1>
        <Link
          href="/admin/companies/new"
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-200"
        >
          + New Company
        </Link>
      </div>

      <form className="mb-6">
        <input
          name="search"
          defaultValue={params.search}
          placeholder="Search companies…"
          className="w-full max-w-md rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none"
        />
      </form>

      <div className="overflow-hidden rounded-xl border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-800 bg-neutral-900">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-neutral-400">Name</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-400">Industry</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-400">HQ</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-400">Type</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-400">Employees</th>
              <th className="px-4 py-3 text-right font-medium text-neutral-400" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                  No companies found.
                </td>
              </tr>
            )}
            {items.map((c) => (
              <tr key={c.id} className="transition hover:bg-neutral-900/50">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-neutral-400">{c.industrySlug}</td>
                <td className="px-4 py-3 text-neutral-400">{c.countryHq}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs">{c.companyType}</span>
                </td>
                <td className="px-4 py-3 text-neutral-400">{c.employeeCount?.toLocaleString() ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/companies/${c.id}/edit`} className="text-neutral-400 transition hover:text-white">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/companies?page=${p}${params.search ? `&search=${params.search}` : ""}`}
              className={`rounded px-3 py-1 text-sm ${
                p === page ? "bg-white text-neutral-900" : "text-neutral-400 hover:text-white"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
