import { db } from "@/lib/db";
import {
  layoffs,
  companies,
  industries,
  submissions,
  rssFeeds,
  rssArticles,
  newsletterSubscribers,
  newsletterIssues,
  layoffViews,
} from "@/lib/db/schema";
import { and, eq, desc, gte, sql, inArray, isNotNull, isNull, count, sum } from "drizzle-orm";

// ============================================================
// Overview stats
// ============================================================
export async function getOverviewStats(): Promise<{
  totalLayoffs: number;
  totalAffected: number;
  unverifiedCount: number;
  companiesTracked: number;
  pendingSubmissions: number;
  layoffsThisYear: number;
  layoffsLastYear: number;
  affectedThisYear: number;
  affectedLastYear: number;
}> {
  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;
  const thisYearStart = `${currentYear}-01-01`;
  const thisYearEnd = `${currentYear}-12-31`;
  const lastYearStart = `${lastYear}-01-01`;
  const lastYearEnd = `${lastYear}-12-31`;

  const [
    totalLayoffsRow,
    totalAffectedRow,
    unverifiedRow,
    companiesRow,
    pendingSubsRow,
    thisYearRow,
    lastYearRow,
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(layoffs)
      .where(inArray(layoffs.status, ["verified", "unverified"])),
    db
      .select({ value: sql<string | null>`COALESCE(SUM(${layoffs.affectedCount}), 0)` })
      .from(layoffs)
      .where(eq(layoffs.status, "verified")),
    db
      .select({ value: count() })
      .from(layoffs)
      .where(eq(layoffs.status, "unverified")),
    db.select({ value: count() }).from(companies),
    db
      .select({ value: count() })
      .from(submissions)
      .where(eq(submissions.status, "pending")),
    db
      .select({
        cnt: count(),
        affected: sql<string | null>`COALESCE(SUM(${layoffs.affectedCount}), 0)`,
      })
      .from(layoffs)
      .where(
        and(
          eq(layoffs.status, "verified"),
          gte(layoffs.date, thisYearStart),
          sql`${layoffs.date} <= ${thisYearEnd}`,
        ),
      ),
    db
      .select({
        cnt: count(),
        affected: sql<string | null>`COALESCE(SUM(${layoffs.affectedCount}), 0)`,
      })
      .from(layoffs)
      .where(
        and(
          eq(layoffs.status, "verified"),
          gte(layoffs.date, lastYearStart),
          sql`${layoffs.date} <= ${lastYearEnd}`,
        ),
      ),
  ]);

  return {
    totalLayoffs: Number(totalLayoffsRow[0]?.value ?? 0),
    totalAffected: Number(totalAffectedRow[0]?.value ?? 0),
    unverifiedCount: Number(unverifiedRow[0]?.value ?? 0),
    companiesTracked: Number(companiesRow[0]?.value ?? 0),
    pendingSubmissions: Number(pendingSubsRow[0]?.value ?? 0),
    layoffsThisYear: Number(thisYearRow[0]?.cnt ?? 0),
    layoffsLastYear: Number(lastYearRow[0]?.cnt ?? 0),
    affectedThisYear: Number(thisYearRow[0]?.affected ?? 0),
    affectedLastYear: Number(lastYearRow[0]?.affected ?? 0),
  };
}

// ============================================================
// Subscriber stats
// ============================================================
export async function getSubscriberStats(): Promise<{
  active: number;
  pending: number;
  unsubscribed: number;
  bounced: number;
  newThisMonth: number;
  languageSplit: { de: number; en: number };
  confirmationRate: number;
}> {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    activeRow,
    pendingRow,
    unsubRow,
    bouncedRow,
    newThisMonthRow,
    deRow,
    enRow,
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.status, "active")),
    db
      .select({ value: count() })
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.status, "pending")),
    db
      .select({ value: count() })
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.status, "unsubscribed")),
    db
      .select({ value: count() })
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.status, "bounced")),
    db
      .select({ value: count() })
      .from(newsletterSubscribers)
      .where(
        and(
          eq(newsletterSubscribers.status, "active"),
          gte(newsletterSubscribers.confirmedAt, firstOfMonth),
        ),
      ),
    db
      .select({ value: count() })
      .from(newsletterSubscribers)
      .where(
        and(
          eq(newsletterSubscribers.status, "active"),
          eq(newsletterSubscribers.language, "de"),
        ),
      ),
    db
      .select({ value: count() })
      .from(newsletterSubscribers)
      .where(
        and(
          eq(newsletterSubscribers.status, "active"),
          eq(newsletterSubscribers.language, "en"),
        ),
      ),
  ]);

  const active = Number(activeRow[0]?.value ?? 0);
  const pending = Number(pendingRow[0]?.value ?? 0);
  const denom = active + pending;
  const confirmationRate = denom === 0 ? 100 : Math.round((active / denom) * 1000) / 10;

  return {
    active,
    pending,
    unsubscribed: Number(unsubRow[0]?.value ?? 0),
    bounced: Number(bouncedRow[0]?.value ?? 0),
    newThisMonth: Number(newThisMonthRow[0]?.value ?? 0),
    languageSplit: {
      de: Number(deRow[0]?.value ?? 0),
      en: Number(enRow[0]?.value ?? 0),
    },
    confirmationRate,
  };
}

// ============================================================
// View stats
// ============================================================
export async function getViewStats(): Promise<{
  today: number;
  thisWeek: number;
  thisMonth: number;
}> {
  const [todayRow, weekRow, monthRow] = await Promise.all([
    db
      .select({ value: sql<string | null>`COALESCE(SUM(${layoffViews.viewCount}), 0)` })
      .from(layoffViews)
      .where(sql`${layoffViews.viewedAt} = CURRENT_DATE`),
    db
      .select({ value: sql<string | null>`COALESCE(SUM(${layoffViews.viewCount}), 0)` })
      .from(layoffViews)
      .where(sql`${layoffViews.viewedAt} >= CURRENT_DATE - INTERVAL '7 days'`),
    db
      .select({ value: sql<string | null>`COALESCE(SUM(${layoffViews.viewCount}), 0)` })
      .from(layoffViews)
      .where(sql`${layoffViews.viewedAt} >= CURRENT_DATE - INTERVAL '30 days'`),
  ]);

  return {
    today: Number(todayRow[0]?.value ?? 0),
    thisWeek: Number(weekRow[0]?.value ?? 0),
    thisMonth: Number(monthRow[0]?.value ?? 0),
  };
}

// ============================================================
// Top layoffs by views (last 30 days)
// ============================================================
export async function getTopLayoffsByViews(): Promise<
  Array<{
    id: string;
    titleEn: string;
    companyName: string;
    totalViews: number;
  }>
> {
  const rows = await db
    .select({
      id: layoffs.id,
      titleEn: layoffs.titleEn,
      companyName: companies.name,
      totalViews: sql<string>`COALESCE(SUM(${layoffViews.viewCount}), 0)`,
    })
    .from(layoffViews)
    .innerJoin(layoffs, eq(layoffViews.layoffId, layoffs.id))
    .innerJoin(companies, eq(layoffs.companyId, companies.id))
    .where(
      and(
        eq(layoffs.status, "verified"),
        sql`${layoffViews.viewedAt} >= CURRENT_DATE - INTERVAL '30 days'`,
      ),
    )
    .groupBy(layoffs.id, companies.name)
    .orderBy(sql`COALESCE(SUM(${layoffViews.viewCount}), 0) DESC`)
    .limit(5);

  return rows.map((r) => ({
    id: r.id,
    titleEn: r.titleEn ?? "",
    companyName: r.companyName,
    totalViews: Number(r.totalViews),
  }));
}

// ============================================================
// Unverified layoffs (latest 5)
// ============================================================
export async function getUnverifiedLayoffs(): Promise<
  Array<{
    id: string;
    titleEn: string;
    companyName: string;
    industryNameEn: string;
    country: string;
    affectedCount: number | null;
    source: "rss" | "submission" | "manual";
    createdAt: Date;
  }>
> {
  const rows = await db
    .select({
      id: layoffs.id,
      titleEn: layoffs.titleEn,
      companyName: companies.name,
      industryNameEn: industries.nameEn,
      country: layoffs.country,
      affectedCount: layoffs.affectedCount,
      createdAt: layoffs.createdAt,
    })
    .from(layoffs)
    .innerJoin(companies, eq(layoffs.companyId, companies.id))
    .innerJoin(industries, eq(companies.industrySlug, industries.slug))
    .where(eq(layoffs.status, "unverified"))
    .orderBy(desc(layoffs.createdAt))
    .limit(5);

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);

  const [rssMatches, subMatches] = await Promise.all([
    db
      .select({ layoffId: rssArticles.layoffId })
      .from(rssArticles)
      .where(inArray(rssArticles.layoffId, ids)),
    db
      .select({ layoffId: submissions.layoffId })
      .from(submissions)
      .where(inArray(submissions.layoffId, ids)),
  ]);

  const rssSet = new Set(rssMatches.map((r) => r.layoffId).filter((v): v is string => !!v));
  const subSet = new Set(subMatches.map((r) => r.layoffId).filter((v): v is string => !!v));

  return rows.map((r) => ({
    id: r.id,
    titleEn: r.titleEn ?? "",
    companyName: r.companyName,
    industryNameEn: r.industryNameEn,
    country: r.country,
    affectedCount: r.affectedCount,
    source: rssSet.has(r.id) ? "rss" : subSet.has(r.id) ? "submission" : "manual",
    createdAt: r.createdAt,
  }));
}

// ============================================================
// Pipeline stats
// ============================================================
export async function getPipelineStats(): Promise<{
  activeFeedsCount: number;
  totalFeedsCount: number;
  articlesToday: number;
  relevantToday: number;
  feedErrorsLast7d: number;
  lastFetchedAt: Date | null;
}> {
  const [
    activeRow,
    totalRow,
    articlesTodayRow,
    relevantTodayRow,
    errorsRow,
    lastFetchedRow,
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(rssFeeds)
      .where(eq(rssFeeds.isActive, true)),
    db.select({ value: count() }).from(rssFeeds),
    db
      .select({ value: count() })
      .from(rssArticles)
      .where(sql`${rssArticles.createdAt} >= CURRENT_DATE`),
    db
      .select({ value: count() })
      .from(rssArticles)
      .where(
        and(
          sql`${rssArticles.createdAt} >= CURRENT_DATE`,
          eq(rssArticles.isRelevant, true),
        ),
      ),
    db
      .select({ value: count() })
      .from(rssFeeds)
      .where(
        and(
          isNotNull(rssFeeds.lastError),
          sql`${rssFeeds.lastFetchedAt} >= NOW() - INTERVAL '7 days'`,
        ),
      ),
    db
      .select({ value: sql<Date | null>`MAX(${rssFeeds.lastFetchedAt})` })
      .from(rssFeeds),
  ]);

  return {
    activeFeedsCount: Number(activeRow[0]?.value ?? 0),
    totalFeedsCount: Number(totalRow[0]?.value ?? 0),
    articlesToday: Number(articlesTodayRow[0]?.value ?? 0),
    relevantToday: Number(relevantTodayRow[0]?.value ?? 0),
    feedErrorsLast7d: Number(errorsRow[0]?.value ?? 0),
    lastFetchedAt: lastFetchedRow[0]?.value ? new Date(lastFetchedRow[0].value) : null,
  };
}

// ============================================================
// Recent activity
// ============================================================
type ActivityItem = {
  type: "verified" | "rejected" | "submission" | "feed_error" | "subscriber";
  title: string;
  detail: string;
  timestamp: Date;
};

function anonymizeEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return `${local[0]}***@${domain}`;
}

export async function getRecentActivity(): Promise<ActivityItem[]> {
  const [verifiedRows, submissionRows, feedErrorRows, subscriberRows] = await Promise.all([
    db
      .select({
        companyName: companies.name,
        affectedCount: layoffs.affectedCount,
        verifiedAt: layoffs.verifiedAt,
      })
      .from(layoffs)
      .innerJoin(companies, eq(layoffs.companyId, companies.id))
      .where(and(eq(layoffs.status, "verified"), isNotNull(layoffs.verifiedAt)))
      .orderBy(desc(layoffs.verifiedAt))
      .limit(3),
    db
      .select({
        companyName: submissions.companyName,
        createdAt: submissions.createdAt,
      })
      .from(submissions)
      .orderBy(desc(submissions.createdAt))
      .limit(3),
    db
      .select({
        name: rssFeeds.name,
        lastError: rssFeeds.lastError,
        lastFetchedAt: rssFeeds.lastFetchedAt,
      })
      .from(rssFeeds)
      .where(isNotNull(rssFeeds.lastError))
      .orderBy(desc(rssFeeds.lastFetchedAt))
      .limit(3),
    db
      .select({
        email: newsletterSubscribers.email,
        confirmedAt: newsletterSubscribers.confirmedAt,
      })
      .from(newsletterSubscribers)
      .where(
        and(
          eq(newsletterSubscribers.status, "active"),
          isNotNull(newsletterSubscribers.confirmedAt),
        ),
      )
      .orderBy(desc(newsletterSubscribers.confirmedAt))
      .limit(3),
  ]);

  const items: ActivityItem[] = [];

  for (const row of verifiedRows) {
    if (!row.verifiedAt) continue;
    items.push({
      type: "verified",
      title: `${row.companyName} layoff verified`,
      detail: `${(row.affectedCount ?? 0).toLocaleString()} affected`,
      timestamp: row.verifiedAt,
    });
  }

  for (const row of submissionRows) {
    items.push({
      type: "submission",
      title: `New submission: ${row.companyName}`,
      detail: "awaiting review",
      timestamp: row.createdAt,
    });
  }

  for (const row of feedErrorRows) {
    if (!row.lastFetchedAt) continue;
    const err = row.lastError ?? "";
    items.push({
      type: "feed_error",
      title: `Feed error: ${row.name}`,
      detail: err.length > 50 ? `${err.slice(0, 50)}…` : err,
      timestamp: row.lastFetchedAt,
    });
  }

  for (const row of subscriberRows) {
    if (!row.confirmedAt) continue;
    items.push({
      type: "subscriber",
      title: "New subscriber confirmed",
      detail: anonymizeEmail(row.email),
      timestamp: row.confirmedAt,
    });
  }

  return items
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 8);
}

// ============================================================
// Newsletter stats
// ============================================================
export async function getNewsletterStats(): Promise<{
  lastIssue: {
    subject: string;
    sentAt: Date | null;
    recipientCount: number | null;
  } | null;
  totalIssuesSent: number;
}> {
  const [lastIssueRow, totalSentRow] = await Promise.all([
    db
      .select({
        subject: newsletterIssues.subjectEn,
        sentAt: newsletterIssues.sentAt,
        recipientCount: newsletterIssues.recipientCount,
      })
      .from(newsletterIssues)
      .where(eq(newsletterIssues.status, "sent"))
      .orderBy(desc(newsletterIssues.sentAt))
      .limit(1),
    db
      .select({ value: count() })
      .from(newsletterIssues)
      .where(eq(newsletterIssues.status, "sent")),
  ]);

  const last = lastIssueRow[0];
  return {
    lastIssue: last
      ? {
          subject: last.subject,
          sentAt: last.sentAt,
          recipientCount: last.recipientCount,
        }
      : null,
    totalIssuesSent: Number(totalSentRow[0]?.value ?? 0),
  };
}
