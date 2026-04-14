export const TIER_1_KEYWORDS: string[] = [
  // English
  "layoffs",
  "laid off",
  "job cuts",
  "mass layoffs",
  "workforce reduction",
  "redundancies",
  "made redundant",
  "downsizing",
  "pink slips",
  // German
  "stellenabbau",
  "massenentlassung",
  "entlässt mitarbeiter",
  "personalabbau",
  "arbeitsplätze gestrichen",
  "stellen gestrichen",
  "jobabbau",
  "kahlschlag",
];

export const TIER_2_KEYWORDS: string[] = [
  // English
  "cutting jobs",
  "slashing jobs",
  "eliminating positions",
  "shutting down",
  "closing offices",
  "plant closure",
  "restructuring plan",
  // German
  "restrukturierung",
  "standort schließt",
  "werk schließt",
  "betriebsbedingte kündigungen",
  "sozialplan",
  "baut stellen ab",
  "streicht arbeitsplätze",
];

export const NEGATIVE_KEYWORDS: string[] = [
  "avoids",
  "rules out",
  "denies",
  "no layoffs",
  "verhindert",
  "keine entlassungen",
  "kein stellenabbau",
  "dementiert",
];

export interface RelevanceResult {
  isRelevant: boolean;
  matchedKeywords: string[];
  tier: 1 | 2 | null;
}

export function checkRelevance(title: string, content?: string): RelevanceResult {
  const haystack = `${title} ${content ?? ""}`.toLowerCase();

  const negativeHits = NEGATIVE_KEYWORDS.filter((kw) => haystack.includes(kw));
  if (negativeHits.length > 0) {
    return { isRelevant: false, matchedKeywords: negativeHits, tier: null };
  }

  const tier1Hits = TIER_1_KEYWORDS.filter((kw) => haystack.includes(kw));
  if (tier1Hits.length > 0) {
    return { isRelevant: true, matchedKeywords: tier1Hits, tier: 1 };
  }

  const tier2Hits = TIER_2_KEYWORDS.filter((kw) => haystack.includes(kw));
  if (tier2Hits.length > 0) {
    return { isRelevant: true, matchedKeywords: tier2Hits, tier: 2 };
  }

  return { isRelevant: false, matchedKeywords: [], tier: null };
}
