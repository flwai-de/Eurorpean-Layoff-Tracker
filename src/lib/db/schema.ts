import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  date,
  numeric,
  timestamp,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================
// Industries
// ============================================================
export const industries = pgTable("industries", {
  slug: text("slug").primaryKey(),
  nameEn: text("name_en").notNull(),
  nameDe: text("name_de").notNull(),
  parentSlug: text("parent_slug"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const industriesRelations = relations(industries, ({ one, many }) => ({
  parent: one(industries, {
    fields: [industries.parentSlug],
    references: [industries.slug],
    relationName: "parentChild",
  }),
  children: many(industries, { relationName: "parentChild" }),
  companies: many(companies),
}));

// ============================================================
// Admins
// ============================================================
export const admins = pgTable("admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role", { enum: ["admin", "editor"] }).notNull().default("editor"),
  githubId: text("github_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// Companies
// ============================================================
export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logoUrl: text("logo_url"),
    website: text("website"),
    industrySlug: text("industry_slug")
      .notNull()
      .references(() => industries.slug),
    countryHq: text("country_hq").notNull(),
    cityHq: text("city_hq"),
    employeeCount: integer("employee_count"),
    foundedYear: integer("founded_year"),
    companyType: text("company_type", {
      enum: ["startup", "scaleup", "public", "enterprise", "government"],
    }).notNull(),
    descriptionEn: text("description_en"),
    descriptionDe: text("description_de"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_companies_industry").on(table.industrySlug),
  ],
);

export const companiesRelations = relations(companies, ({ one, many }) => ({
  industry: one(industries, {
    fields: [companies.industrySlug],
    references: [industries.slug],
  }),
  layoffs: many(layoffs),
}));

// ============================================================
// Layoffs
// ============================================================
export const layoffs = pgTable(
  "layoffs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    affectedCount: integer("affected_count"),
    affectedPercentage: numeric("affected_percentage", { precision: 5, scale: 2 }),
    totalEmployeesAtTime: integer("total_employees_at_time"),
    country: text("country").notNull(),
    city: text("city"),
    isShutdown: boolean("is_shutdown").notNull().default(false),
    reason: text("reason", {
      enum: [
        "restructuring",
        "cost_cutting",
        "ai_replacement",
        "market_downturn",
        "merger",
        "shutdown",
        "other",
      ],
    }),
    severanceWeeks: integer("severance_weeks"),
    severanceDetailsEn: text("severance_details_en"),
    severanceDetailsDe: text("severance_details_de"),
    sourceUrl: text("source_url").notNull(),
    sourceName: text("source_name"),
    titleEn: text("title_en").notNull(),
    titleDe: text("title_de").notNull(),
    summaryEn: text("summary_en"),
    summaryDe: text("summary_de"),
    status: text("status", { enum: ["unverified", "verified", "rejected"] })
      .notNull()
      .default("unverified"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: uuid("verified_by").references(() => admins.id),
    publishedToSocial: boolean("published_to_social").notNull().default(false),
    publishedToNewsletter: boolean("published_to_newsletter").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_layoffs_status_date").on(table.status, table.date),
    index("idx_layoffs_company").on(table.companyId),
    index("idx_layoffs_country").on(table.country),
    index("idx_layoffs_date").on(table.date),
  ],
);

export const layoffsRelations = relations(layoffs, ({ one, many }) => ({
  company: one(companies, {
    fields: [layoffs.companyId],
    references: [companies.id],
  }),
  verifier: one(admins, {
    fields: [layoffs.verifiedBy],
    references: [admins.id],
  }),
  rssArticles: many(rssArticles),
  socialPosts: many(socialPosts),
  views: many(layoffViews),
}));

// ============================================================
// Submissions
// ============================================================
export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: text("company_name").notNull(),
  details: text("details").notNull(),
  sourceUrl: text("source_url"),
  submitterEmail: text("submitter_email"),
  status: text("status", { enum: ["pending", "processed", "rejected"] })
    .notNull()
    .default("pending"),
  layoffId: uuid("layoff_id").references(() => layoffs.id),
  gdprConsent: boolean("gdpr_consent").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// RSS Feeds
// ============================================================
export const rssFeeds = pgTable("rss_feeds", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  url: text("url").notNull().unique(),
  language: text("language").notNull(),
  category: text("category", {
    enum: ["tech", "industry", "finance", "general", "startup"],
  }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rssFeedsRelations = relations(rssFeeds, ({ many }) => ({
  articles: many(rssArticles),
}));

// ============================================================
// RSS Articles
// ============================================================
export const rssArticles = pgTable(
  "rss_articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    feedId: uuid("feed_id")
      .notNull()
      .references(() => rssFeeds.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    url: text("url").notNull().unique(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    isRelevant: boolean("is_relevant"),
    relevanceReasoning: text("relevance_reasoning"),
    layoffId: uuid("layoff_id").references(() => layoffs.id),
    rawContent: text("raw_content"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_rss_articles_url").on(table.url),
  ],
);

export const rssArticlesRelations = relations(rssArticles, ({ one }) => ({
  feed: one(rssFeeds, {
    fields: [rssArticles.feedId],
    references: [rssFeeds.id],
  }),
  layoff: one(layoffs, {
    fields: [rssArticles.layoffId],
    references: [layoffs.id],
  }),
}));

// ============================================================
// Social Posts
// ============================================================
export const socialPosts = pgTable(
  "social_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    layoffId: uuid("layoff_id")
      .notNull()
      .references(() => layoffs.id, { onDelete: "cascade" }),
    platform: text("platform", { enum: ["x", "linkedin", "reddit"] }).notNull(),
    content: text("content").notNull(),
    postUrl: text("post_url"),
    status: text("status", { enum: ["queued", "posted", "failed"] })
      .notNull()
      .default("queued"),
    errorMessage: text("error_message"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_social_posts_layoff_platform").on(table.layoffId, table.platform),
  ],
);

export const socialPostsRelations = relations(socialPosts, ({ one }) => ({
  layoff: one(layoffs, {
    fields: [socialPosts.layoffId],
    references: [layoffs.id],
  }),
}));

// ============================================================
// Newsletter Subscribers
// ============================================================
export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    language: text("language", { enum: ["de", "en"] }).notNull().default("de"),
    status: text("status", { enum: ["pending", "active", "unsubscribed", "bounced"] })
      .notNull()
      .default("pending"),
    confirmationToken: text("confirmation_token"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_subscribers_status").on(table.status),
  ],
);

// ============================================================
// Newsletter Issues
// ============================================================
export const newsletterIssues = pgTable("newsletter_issues", {
  id: uuid("id").primaryKey().defaultRandom(),
  subjectEn: text("subject_en").notNull(),
  subjectDe: text("subject_de").notNull(),
  layoffIds: uuid("layoff_ids").array().notNull(),
  status: text("status", { enum: ["draft", "sent"] }).notNull().default("draft"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  recipientCount: integer("recipient_count"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// Layoff Views (anonymous daily counter)
// ============================================================
export const layoffViews = pgTable(
  "layoff_views",
  {
    layoffId: uuid("layoff_id")
      .notNull()
      .references(() => layoffs.id, { onDelete: "cascade" }),
    viewedAt: date("viewed_at").notNull().defaultNow(),
    viewCount: integer("view_count").notNull().default(1),
  },
  (table) => [
    primaryKey({ columns: [table.layoffId, table.viewedAt] }),
  ],
);

export const layoffViewsRelations = relations(layoffViews, ({ one }) => ({
  layoff: one(layoffs, {
    fields: [layoffViews.layoffId],
    references: [layoffs.id],
  }),
}));

// ============================================================
// Type exports
// ============================================================
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type Industry = typeof industries.$inferSelect;
export type Layoff = typeof layoffs.$inferSelect;
export type NewLayoff = typeof layoffs.$inferInsert;
export type Admin = typeof admins.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type RssFeed = typeof rssFeeds.$inferSelect;
export type RssArticle = typeof rssArticles.$inferSelect;
export type SocialPost = typeof socialPosts.$inferSelect;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type NewsletterIssue = typeof newsletterIssues.$inferSelect;