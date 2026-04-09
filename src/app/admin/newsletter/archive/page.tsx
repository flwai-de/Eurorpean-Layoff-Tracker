import { getNewsletterIssues } from "@/actions/newsletter";

export default async function NewsletterArchivePage() {
  const result = await getNewsletterIssues();

  if (!result.success || !result.data) {
    return <p className="text-red-400">Failed to load issues.</p>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Newsletter Archive</h1>
        <a
          href="/admin/newsletter"
          className="text-sm text-neutral-400 transition hover:text-white"
        >
          &larr; Back to Composer
        </a>
      </div>

      {result.data.length === 0 ? (
        <p className="text-sm text-neutral-400">No newsletters sent yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900 text-left text-xs uppercase tracking-wide text-neutral-400">
                <th className="px-4 py-3">Subject (EN)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Recipients</th>
                <th className="px-4 py-3">Layoffs</th>
                <th className="px-4 py-3">Sent</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((issue) => (
                <tr key={issue.id} className="border-b border-neutral-800/50 transition hover:bg-neutral-900/50">
                  <td className="px-4 py-3 font-medium text-white">{issue.subjectEn}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      issue.status === "sent" ? "bg-green-900/50 text-green-400" : "bg-yellow-900/50 text-yellow-400"
                    }`}>
                      {issue.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-300">{issue.recipientCount ?? "\u2014"}</td>
                  <td className="px-4 py-3 text-neutral-300">{issue.layoffIds.length}</td>
                  <td className="px-4 py-3 text-xs text-neutral-400">
                    {issue.sentAt
                      ? new Date(issue.sentAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
                      : "\u2014"}
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
