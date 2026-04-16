/**
 * Normalizes a title for duplicate detection:
 * - lowercase
 * - strip punctuation and quotes
 * - collapse whitespace
 * - remove common stopwords that don't affect meaning
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[''""\u201E\u201C\u201D\u201A\u2018\u2019\u00AB\u00BB]/g, "")
    .replace(/[^\w\s\u00E4\u00F6\u00FC\u00DF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
