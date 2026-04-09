import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Documentation | Dimissio",
  description: "Free REST API for European layoff data.",
};

const BASE = "https://dimissio.eu/api/public";

const endpoints = [
  {
    method: "GET",
    path: "/layoffs",
    description: "List verified layoffs with optional filters and pagination.",
    params: [
      { name: "page", type: "number", default: "1", description: "Page number" },
      { name: "limit", type: "number", default: "20", description: "Results per page (max 100)" },
      { name: "country", type: "string", description: "ISO 3166-1 Alpha-2 country code (e.g. DE, FR)" },
      { name: "industry", type: "string", description: "Industry slug (e.g. technology, finance)" },
      { name: "from", type: "string", description: "Start date (YYYY-MM-DD)" },
      { name: "to", type: "string", description: "End date (YYYY-MM-DD)" },
    ],
    example: `{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "date": "2025-03-15",
      "affectedCount": 500,
      "country": "DE",
      "reason": "restructuring",
      "company": {
        "name": "Acme Corp",
        "slug": "acme-corp",
        "industrySlug": "technology"
      }
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}`,
  },
  {
    method: "GET",
    path: "/layoffs/:id",
    description: "Get a single layoff by UUID with full company details.",
    params: [{ name: "id", type: "UUID", description: "Layoff ID" }],
    example: `{
  "data": {
    "id": "550e8400-...",
    "date": "2025-03-15",
    "affectedCount": 500,
    "company": { "name": "Acme Corp", "slug": "acme-corp" },
    "summaryEn": "Acme Corp cuts 500 jobs in Germany...",
    "sourceUrl": "https://example.com/article"
  }
}`,
  },
  {
    method: "GET",
    path: "/companies/:slug",
    description: "Get a company by slug with all its verified layoffs.",
    params: [{ name: "slug", type: "string", description: "Company slug (e.g. acme-corp)" }],
    example: `{
  "data": {
    "name": "Acme Corp",
    "slug": "acme-corp",
    "industrySlug": "technology",
    "countryHq": "DE",
    "layoffs": [{ "id": "...", "date": "2025-03-15", "affectedCount": 500 }]
  }
}`,
  },
  {
    method: "GET",
    path: "/stats",
    description: "Aggregated statistics: total layoffs, total affected, this month, this week.",
    params: [],
    example: `{
  "data": {
    "totalLayoffs": 142,
    "totalAffected": 28500,
    "thisMonth": 12,
    "thisWeek": 3
  }
}`,
  },
  {
    method: "GET",
    path: "/stats/chart",
    description: "Monthly trend data for the chart.",
    params: [{ name: "months", type: "number", default: "12", description: "Number of months (1-60)" }],
    example: `{
  "data": [
    { "month": "2025-01", "layoffCount": 8, "affectedCount": 1200 },
    { "month": "2025-02", "layoffCount": 12, "affectedCount": 3400 }
  ]
}`,
  },
  {
    method: "GET",
    path: "/trending",
    description: "Top 10 most-viewed layoffs from the past 30 days.",
    params: [],
    example: `{
  "data": [
    {
      "id": "...",
      "affectedCount": 1200,
      "company": { "name": "Big Tech Inc", "slug": "big-tech-inc" }
    }
  ]
}`,
  },
];

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">
        Dimissio API
      </h1>
      <p className="mt-3 leading-relaxed text-neutral-600 dark:text-neutral-300">
        Free REST API for European layoff data. All responses return verified data only.
        No authentication required.
      </p>

      <div className="mt-6 space-y-2 text-sm text-neutral-500 dark:text-neutral-400">
        <p>
          <strong className="text-neutral-900 dark:text-white">Base URL:</strong>{" "}
          <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs dark:bg-neutral-800">{BASE}</code>
        </p>
        <p>
          <strong className="text-neutral-900 dark:text-white">Rate Limit:</strong>{" "}
          100 requests per hour per IP. Headers:{" "}
          <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs dark:bg-neutral-800">X-RateLimit-Limit</code>,{" "}
          <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs dark:bg-neutral-800">X-RateLimit-Remaining</code>
        </p>
        <p>
          <strong className="text-neutral-900 dark:text-white">Format:</strong>{" "}
          JSON. Success: <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs dark:bg-neutral-800">{"{ data, pagination? }"}</code>.
          Error: <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs dark:bg-neutral-800">{"{ error }"}</code> with HTTP 4xx.
        </p>
        <p>
          <strong className="text-neutral-900 dark:text-white">CORS:</strong>{" "}
          Enabled for all origins.
        </p>
      </div>

      <div className="mt-10 space-y-10">
        {endpoints.map((ep) => (
          <section key={ep.path} className="rounded-xl border border-neutral-200 dark:border-neutral-800">
            <div className="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                  {ep.method}
                </span>
                <code className="text-sm font-semibold text-neutral-900 dark:text-white">
                  {ep.path}
                </code>
              </div>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {ep.description}
              </p>
            </div>

            {ep.params.length > 0 && (
              <div className="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Parameters</p>
                <table className="w-full text-sm">
                  <tbody>
                    {ep.params.map((p) => (
                      <tr key={p.name} className="border-t border-neutral-100 dark:border-neutral-800/50">
                        <td className="py-2 pr-4 font-mono text-xs text-neutral-900 dark:text-white">{p.name}</td>
                        <td className="py-2 pr-4 text-xs text-neutral-400">{p.type}</td>
                        <td className="py-2 pr-4 text-xs text-neutral-400">{p.default ? `Default: ${p.default}` : "Optional"}</td>
                        <td className="py-2 text-xs text-neutral-500 dark:text-neutral-400">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="px-5 py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Example Response</p>
              <pre className="overflow-x-auto rounded-lg bg-neutral-100 p-4 text-xs leading-relaxed text-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
                {ep.example}
              </pre>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
        Only verified layoff data is served through the API. Unverified or rejected entries are never exposed.
      </div>
    </div>
  );
}
