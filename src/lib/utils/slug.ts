export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[äöüß]/g, (match) => {
      const map: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };
      return map[match] ?? match;
    })
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
