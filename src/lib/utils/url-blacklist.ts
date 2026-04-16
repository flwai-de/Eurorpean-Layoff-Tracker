const BLACKLIST_PATTERNS = [
  // Sport
  /\/sport\//i,
  /\/fussball\//i,
  /\/bundesliga\//i,
  /\/formel-1\//i,
  /\/football\//i,
  /\/olympic/i,
  // Lifestyle / Unterhaltung
  /\/rezept/i,
  /\/recipe/i,
  /\/wetter\//i,
  /\/weather\//i,
  /\/horoskop/i,
  /\/horoscope/i,
  /\/royal/i,
  /\/promi/i,
  /\/celebrity/i,
  /\/lifestyle\//i,
  // Reise-Inspiration (nicht Business)
  /\/reise-tipps/i,
  /\/travel-tips/i,
];

export function isBlacklistedUrl(url: string): boolean {
  return BLACKLIST_PATTERNS.some((pattern) => pattern.test(url));
}
