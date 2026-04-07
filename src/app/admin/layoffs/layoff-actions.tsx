"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { verifyLayoff, rejectLayoff } from "@/actions/layoffs";

export default function LayoffActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleVerify() {
    startTransition(async () => { await verifyLayoff(id); router.refresh(); });
  }

  function handleReject() {
    if (!confirm("Reject this layoff?")) return;
    startTransition(async () => { await rejectLayoff(id); router.refresh(); });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {status === "unverified" && (
        <>
          <button onClick={handleVerify} disabled={isPending} className="rounded bg-green-800/60 px-2.5 py-1 text-xs text-green-300 transition hover:bg-green-800 disabled:opacity-50">✓ Verify</button>
          <button onClick={handleReject} disabled={isPending} className="rounded bg-red-800/60 px-2.5 py-1 text-xs text-red-300 transition hover:bg-red-800 disabled:opacity-50">✗ Reject</button>
        </>
      )}
      <Link href={`/admin/layoffs/${id}/edit`} className="rounded bg-neutral-800 px-2.5 py-1 text-xs text-neutral-300 transition hover:bg-neutral-700">Edit</Link>
    </div>
  );
}
