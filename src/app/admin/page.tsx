const stats = [
  { label: "Total Layoffs", value: "—" },
  { label: "Unverified", value: "—" },
  { label: "Companies", value: "—" },
];

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
          >
            <p className="text-sm text-neutral-400">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
