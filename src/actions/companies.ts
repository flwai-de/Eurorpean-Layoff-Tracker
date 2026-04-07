"use server";

import { db } from "@/lib/db";
import { companies, industries } from "@/lib/db/schema";
import { eq, ilike, desc, count } from "drizzle-orm";
import { z } from "zod";
import { generateSlug } from "@/lib/utils/slug";
import { auth } from "@/lib/auth";

const companySchema = z.object({
  name: z.string().min(1).max(200),
  website: z.string().url().optional().or(z.literal("")),
  industrySlug: z.string().min(1),
  countryHq: z.string().length(2),
  cityHq: z.string().max(100).optional().or(z.literal("")),
  employeeCount: z.coerce.number().int().positive().optional().or(z.literal("")),
  foundedYear: z.coerce.number().int().min(1800).max(new Date().getFullYear()).optional().or(z.literal("")),
  companyType: z.enum(["startup", "scaleup", "public", "enterprise", "government"]),
  descriptionEn: z.string().max(2000).optional().or(z.literal("")),
  descriptionDe: z.string().max(2000).optional().or(z.literal("")),
});

type ActionResult<T = undefined> = { success: boolean; error?: string; data?: T };

export async function getCompanies(search?: string, page = 1, perPage = 25) {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" } as const;

  const offset = (page - 1) * perPage;
  const where = search ? ilike(companies.name, `%${search}%`) : undefined;

  const [items, [total]] = await Promise.all([
    db
      .select({
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        industrySlug: companies.industrySlug,
        countryHq: companies.countryHq,
        companyType: companies.companyType,
        employeeCount: companies.employeeCount,
        createdAt: companies.createdAt,
      })
      .from(companies)
      .where(where)
      .orderBy(desc(companies.createdAt))
      .limit(perPage)
      .offset(offset),
    db.select({ count: count() }).from(companies).where(where),
  ]);

  return { success: true, data: { items, total: total.count, page, perPage } };
}

export async function getCompanyById(id: string) {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" } as const;

  const [company] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  if (!company) return { success: false, error: "Company not found" } as const;
  return { success: true, data: company };
}

export async function createCompany(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = companySchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const data = parsed.data;
  const slug = generateSlug(data.name);

  const [existing] = await db.select({ id: companies.id }).from(companies).where(eq(companies.slug, slug)).limit(1);
  if (existing) return { success: false, error: `Company with slug "${slug}" already exists` };

  const [company] = await db
    .insert(companies)
    .values({
      name: data.name,
      slug,
      website: data.website || null,
      industrySlug: data.industrySlug,
      countryHq: data.countryHq,
      cityHq: data.cityHq || null,
      employeeCount: data.employeeCount ? Number(data.employeeCount) : null,
      foundedYear: data.foundedYear ? Number(data.foundedYear) : null,
      companyType: data.companyType,
      descriptionEn: data.descriptionEn || null,
      descriptionDe: data.descriptionDe || null,
    })
    .returning({ id: companies.id });

  return { success: true, data: { id: company.id } };
}

export async function updateCompany(id: string, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = companySchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const data = parsed.data;

  await db
    .update(companies)
    .set({
      name: data.name,
      website: data.website || null,
      industrySlug: data.industrySlug,
      countryHq: data.countryHq,
      cityHq: data.cityHq || null,
      employeeCount: data.employeeCount ? Number(data.employeeCount) : null,
      foundedYear: data.foundedYear ? Number(data.foundedYear) : null,
      companyType: data.companyType,
      descriptionEn: data.descriptionEn || null,
      descriptionDe: data.descriptionDe || null,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, id));

  return { success: true };
}

export async function searchCompanies(query: string) {
  const session = await auth();
  if (!session) return [];

  if (query.length < 2) return [];

  return db
    .select({ id: companies.id, name: companies.name, slug: companies.slug })
    .from(companies)
    .where(ilike(companies.name, `%${query}%`))
    .orderBy(companies.name)
    .limit(10);
}

export async function getIndustryOptions() {
  return db.select().from(industries).orderBy(industries.sortOrder);
}
