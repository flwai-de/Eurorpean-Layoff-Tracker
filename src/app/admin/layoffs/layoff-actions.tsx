"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { verifyLayoff, rejectLayoff, deleteLayoff } from "@/actions/layoffs";

export default function LayoffActions({ id, status, isAdmin }: { id: string; status: string; isAdmin?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleVerify() {
    setError(null);
    startTransition(async () => {
      const result = await verifyLayoff(id);
      if (!result.success) {
        setError(result.error ?? "Verify failed");
      } else {
        router.refresh();
      }
    });
  }

  function handleReject() {
    if (!confirm("Reject this layoff?")) return;
    setError(null);
    startTransition(async () => {
      const result = await rejectLayoff(id);
      if (!result.success) {
        setError(result.error ?? "Reject failed");
      } else {
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!confirm("Diesen Layoff-Eintrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteLayoff(id);
      if (!result.success) {
        setError(result.error ?? "Delete failed");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error && <span className="text-xs text-red-400">{error}</span>}
      {status === "unverified" && (
        <>
          <button onClick={handleVerify} disabled={isPending} className="rounded bg-green-800/60 px-2.5 py-1 text-xs text-green-300 transition hover:bg-green-800 disabled:opacity-50">✓ Verify</button>
          <button onClick={handleReject} disabled={isPending} className="rounded bg-red-800/60 px-2.5 py-1 text-xs text-red-300 transition hover:bg-red-800 disabled:opacity-50">✗ Reject</button>
        </>
      )}
      <Link href={`/admin/layoffs/${id}/edit`} className="rounded bg-neutral-800 px-2.5 py-1 text-xs text-neutral-300 transition hover:bg-neutral-700">Edit</Link>
      {isAdmin && (
        <button onClick={handleDelete} disabled={isPending} className="rounded bg-red-900/40 px-2.5 py-1 text-xs text-red-400 transition hover:bg-red-900/70 disabled:opacity-50">Delete</button>
      )}
    </div>
  );
}
