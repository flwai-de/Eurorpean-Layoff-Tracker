import { useTranslations } from "next-intl";

interface JobLinksProps {
  companyName: string;
}

const PLATFORMS = [
  {
    name: "StepStone",
    buildUrl: (q: string) => `https://www.stepstone.de/jobs/${encodeURIComponent(q)}`,
  },
  {
    name: "Indeed",
    buildUrl: (q: string) => `https://de.indeed.com/jobs?q=${encodeURIComponent(q)}`,
  },
  {
    name: "LinkedIn",
    buildUrl: (q: string) => `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(q)}`,
  },
];

const UTM = "utm_source=dimissio&utm_medium=layoff_page&utm_campaign=affiliate";

export default function JobLinks({ companyName }: JobLinksProps) {
  const t = useTranslations("layoff");

  return (
    <div className="mt-8 rounded-xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-sm font-semibold text-neutral-900 dark:text-white">
        {t("findJobs")}
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        {PLATFORMS.map((p) => {
          const url = `${p.buildUrl(companyName)}${p.buildUrl(companyName).includes("?") ? "&" : "?"}${UTM}`;
          return (
            <a
              key={p.name}
              href={url}
              target="_blank"
              rel="noopener sponsored"
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-white dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {t("jobsAt", { company: companyName, platform: p.name })}
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            </a>
          );
        })}
      </div>
    </div>
  );
}
