import { sql } from "drizzle-orm";
import {
  text,
  integer,
  sqliteTable,
} from "drizzle-orm/sqlite-core";

// ─── Opportunities ────────────────────────────────────────────────────────────
// Scraped freelance/VA job listings from RSS feeds and HTML sources

export const opportunities = sqliteTable("opportunities", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  company: text("company"),
  type: text("type", { enum: ["VA", "freelance", "project", "full-time", "part-time"] })
    .notNull()
    .default("freelance"),
  sourceUrl: text("source_url").notNull().unique(),
  sourcePlatform: text("source_platform").notNull(), // e.g. "WeWorkRemotely", "Remotive", "OnlineJobs"
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  locationType: text("location_type", { enum: ["remote", "hybrid", "onsite"] }).default("remote"),
  payRange: text("pay_range"),
  description: text("description"),
  postedAt: text("posted_at"),
  scrapedAt: text("scraped_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  contentHash: text("content_hash").notNull(), // sha256 of title+sourceUrl for dedup
});

// ─── VA Directory ─────────────────────────────────────────────────────────────
// Curated list of companies known to hire Filipino VAs

export const vaDirectory = sqliteTable("va_directory", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  companyName: text("company_name").notNull(),
  website: text("website"),
  hiresFilipinos: integer("hires_filipinos", { mode: "boolean" }).notNull().default(true),
  niche: text("niche", {
    enum: ["australian-dayshift", "global-va", "bpo", "job-boards", "ecommerce", "tech"],
  }).notNull().default("australian-dayshift"),
  hiringPageUrl: text("hiring_page_url"),
  verifiedAt: text("verified_at"),
  notes: text("notes"),
  rating: integer("rating"), // 1-5, optional
  isDayshift: integer("is_dayshift", { mode: "boolean" }).notNull().default(false),
  isVerified: integer("is_verified", { mode: "boolean" }).notNull().default(false),
  isRemote: integer("is_remote", { mode: "boolean" }).notNull().default(true),
  isMarketplace: integer("is_marketplace", { mode: "boolean" }).notNull().default(false),
  atsPlatform: text("ats_platform", { enum: ["lever", "greenhouse", "workable", "breezy"] }),
  atsToken: text("ats_token"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ─── Content Digests ──────────────────────────────────────────────────────────
// Phase 2: AI-summarized action plans from YouTube influencer content

export const contentDigests = sqliteTable("content_digests", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  creatorName: text("creator_name").notNull(), // e.g. "Nate Herk"
  videoId: text("video_id").notNull().unique(), // YouTube video ID
  videoTitle: text("video_title").notNull(),
  videoUrl: text("video_url").notNull(),
  transcriptRaw: text("transcript_raw"),
  actionPlan: text("action_plan", { mode: "json" }).$type<string[]>().default([]),
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  publishedAt: text("published_at"),
  processedAt: text("processed_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type Opportunity = typeof opportunities.$inferSelect;
export type NewOpportunity = typeof opportunities.$inferInsert;
export type VADirectoryEntry = typeof vaDirectory.$inferSelect;
export type NewVADirectoryEntry = typeof vaDirectory.$inferInsert;
export type ContentDigest = typeof contentDigests.$inferSelect;
export type NewContentDigest = typeof contentDigests.$inferInsert;
