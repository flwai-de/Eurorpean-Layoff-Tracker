import Link from "next/link";
import { getSubscribers } from "@/actions/newsletter";
import SubscriberList from "@/components/admin/subscriber-list";

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
        <Link
          href="/admin/subscribers"
          className={`rounded-lg px-3 py-1.5 text-sm ${!status ? "bg-white text-neutral-900" : "text-neutral-400 hover:bg-neutral-800"}`}
        >
          All
        </Link>
        {(["active", "pending", "unsubscribed", "bounced"] as const).map((s) => (
          <Link
            key={s}
            href={`/admin/subscribers?status=${s}`}
            className={`rounded-lg px-3 py-1.5 text-sm ${status === s ? "bg-white text-neutral-900" : "text-neutral-400 hover:bg-neutral-800"}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </div>

      {/* Table */}
      {result.data.length === 0 ? (
        <p className="text-sm text-neutral-400">No subscribers found.</p>
      ) : (
        <SubscriberList subscribers={result.data} />
      )}
    </div>
  );
}
