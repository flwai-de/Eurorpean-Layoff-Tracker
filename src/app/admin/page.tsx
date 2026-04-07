import Link from "next/link";
import { getDashboardStats } from "@/actions/layoffs";

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  const cards = [
    { label: "Total Layoffs", value: stats?.totalLayoffs ?? 0, href: "/admin/layoffs" },
    { label: "Unverified", value: stats?.unverifiedLayoffs ?? 0, href: "/admin/layoffs?status=unverified", highlight: true },
    { label: "Verified", value: stats?.verifiedLayoffs ?? 0, href: "/admin/layoffs?status=verified" },
    { label: "Companies", value: stats?.totalCompanies ?? 0, href: "/admin/companies" },
    { label: "People Affected", value: stats?.totalAffected?.toLocaleString("en-US") ?? 0, href: "/admin/layoffs?status=verified" },
  ];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-3">
          <Link
            href="/admin/companies/new"
            className="rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium transition hover:bg-neutral-700"
          >
            + Company
          </Link>
          <Link
            href="/admin/layoffs/new"
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-200"
          >
            + Layoff
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`rounded-2xl border p-6 transition hover:border-neutral-600 ${
              card.highlight
                ? "border-yellow-600/50 bg-yellow-950/20"
                : "border-neutral-800 bg-neutral-900"
            }`}
          >
            <p className="text-sm text-neutral-400">{card.label}</p>
            <p className="mt-2 text-3xl font-bold">{card.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
