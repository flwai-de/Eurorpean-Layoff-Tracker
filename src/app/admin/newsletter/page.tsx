import { db } from "@/lib/db";
import { layoffs, companies } from "@/lib/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import NewsletterComposer from "./composer";

export default async function NewsletterPage() {
  const session = await auth();
  if (!session) return <p className="text-red-400">Unauthorized</p>;

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const dateStr = twoWeeksAgo.toISOString().split("T")[0];

  const availableLayoffs = await db
    .select({
      id: layoffs.id,
      date: layoffs.date,
      affectedCount: layoffs.affectedCount,
      country: layoffs.country,
      companyName: companies.name,
    })
    .from(layoffs)
    .innerJoin(companies, eq(layoffs.companyId, companies.id))
    .where(
      and(
        eq(layoffs.status, "verified"),
        eq(layoffs.publishedToNewsletter, false),
        gte(layoffs.date, dateStr),
      ),
    )
    .orderBy(desc(layoffs.date));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Newsletter Composer</h1>
        <a
          href="/admin/newsletter/archive"
          className="text-sm text-neutral-400 transition hover:text-white"
        >
          View Archive &rarr;
        </a>
      </div>
      <NewsletterComposer layoffs={availableLayoffs} />
    </div>
  );
}
