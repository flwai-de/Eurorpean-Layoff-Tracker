export function generateLayoffTitle(
  data: {
    companyName: string;
    affectedCount: number | null;
    affectedPercentage: string | number | null;
    isShutdown: boolean;
  },
  locale: "de" | "en",
): string {
  const { companyName, affectedCount, affectedPercentage, isShutdown } = data;
  const pct = affectedPercentage != null ? Number(affectedPercentage) : null;

  if (isShutdown) {
    return locale === "de"
      ? `${companyName} wird geschlossen`
      : `${companyName} shuts down`;
  }

  const fmtCount = affectedCount != null
    ? affectedCount.toLocaleString(locale === "de" ? "de-DE" : "en-US")
    : null;

  if (fmtCount && pct) {
    return locale === "de"
      ? `${companyName} entlässt ${fmtCount} Mitarbeiter (${pct}%)`
      : `${companyName} lays off ${fmtCount} employees (${pct}%)`;
  }

  if (fmtCount) {
    return locale === "de"
      ? `${companyName} entlässt ${fmtCount} Mitarbeiter`
      : `${companyName} lays off ${fmtCount} employees`;
  }

  if (pct) {
    return locale === "de"
      ? `${companyName} entlässt ${pct}% der Belegschaft`
      : `${companyName} lays off ${pct}% of workforce`;
  }

  return locale === "de"
    ? `${companyName}: Stellenabbau`
    : `${companyName}: Layoffs`;
}
