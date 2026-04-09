import { db } from "@/lib/db";
import { socialPosts, layoffs, companies } from "@/lib/db/schema";
import { eq, and, desc, type SQL } from "drizzle-orm";
import { auth } from "@/lib/auth";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SocialPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) return <p className="text-red-400">Unauthorized</p>;

  const sp = await searchParams;
  const platform = sp.platform as "x" | "linkedin" | "reddit" | undefined;
  const status = sp.status as "queued" | "posted" | "failed" | undefined;

  const conditions: SQL[] = [];
  if (platform) conditions.push(eq(socialPosts.platform, platform));
  if (status) conditions.push(eq(socialPosts.status, status));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const posts = await db
    .select({
      id: socialPosts.id,
      platform: socialPosts.platform,
      postUrl: socialPosts.postUrl,
      status: socialPosts.status,
      errorMessage: socialPosts.errorMessage,
      createdAt: socialPosts.createdAt,
      companyName: companies.name,
    })
    .from(socialPosts)
    .innerJoin(layoffs, eq(socialPosts.layoffId, layoffs.id))
    .innerJoin(companies, eq(layoffs.companyId, companies.id))
    .where(where)
    .orderBy(desc(socialPosts.createdAt))
    .limit(100);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Social Media Posts</h1>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <a
          href="/admin/social"
          className={`rounded-lg px-3 py-1.5 text-sm ${!platform && !status ? "bg-white text-neutral-900" : "text-neutral-400 hover:bg-neutral-800"}`}
        >
          All
        </a>
        {(["x", "linkedin", "reddit"] as const).map((p) => (
          <a
            key={p}
            href={`/admin/social?platform=${p}`}
            className={`rounded-lg px-3 py-1.5 text-sm ${platform === p ? "bg-white text-neutral-900" : "text-neutral-400 hover:bg-neutral-800"}`}
          >
            {p === "x" ? "X" : p.charAt(0).toUpperCase() + p.slice(1)}
          </a>
        ))}
        <span className="mx-2 self-center text-neutral-700">|</span>
        {(["queued", "posted", "failed"] as const).map((s) => (
          <a
            key={s}
            href={`/admin/social?status=${s}`}
            className={`rounded-lg px-3 py-1.5 text-sm ${status === s ? "bg-white text-neutral-900" : "text-neutral-400 hover:bg-neutral-800"}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </a>
        ))}
      </div>

      {/* Table */}
      {posts.length === 0 ? (
        <p className="text-sm text-neutral-400">No social posts yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900 text-left text-xs uppercase tracking-wide text-neutral-400">
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Platform</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Link</th>
                <th className="px-4 py-3">Error</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b border-neutral-800/50 transition hover:bg-neutral-900/50">
                  <td className="px-4 py-3 font-medium text-white">{post.companyName}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      post.platform === "x" ? "bg-blue-900/50 text-blue-400"
                        : post.platform === "linkedin" ? "bg-sky-900/50 text-sky-400"
                        : "bg-orange-900/50 text-orange-400"
                    }`}>
                      {post.platform === "x" ? "X" : post.platform.charAt(0).toUpperCase() + post.platform.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      post.status === "posted" ? "bg-green-900/50 text-green-400"
                        : post.status === "failed" ? "bg-red-900/50 text-red-400"
                        : "bg-yellow-900/50 text-yellow-400"
                    }`}>
                      {post.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {post.postUrl ? (
                      <a href={post.postUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-400 hover:underline">
                        View
                      </a>
                    ) : "\u2014"}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-xs text-red-400">
                    {post.errorMessage ?? "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-400">
                    {new Date(post.createdAt).toLocaleDateString("de-DE", {
                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                    })}
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
