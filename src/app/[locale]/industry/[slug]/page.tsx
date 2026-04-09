import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";
import { db } from "@/lib/db";
import { industries } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getLayoffsByIndustry } from "@/lib/queries/public";
import LayoffFeed from "@/components/layoffs/layoff-feed";

const PER_PAGE = 20;

interface Props {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const industry = await db.query.industries.findFirst({
    where: eq(industries.slug, slug),
  });
  if (!industry) return {};

  const t = await getTranslations({ locale, namespace: "industry" });
  const name = locale === "de" ? industry.nameDe : industry.nameEn;
  const title = t("metaTitle", { industry: name });

  return {
    title,
    alternates: {
      languages: { de: `/de/industry/${slug}`, en: `/en/industry/${slug}` },
    },
  };
}

export default async function IndustryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const industry = await db.query.industries.findFirst({
    where: eq(industries.slug, slug),
  });
  if (!industry) notFound();

  const parentIndustry = industry.parentSlug
    ? await db.query.industries.findFirst({ where: eq(industries.slug, industry.parentSlug) })
    : null;

  const [result, children] = await Promise.all([
    getLayoffsByIndustry(slug, PER_PAGE, (page - 1) * PER_PAGE),
    db
      .select()
      .from(industries)
      .where(eq(industries.parentSlug, slug))
      .orderBy(asc(industries.sortOrder)),
  ]);

  const totalAffected = result.data.reduce(
    (sum, l) => sum + (l.affectedCount ?? 0),
    0,
  );

  return (
    <IndustryContent
      industry={industry}
      parentIndustry={parentIndustry ?? undefined}
      children_={children}
      layoffs={result.data}
      total={result.total}
      totalAffected={totalAffected}
      page={page}
    />
  );
}

function IndustryContent({
  industry,
  parentIndustry,
  children_,
  layoffs,
  total,
  totalAffected,
  page,
}: {
  industry: typeof industries.$inferSelect;
  parentIndustry?: typeof industries.$inferSelect;
  children_: (typeof industries.$inferSelect)[];
  layoffs: Awaited<ReturnType<typeof getLayoffsByIndustry>>["data"];
  total: number;
  totalAffected: number;
  page: number;
}) {
  const locale = useLocale() as "de" | "en";
  const t = useTranslations("industry");
  const tLayoff = useTranslations("layoff");
  const name = locale === "de" ? industry.nameDe : industry.nameEn;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">
        {t("heading", { industry: name })}
      </h1>

      {/* Parent link */}
      {parentIndustry && (
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          {t("parentIndustry", { parent: "" })}
          <Link
            href={`/industry/${parentIndustry.slug}`}
            className="text-teal-700 transition hover:underline dark:text-teal-400"
          >
            {locale === "de" ? parentIndustry.nameDe : parentIndustry.nameEn}
          </Link>
        </p>
      )}

      {/* Stats */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-neutral-500 dark:text-neutral-400">
        <span>{t("layoffCount", { count: total })}</span>
        {totalAffected > 0 && (
          <span>{t("totalAffected", { count: totalAffected.toLocaleString("de-DE") })}</span>
        )}
      </div>

      {/* Sub-industries */}
      {children_.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            {t("subIndustries")}
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {children_.map((child) => (
              <Link
                key={child.slug}
                href={`/industry/${child.slug}`}
                className="rounded-full border border-neutral-200 px-3 py-1 text-sm text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                {locale === "de" ? child.nameDe : child.nameEn}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Feed */}
      <div className="mt-8">
        <LayoffFeed layoffs={layoffs} total={total} page={page} perPage={PER_PAGE} />
      </div>

      {/* Back */}
      <div className="mt-8">
        <Link href="/" className="text-sm text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
          &larr; {tLayoff("backToOverview")}
        </Link>
      </div>
    </div>
  );
}
