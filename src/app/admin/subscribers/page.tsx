import { getSubscribers } from "@/actions/newsletter";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SubscribersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const status = sp.status as "pending" | "active" | "unsubscribed" | "bounced" | undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const result = await getSubscribers(status, page);

  if (!result.success || !result.data) {
    return <p className="text-red-400">Failed to load subscribers.</p>;
  }

  const stats = result.stats ?? {};

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Subscribers</h1>

      {/* Stats */}
      <div className="mb-6 flex gap-4">
        {(["active", "pending", "unsubscribed", "bounced"] as const).map((s) => (
          <div key={s} className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3">
            <p className="text-xs uppercase text-neutral-400">{s}</p>
            <p className="text-lg font-bold text-white">{stats[s] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-2">
        <a
          href="/admin/subscribers"
          className={`rounded-lg px-3 py-1.5 text-sm ${!status ? "bg-white text-neutral-900" : "text-neutral-400 hover:bg-neutral-800"}`}
        >
          All
        </a>
        {(["active", "pending", "unsubscribed", "bounced"] as const).map((s) => (
          <a
            key={s}
            href={`/admin/subscribers?status=${s}`}
            className={`rounded-lg px-3 py-1.5 text-sm ${status === s ? "bg-white text-neutral-900" : "text-neutral-400 hover:bg-neutral-800"}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </a>
        ))}
      </div>

      {/* Table */}
      {result.data.length === 0 ? (
        <p className="text-sm text-neutral-400">No subscribers found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900 text-left text-xs uppercase tracking-wide text-neutral-400">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Language</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Confirmed</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((sub) => (
                <tr key={sub.id} className="border-b border-neutral-800/50 transition hover:bg-neutral-900/50">
                  <td className="px-4 py-3 text-white">{sub.email}</td>
                  <td className="px-4 py-3 text-neutral-300">{sub.language.toUpperCase()}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      sub.status === "active" ? "bg-green-900/50 text-green-400"
                        : sub.status === "pending" ? "bg-yellow-900/50 text-yellow-400"
                        : sub.status === "bounced" ? "bg-red-900/50 text-red-400"
                        : "bg-neutral-800 text-neutral-400"
                    }`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-400">
                    {sub.confirmedAt
                      ? new Date(sub.confirmedAt).toLocaleDateString("de-DE")
                      : "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-400">
                    {new Date(sub.createdAt).toLocaleDateString("de-DE")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
