"use server";

import { db } from "@/lib/db";
import { layoffs, companies, industries, newsletterSubscribers, submissions } from "@/lib/db/schema";
import { eq, desc, asc, count, and, sql, ilike, gte } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { socialPostQueue } from "@/lib/queue";

const layoffSchema = z.object({
  companyId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  affectedCount: z.coerce.number().int().positive().optional().or(z.literal("")),
  affectedPercentage: z.coerce.number().min(0).max(100).optional().or(z.literal("")),
  totalEmployeesAtTime: z.coerce.number().int().positive().optional().or(z.literal("")),
  country: z.string().length(2),
  city: z.string().max(100).optional().or(z.literal("")),
  isShutdown: z.string().optional(),
  reason: z.enum(["restructuring", "cost_cutting", "ai_replacement", "market_downturn", "merger", "shutdown", "other"]).optional().or(z.literal("")),
  severanceWeeks: z.coerce.number().int().positive().optional().or(z.literal("")),
  severanceDetailsEn: z.string().max(2000).optional().or(z.literal("")),
  severanceDetailsDe: z.string().max(2000).optional().or(z.literal("")),
  sourceUrl: z.string().url(),
  sourceName: z.string().max(200).optional().or(z.literal("")),
  titleEn: z.string().max(200).optional().or(z.literal("")),
  titleDe: z.string().max(200).optional().or(z.literal("")),
  summaryEn: z.string().max(2000).optional().or(z.literal("")),
  summaryDe: z.string().max(2000).optional().or(z.literal("")),
});

type ActionResult<T = undefined> = { success: boolean; error?: string; data?: T };
type StatusFilter = "all" | "unverified" | "verified" | "rejected";

/** Returns admin UUID if available from JWT, or null */
function getAdminIdFromSession(session: { user?: { id?: string } } | null): string | null {
  if (!session?.user) return null;
  const user = session.user as { id?: string };
  // id is a valid UUID if set by our jwt callback
  if (user.id && user.id.includes("-")) return user.id;
  return null;
}

type SortField = "date" | "company" | "affected" | "country" | "status";
type SortOrder = "asc" | "desc";

interface GetLayoffsOptions {
  status?: StatusFilter;
  search?: string;
  country?: string;
  industry?: string;
  sort?: SortField;
  order?: SortOrder;
  page?: number;
  perPage?: number;
}

export async function getLayoffs(opts: GetLayoffsOptions = {}) {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" } as const;

  const { status = "all", search, country, industry, sort = "date", order = "desc", page = 1, perPage = 25 } = opts;
  const offset = (page - 1) * perPage;

  const conditions = [];
  if (status !== "all") conditions.push(eq(layoffs.status, status));
  if (search) conditions.push(ilike(companies.name, `%${search}%`));
  if (country) conditions.push(eq(layoffs.country, country));
  if (industry) conditions.push(eq(companies.industrySlug, industry));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const sortColumnMap = {
    date: layoffs.date,
    company: companies.name,
    affected: layoffs.affectedCount,
    country: layoffs.country,
    status: layoffs.status,
  } as const;
  const sortCol = sortColumnMap[sort] ?? layoffs.date;
  const orderFn = order === "asc" ? asc : desc;

  const [items, [total]] = await Promise.all([
    db
      .select({
        id: layoffs.id, date: layoffs.date, affectedCount: layoffs.affectedCount,
        country: layoffs.country, status: layoffs.status, titleEn: layoffs.titleEn,
        isShutdown: layoffs.isShutdown, reason: layoffs.reason, createdAt: layoffs.createdAt,
        companyName: companies.name, companySlug: companies.slug,
      })
      .from(layoffs)
      .innerJoin(companies, eq(layoffs.companyId, companies.id))
      .where(where)
      .orderBy(orderFn(sortCol))
      .limit(perPage)
      .offset(offset),
    db
      .select({ count: count() })
      .from(layoffs)
      .innerJoin(companies, eq(layoffs.companyId, companies.id))
      .where(where),
  ]);

  return { success: true, data: { items, total: total.count, page, perPage } };
}

export async function getLayoffFilterOptions() {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" } as const;

  const [countryRows, industryRows] = await Promise.all([
    db.selectDistinct({ country: layoffs.country }).from(layoffs).orderBy(asc(layoffs.country)),
    db.select({ slug: industries.slug, nameEn: industries.nameEn }).from(industries).orderBy(asc(industries.sortOrder)),
  ]);

  return {
    success: true,
    data: {
      countries: countryRows.map((r) => r.country),
      industries: industryRows,
    },
  };
}

export async function getLayoffById(id: string) {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" } as const;

  const [layoff] = await db
    .select({ layoff: layoffs, companyName: companies.name })
    .from(layoffs)
    .innerJoin(companies, eq(layoffs.companyId, companies.id))
    .where(eq(layoffs.id, id))
    .limit(1);

  if (!layoff) return { success: false, error: "Layoff not found" } as const;
  return { success: true, data: layoff };
}

export async function createLayoff(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = layoffSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const d = parsed.data;

  const [layoff] = await db
    .insert(layoffs)
    .values({
      companyId: d.companyId,
      date: d.date,
      affectedCount: d.affectedCount ? Number(d.affectedCount) : null,
      affectedPercentage: d.affectedPercentage ? String(d.affectedPercentage) : null,
      totalEmployeesAtTime: d.totalEmployeesAtTime ? Number(d.totalEmployeesAtTime) : null,
      country: d.country,
      city: d.city || null,
      isShutdown: d.isShutdown === "on",
      reason: (d.reason || null) as typeof layoffs.$inferInsert.reason,
      severanceWeeks: d.severanceWeeks ? Number(d.severanceWeeks) : null,
      severanceDetailsEn: d.severanceDetailsEn || null,
      severanceDetailsDe: d.severanceDetailsDe || null,
      sourceUrl: d.sourceUrl,
      sourceName: d.sourceName || null,
      titleEn: d.titleEn || null,
      titleDe: d.titleDe || null,
      summaryEn: d.summaryEn || null,
      summaryDe: d.summaryDe || null,
      status: "unverified",
    })
    .returning({ id: layoffs.id });

  return { success: true, data: { id: layoff.id } };
}

export async function updateLayoff(id: string, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = layoffSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const d = parsed.data;

  await db
    .update(layoffs)
    .set({
      companyId: d.companyId,
      date: d.date,
      affectedCount: d.affectedCount ? Number(d.affectedCount) : null,
      affectedPercentage: d.affectedPercentage ? String(d.affectedPercentage) : null,
      totalEmployeesAtTime: d.totalEmployeesAtTime ? Number(d.totalEmployeesAtTime) : null,
      country: d.country,
      city: d.city || null,
      isShutdown: d.isShutdown === "on",
      reason: (d.reason || null) as typeof layoffs.$inferInsert.reason,
      severanceWeeks: d.severanceWeeks ? Number(d.severanceWeeks) : null,
      severanceDetailsEn: d.severanceDetailsEn || null,
      severanceDetailsDe: d.severanceDetailsDe || null,
      sourceUrl: d.sourceUrl,
      sourceName: d.sourceName || null,
      titleEn: d.titleEn || null,
      titleDe: d.titleDe || null,
      summaryEn: d.summaryEn || null,
      summaryDe: d.summaryDe || null,
      updatedAt: new Date(),
    })
    .where(eq(layoffs.id, id));

  return { success: true };
}

export async function verifyLayoff(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" };

  // verifiedBy is nullable — set it if we have an admin UUID, skip if not
  const adminId = getAdminIdFromSession(session);

  await db.update(layoffs).set({
    status: "verified",
    verifiedAt: new Date(),
    verifiedBy: adminId,
    publishedToSocial: true,
    updatedAt: new Date(),
  }).where(eq(layoffs.id, id));

  // Enqueue social media posts with staggered delays
  await socialPostQueue.add("post-x", { layoffId: id, platform: "x" }, {
    removeOnComplete: 100,
    removeOnFail: 200,
  });
  await socialPostQueue.add("post-linkedin", { layoffId: id, platform: "linkedin" }, {
    delay: 30 * 60 * 1000,
    removeOnComplete: 100,
    removeOnFail: 200,
  });
  await socialPostQueue.add("post-reddit", { layoffId: id, platform: "reddit" }, {
    delay: 60 * 60 * 1000,
    removeOnComplete: 100,
    removeOnFail: 200,
  });

  revalidatePath("/admin/layoffs");
  return { success: true };
}

export async function rejectLayoff(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" };

  const adminId = getAdminIdFromSession(session);

  await db.update(layoffs).set({
    status: "rejected",
    verifiedAt: new Date(),
    verifiedBy: adminId,
    updatedAt: new Date(),
  }).where(eq(layoffs.id, id));

  revalidatePath("/admin/layoffs");
  return { success: true };
}

export async function deleteLayoff(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" };

  const user = session.user as typeof session.user & { role?: string };
  if (user.role !== "admin") return { success: false, error: "Only admins can delete layoffs" };

  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { success: false, error: "Invalid ID" };

  await db.delete(layoffs).where(eq(layoffs.id, id));

  revalidatePath("/admin/layoffs");
  return { success: true };
}

export async function getDashboardStats() {
  const session = await auth();
  if (!session) return null;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];

  const [
    [totalLayoffs],
    [verifiedLayoffs],
    [unverifiedLayoffs],
    [totalCompanies],
    [totalAffected],
    [activeSubscribers],
    [pendingSubmissions],
    [thisWeek],
  ] = await Promise.all([
    db.select({ count: count() }).from(layoffs),
    db.select({ count: count() }).from(layoffs).where(eq(layoffs.status, "verified")),
    db.select({ count: count() }).from(layoffs).where(eq(layoffs.status, "unverified")),
    db.select({ count: count() }).from(companies),
    db.select({ total: sql<number>`coalesce(sum(${layoffs.affectedCount}), 0)` }).from(layoffs).where(eq(layoffs.status, "verified")),
    db.select({ count: count() }).from(newsletterSubscribers).where(eq(newsletterSubscribers.status, "active")),
    db.select({ count: count() }).from(submissions).where(eq(submissions.status, "pending")),
    db.select({ count: count() }).from(layoffs).where(and(eq(layoffs.status, "verified"), gte(layoffs.date, weekAgoStr))),
  ]);

  return {
    totalLayoffs: totalLayoffs.count,
    verifiedLayoffs: verifiedLayoffs.count,
    unverifiedLayoffs: unverifiedLayoffs.count,
    totalCompanies: totalCompanies.count,
    totalAffected: Number(totalAffected.total),
    activeSubscribers: activeSubscribers.count,
    pendingSubmissions: pendingSubmissions.count,
    thisWeek: thisWeek.count,
  };
}
