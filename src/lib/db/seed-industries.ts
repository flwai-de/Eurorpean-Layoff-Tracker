import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { industries } from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const client = postgres(connectionString);
const db = drizzle(client);

const data: (typeof industries.$inferInsert)[] = [
  { slug: "technology", nameEn: "Technology", nameDe: "Technologie", sortOrder: 1 },
  { slug: "saas", nameEn: "SaaS", nameDe: "SaaS", sortOrder: 2 },
  { slug: "fintech", nameEn: "FinTech", nameDe: "FinTech", sortOrder: 3 },
  { slug: "ecommerce", nameEn: "E-Commerce", nameDe: "E-Commerce", sortOrder: 4 },
  { slug: "gaming", nameEn: "Gaming", nameDe: "Gaming", sortOrder: 5 },
  { slug: "automotive", nameEn: "Automotive", nameDe: "Automobilindustrie", sortOrder: 6 },
  { slug: "ev", nameEn: "Electric Vehicles", nameDe: "Elektromobilität", sortOrder: 7 },
  { slug: "finance", nameEn: "Finance & Banking", nameDe: "Finanzen & Banken", sortOrder: 8 },
  { slug: "manufacturing", nameEn: "Manufacturing", nameDe: "Produktion", sortOrder: 9 },
  { slug: "energy", nameEn: "Energy", nameDe: "Energie", sortOrder: 10 },
  { slug: "healthcare", nameEn: "Healthcare", nameDe: "Gesundheitswesen", sortOrder: 11 },
  { slug: "logistics", nameEn: "Logistics", nameDe: "Logistik", sortOrder: 12 },
  { slug: "retail", nameEn: "Retail", nameDe: "Einzelhandel", sortOrder: 13 },
  { slug: "media", nameEn: "Media & Entertainment", nameDe: "Medien & Unterhaltung", sortOrder: 14 },
  { slug: "telecom", nameEn: "Telecom", nameDe: "Telekommunikation", sortOrder: 15 },
  { slug: "consulting", nameEn: "Consulting", nameDe: "Beratung", sortOrder: 16 },
  { slug: "real_estate", nameEn: "Real Estate", nameDe: "Immobilien", sortOrder: 17 },
  { slug: "travel", nameEn: "Travel & Hospitality", nameDe: "Reise & Gastgewerbe", sortOrder: 18 },
  { slug: "education", nameEn: "Education", nameDe: "Bildung", sortOrder: 19 },
  { slug: "pharma", nameEn: "Pharma & Biotech", nameDe: "Pharma & Biotech", sortOrder: 20 },
  { slug: "defense", nameEn: "Defense & Aerospace", nameDe: "Verteidigung & Luft/Raumfahrt", sortOrder: 21 },
  { slug: "consumer_goods", nameEn: "Consumer Goods", nameDe: "Konsumgüter", sortOrder: 0 },
  { slug: "chemicals", nameEn: "Chemicals", nameDe: "Chemie", sortOrder: 0 },
  { slug: "semiconductors", nameEn: "Semiconductors", nameDe: "Halbleiter", parentSlug: "technology", sortOrder: 0 },
  { slug: "mining_steel", nameEn: "Mining & Steel", nameDe: "Bergbau & Stahl", parentSlug: "manufacturing", sortOrder: 0 },
];

async function main() {
  console.log("Seeding industries...");
  await db.insert(industries).values(data).onConflictDoNothing({ target: industries.slug });
  console.log(`Done — ${data.length} industries seeded.`);
  await client.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
