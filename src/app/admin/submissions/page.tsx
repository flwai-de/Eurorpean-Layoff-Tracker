import Link from "next/link";
import { getSubmissions } from "@/actions/submissions";
import SubmissionList from "./submission-list";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SubmissionsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const status = (sp.status as "pending" | "processed" | "rejected") ?? "pending";
  const page = Math.max(1, Number(sp.page) || 1);

  const result = await getSubmissions(status, page);

  if (!result.success || !result.data) {
    return <p className="text-red-400">Failed to load submissions.</p>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Submissions</h1>

      {/* Status filter tabs */}
      <div className="mb-6 flex gap-2">
        {(["pending", "processed", "rejected"] as const).map((s) => (
          <Link
            key={s}
            href={`/admin/submissions?status=${s}`}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              status === s
                ? "bg-white text-neutral-900"
                : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </div>

      <SubmissionList submissions={result.data} />
    </div>
  );
}
