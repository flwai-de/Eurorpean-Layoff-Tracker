export interface IndustryGroup {
  key: string;
  labelEn: string;
  labelDe: string;
  slugs: string[];
}

export const INDUSTRY_GROUPS: IndustryGroup[] = [
  { key: "tech", labelEn: "Tech", labelDe: "Tech", slugs: ["technology", "saas", "fintech", "ecommerce", "gaming"] },
  { key: "automotive", labelEn: "Automotive", labelDe: "Automotive", slugs: ["automotive", "ev"] },
  { key: "industry", labelEn: "Industry", labelDe: "Industrie", slugs: ["manufacturing", "energy", "defense"] },
  { key: "finance", labelEn: "Finance", labelDe: "Finanzen", slugs: ["finance", "consulting"] },
  { key: "health", labelEn: "Health", labelDe: "Gesundheit", slugs: ["healthcare", "pharma"] },
  { key: "retail", labelEn: "Retail & Consumer", labelDe: "Handel & Konsum", slugs: ["retail", "logistics", "travel"] },
  { key: "media", labelEn: "Telecommunications & Media", labelDe: "Telekommunikation & Medien", slugs: ["media", "telecom"] },
];

export const OTHER_GROUP: IndustryGroup = {
  key: "other",
  labelEn: "Other",
  labelDe: "Sonstige",
  slugs: ["real_estate", "education"],
};

const groupBySlug = new Map<string, string>();
for (const g of [...INDUSTRY_GROUPS, OTHER_GROUP]) {
  for (const s of g.slugs) groupBySlug.set(s, g.key);
}

export function getGroupForSlug(slug: string): string | undefined {
  return groupBySlug.get(slug);
}

export function getGroupByKey(key: string): IndustryGroup | undefined {
  if (key === OTHER_GROUP.key) return OTHER_GROUP;
  return INDUSTRY_GROUPS.find((g) => g.key === key);
}

export function getSlugsForGroup(groupKey: string): string[] {
  const group = getGroupByKey(groupKey);
  return group ? group.slugs : [];
}

export function getGroupLabel(groupKey: string, locale: "de" | "en"): string {
  const group = getGroupByKey(groupKey);
  if (!group) return groupKey;
  return locale === "de" ? group.labelDe : group.labelEn;
}

export function isGroupKey(value: string): boolean {
  return getGroupByKey(value) !== undefined;
}

export const ALL_GROUPS: IndustryGroup[] = [...INDUSTRY_GROUPS, OTHER_GROUP];

export function resolveIndustryFilter(value: string | undefined): {
  slug?: string;
  slugs?: string[];
} {
  if (!value) return {};
  const group = getGroupByKey(value);
  if (group) return { slugs: group.slugs };
  return { slug: value };
}
