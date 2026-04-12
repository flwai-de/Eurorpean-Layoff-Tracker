"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSubscriber, deleteSubscribersBulk } from "@/actions/newsletter";

interface Subscriber {
  id: string;
  email: string;
  language: string;
  status: string;
  confirmedAt: Date | string | null;
  createdAt: Date | string;
}

export default function SubscriberList({ subscribers }: { subscribers: Subscriber[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === subscribers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(subscribers.map((s) => s.id)));
    }
  }

  function onDelete(id: string, email: string) {
    if (!confirm(`Subscriber ${email} wirklich löschen?`)) return;
    startTransition(async () => {
      const res = await deleteSubscriber(id);
      if (!res.success) alert(res.error ?? "Delete failed");
      else router.refresh();
    });
  }

  function onBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`${selected.size} Subscriber wirklich löschen?`)) return;
    const ids = Array.from(selected);
    startTransition(async () => {
      const res = await deleteSubscribersBulk(ids);
      if (!res.success) alert(res.error ?? "Delete failed");
      else {
        setSelected(new Set());
        router.refresh();
      }
    });
  }

  const allChecked = subscribers.length > 0 && selected.size === subscribers.length;

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3">
          <button
            onClick={onBulkDelete}
            disabled={pending}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            Ausgewählte löschen ({selected.size})
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-neutral-400 hover:text-neutral-200"
          >
            Abwählen
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-900 text-left text-xs uppercase tracking-wide text-neutral-400">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  className="h-4 w-4 accent-teal-500"
                />
              </th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Language</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Confirmed</th>
              <th className="px-4 py-3">Created</th>
              <th className="w-16 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((sub) => (
              <tr
                key={sub.id}
                className="border-b border-neutral-800/50 transition hover:bg-neutral-900/50"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(sub.id)}
                    onChange={() => toggle(sub.id)}
                    className="h-4 w-4 accent-teal-500"
                  />
                </td>
                <td className="px-4 py-3 text-white">{sub.email}</td>
                <td className="px-4 py-3 text-neutral-300">{sub.language.toUpperCase()}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      sub.status === "active"
                        ? "bg-green-900/50 text-green-400"
                        : sub.status === "pending"
                          ? "bg-yellow-900/50 text-yellow-400"
                          : sub.status === "bounced"
                            ? "bg-red-900/50 text-red-400"
                            : "bg-neutral-800 text-neutral-400"
                    }`}
                  >
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
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onDelete(sub.id, sub.email)}
                    disabled={pending}
                    aria-label={`Delete ${sub.email}`}
                    className="rounded p-1.5 text-neutral-500 transition hover:bg-red-900/30 hover:text-red-400 disabled:opacity-50"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
