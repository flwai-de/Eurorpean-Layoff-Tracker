"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toggleFeedActive, triggerFeedFetch, deleteFeed } from "@/actions/feeds";
import type { RssFeed } from "@/lib/db/schema";

export default function FeedList({ feeds }: { feeds: RssFeed[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleToggle(feedId: string) {
    startTransition(async () => {
      await toggleFeedActive(feedId);
      router.refresh();
    });
  }

  function handleFetch(feedId: string) {
    startTransition(async () => {
      await triggerFeedFetch(feedId);
      router.refresh();
    });
  }

  function handleDelete(feedId: string) {
    if (!confirm("Delete this feed and all its articles?")) return;
    startTransition(async () => {
      await deleteFeed(feedId);
      router.refresh();
    });
  }

  if (feeds.length === 0) {
    return <p className="text-sm text-neutral-400">No feeds added yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-800 bg-neutral-900 text-left text-xs uppercase tracking-wide text-neutral-400">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Language</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Active</th>
            <th className="px-4 py-3">Last Fetched</th>
            <th className="px-4 py-3">Error</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {feeds.map((feed) => (
            <tr
              key={feed.id}
              className="border-b border-neutral-800/50 transition hover:bg-neutral-900/50"
            >
              <td className="px-4 py-3">
                <div className="font-medium text-white">{feed.name}</div>
                <div className="mt-0.5 max-w-xs truncate text-xs text-neutral-500">
                  {feed.url}
                </div>
              </td>
              <td className="px-4 py-3 text-neutral-300">
                {feed.language.toUpperCase()}
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300">
                  {feed.category}
                </span>
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => handleToggle(feed.id)}
                  disabled={isPending}
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    feed.isActive
                      ? "bg-green-900/50 text-green-400"
                      : "bg-neutral-800 text-neutral-500"
                  }`}
                >
                  {feed.isActive ? "Active" : "Inactive"}
                </button>
              </td>
              <td className="px-4 py-3 text-xs text-neutral-400">
                {feed.lastFetchedAt
                  ? new Date(feed.lastFetchedAt).toLocaleString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Never"}
              </td>
              <td className="max-w-[200px] truncate px-4 py-3 text-xs text-red-400">
                {feed.lastError ?? "—"}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleFetch(feed.id)}
                    disabled={isPending}
                    className="rounded-lg border border-neutral-700 px-3 py-1 text-xs transition hover:bg-neutral-800 disabled:opacity-50"
                  >
                    Fetch Now
                  </button>
                  <button
                    onClick={() => handleDelete(feed.id)}
                    disabled={isPending}
                    className="rounded-lg border border-red-900 px-3 py-1 text-xs text-red-400 transition hover:bg-red-950 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
