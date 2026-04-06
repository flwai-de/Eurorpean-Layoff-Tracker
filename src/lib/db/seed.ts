import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { industries, admins } from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const client = postgres(connectionString);
const db = drizzle(client);

const industryData = [
  { slug: "technology", nameEn: "Technology", nameDe: "Technologie", parentSlug: null, sortOrder: 0 },
  { slug: "saas", nameEn: "SaaS", nameDe: "SaaS", parentSlug: "technology", sortOrder: 1 },
  { slug: "fintech", nameEn: "FinTech", nameDe: "FinTech", parentSlug: "technology", sortOrder: 2 },
  { slug: "ecommerce", nameEn: "E-Commerce", nameDe: "E-Commerce", parentSlug: "technology", sortOrder: 3 },
  { slug: "gaming", nameEn: "Gaming", nameDe: "Gaming", parentSlug: "technology", sortOrder: 4 },
  { slug: "automotive", nameEn: "Automotive", nameDe: "Automobilindustrie", parentSlug: null, sortOrder: 10 },
  { slug: "ev", nameEn: "Electric Vehicles", nameDe: "Elektromobilität", parentSlug: "automotive", sortOrder: 11 },
  { slug: "finance", nameEn: "Finance & Banking", nameDe: "Finanzen & Banken", parentSlug: null, sortOrder: 20 },
  { slug: "manufacturing", nameEn: "Manufacturing", nameDe: "Produktion", parentSlug: null, sortOrder: 30 },
  { slug: "energy", nameEn: "Energy", nameDe: "Energie", parentSlug: null, sortOrder: 40 },
  { slug: "healthcare", nameEn: "Healthcare", nameDe: "Gesundheitswesen", parentSlug: null, sortOrder: 50 },
  { slug: "logistics", nameEn: "Logistics", nameDe: "Logistik", parentSlug: null, sortOrder: 60 },
  { slug: "retail", nameEn: "Retail", nameDe: "Einzelhandel", parentSlug: null, sortOrder: 70 },
  { slug: "media", nameEn: "Media & Entertainment", nameDe: "Medien & Unterhaltung", parentSlug: null, sortOrder: 80 },
  { slug: "telecom", nameEn: "Telecom", nameDe: "Telekommunikation", parentSlug: null, sortOrder: 90 },
  { slug: "consulting", nameEn: "Consulting", nameDe: "Beratung", parentSlug: null, sortOrder: 100 },
  { slug: "real_estate", nameEn: "Real Estate", nameDe: "Immobilien", parentSlug: null, sortOrder: 110 },
  { slug: "travel", nameEn: "Travel & Hospitality", nameDe: "Reise & Gastgewerbe", parentSlug: null, sortOrder: 120 },
  { slug: "education", nameEn: "Education", nameDe: "Bildung", parentSlug: null, sortOrder: 130 },
  { slug: "pharma", nameEn: "Pharma & Biotech", nameDe: "Pharma & Biotech", parentSlug: null, sortOrder: 140 },
  { slug: "defense", nameEn: "Defense & Aerospace", nameDe: "Verteidigung & Luft/Raumfahrt", parentSlug: null, sortOrder: 150 },
] as const;

async function seed() {
  console.log("Seeding industries...");

  // Insert parent industries first (parentSlug = null), then children
  const parents = industryData.filter((i) => i.parentSlug === null);
  const children = industryData.filter((i) => i.parentSlug !== null);

  await db.insert(industries).values(parents).onConflictDoNothing();
  await db.insert(industries).values(children).onConflictDoNothing();

  console.log(`Inserted ${industryData.length} industries.`);

  // Insert first admin — change this email to yours!
  console.log("Seeding admin...");
  await db
    .insert(admins)
    .values({
      email: "your-email@example.com",
      name: "Admin",
      role: "admin",
    })
    .onConflictDoNothing();

  console.log("Seed complete.");
  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
