import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";
import type { LayoffWithCompany } from "@/lib/queries/public";
import LayoffCard from "./layoff-card";

interface LayoffFeedProps {
  layoffs: LayoffWithCompany[];
  total: number;
  page: number;
  perPage: number;
}

export default function LayoffFeed({ layoffs, total, page, perPage }: LayoffFeedProps) {
  const t = useTranslations("home");
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  if (layoffs.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm text-neutral-400">{t("noLayoffs")}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-3">
        {layoffs.map((layoff) => (
          <LayoffCard key={layoff.id} layoff={layoff} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          {page > 1 ? (
            <Link
              href={`/?page=${page - 1}`}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {t("prevPage")}
            </Link>
          ) : (
            <span className="rounded-lg border border-neutral-100 px-4 py-2 text-sm text-neutral-300 dark:border-neutral-800 dark:text-neutral-600">
              {t("prevPage")}
            </span>
          )}
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {t("page", { current: page, total: totalPages })}
          </span>
          {page < totalPages ? (
            <Link
              href={`/?page=${page + 1}`}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {t("nextPage")}
            </Link>
          ) : (
            <span className="rounded-lg border border-neutral-100 px-4 py-2 text-sm text-neutral-300 dark:border-neutral-800 dark:text-neutral-600">
              {t("nextPage")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
