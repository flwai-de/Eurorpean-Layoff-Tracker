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
      <div className="flex h-40 items-center justify-center border-y border-neutral-200 dark:border-neutral-800/50">
        <p className="text-[13px] text-neutral-400 dark:text-neutral-500">
          {t("noLayoffs")}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="border-t border-neutral-200 dark:border-neutral-800/50">
        {layoffs.map((layoff) => (
          <LayoffCard key={layoff.id} layoff={layoff} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-6 py-6">
          {page > 1 ? (
            <Link
              href={`/?page=${page - 1}`}
              className="text-[12px] text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              {t("prevPage")}
            </Link>
          ) : (
            <span className="text-[12px] text-neutral-300 dark:text-neutral-700">
              {t("prevPage")}
            </span>
          )}
          <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
            {t("page", { current: page, total: totalPages })}
          </span>
          {page < totalPages ? (
            <Link
              href={`/?page=${page + 1}`}
              className="text-[12px] text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              {t("nextPage")}
            </Link>
          ) : (
            <span className="text-[12px] text-neutral-300 dark:text-neutral-700">
              {t("nextPage")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
