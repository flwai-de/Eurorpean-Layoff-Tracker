"use server";

import { db } from "@/lib/db";
import { layoffs, companies, admins } from "@/lib/db/schema";
import { eq, desc, count, and, sql, ilike } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";

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
  titleEn: z.string().min(1).max(200),
  titleDe: z.string().min(1).max(200),
  summaryEn: z.string().max(2000).optional().or(z.literal("")),
  summaryDe: z.string().max(2000).optional().or(z.literal("")),
});

type ActionResult<T = undefined> = { success: boolean; error?: string; data?: T };

type StatusFilter = "all" | "unverified" | "verified" | "rejected";

export async function getLayoffs(
  status: StatusFilter = "all",
  search?: string,
  page = 1,
  perPage = 25,
) {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" } as const;

  const offset = (page - 1) * perPage;
  const conditions = [];

  if (status !== "all") {
    conditions.push(eq(layoffs.status, status));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, [total]] = await Promise.all([
    db
      .select({
        id: layoffs.id,
        date: layoffs.date,
        affectedCount: layoffs.affectedCount,
        country: layoffs.country,
        status: layoffs.status,
        titleEn: layoffs.titleEn,
        isShutdown: layoffs.isShutdown,
        reason: layoffs.reason,
        createdAt: layoffs.createdAt,
        companyName: companies.name,
        companySlug: companies.slug,
      })
      .from(layoffs)
      .innerJoin(companies, eq(layoffs.companyId, companies.id))
      .where(
        search
          ? and(where, ilike(companies.name, `%${search}%`))
          : where,
      )
      .orderBy(desc(layoffs.date))
      .limit(perPage)
      .offset(offset),
    db
      .select({ count: count() })
      .from(layoffs)
      .innerJoin(companies, eq(layoffs.companyId, companies.id))
      .where(
        search
          ? and(where, ilike(companies.name, `%${search}%`))
          : where,
      ),
  ]);

  return { success: true, data: { items, total: total.count, page, perPage } };
}

export async function getLayoffById(id: string) {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" } as const;

  const [layoff] = await db
    .select({
      layoff: layoffs,
      companyName: companies.name,
    })
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
      titleEn: d.titleEn,
      titleDe: d.titleDe,
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
      titleEn: d.titleEn,
      titleDe: d.titleDe,
      summaryEn: d.summaryEn || null,
      summaryDe: d.summaryDe || null,
      updatedAt: new Date(),
    })
    .where(eq(layoffs.id, id));

  return { success: true };
}

export async function verifyLayoff(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.email) return { success: false, error: "Unauthorized" };

  const [admin] = await db
    .select({ id: admins.id })
    .from(admins)
    .where(eq(admins.email, session.user.email))
    .limit(1);

  if (!admin) return { success: false, error: "Admin not found" };

  await db
    .update(layoffs)
    .set({
      status: "verified",
      verifiedAt: new Date(),
      verifiedBy: admin.id,
      updatedAt: new Date(),
    })
    .where(eq(layoffs.id, id));

  return { success: true };
}

export async function rejectLayoff(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.email) return { success: false, error: "Unauthorized" };

  const [admin] = await db
    .select({ id: admins.id })
    .from(admins)
    .where(eq(admins.email, session.user.email))
    .limit(1);

  if (!admin) return { success: false, error: "Admin not found" };

  await db
    .update(layoffs)
    .set({
      status: "rejected",
      verifiedAt: new Date(),
      verifiedBy: admin.id,
      updatedAt: new Date(),
    })
    .where(eq(layoffs.id, id));

  return { success: true };
}

export async function getDashboardStats() {
  const session = await auth();
  if (!session) return null;

  const [
    [totalLayoffs],
    [verifiedLayoffs],
    [unverifiedLayoffs],
    [totalCompanies],
    [totalAffected],
  ] = await Promise.all([
    db.select({ count: count() }).from(layoffs),
    db.select({ count: count() }).from(layoffs).where(eq(layoffs.status, "verified")),
    db.select({ count: count() }).from(layoffs).where(eq(layoffs.status, "unverified")),
    db.select({ count: count() }).from(companies),
    db
      .select({ total: sql<number>`coalesce(sum(${layoffs.affectedCount}), 0)` })
      .from(layoffs)
      .where(eq(layoffs.status, "verified")),
  ]);

  return {
    totalLayoffs: totalLayoffs.count,
    verifiedLayoffs: verifiedLayoffs.count,
    unverifiedLayoffs: unverifiedLayoffs.count,
    totalCompanies: totalCompanies.count,
    totalAffected: Number(totalAffected.total),
  };
}
