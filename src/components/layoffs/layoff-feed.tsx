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
      <div
        className="flex h-40 items-center justify-center border-y"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
          {t("noLayoffs")}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div>
        {layoffs.map((layoff, i) => (
          <div key={layoff.id}>
            {i > 0 && (
              <div
                className="mx-2.5 h-px"
                style={{ backgroundColor: "var(--border-subtle)" }}
              />
            )}
            <LayoffCard layoff={layoff} />
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-6 py-6">
          {page > 1 ? (
            <Link
              href={`/?page=${page - 1}`}
              className="nav-link text-[12px] transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("prevPage")}
            </Link>
          ) : (
            <span
              className="text-[12px]"
              style={{ color: "var(--text-muted)", opacity: 0.5 }}
            >
              {t("prevPage")}
            </span>
          )}
          <span
            className="text-[11px]"
            style={{ color: "var(--text-muted)" }}
          >
            {t("page", { current: page, total: totalPages })}
          </span>
          {page < totalPages ? (
            <Link
              href={`/?page=${page + 1}`}
              className="nav-link text-[12px] transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("nextPage")}
            </Link>
          ) : (
            <span
              className="text-[12px]"
              style={{ color: "var(--text-muted)", opacity: 0.5 }}
            >
              {t("nextPage")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
