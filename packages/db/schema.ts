import { sql } from "drizzle-orm";
import {
  text,
  integer,
  sqliteTable,
  index,
  uniqueIndex,
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
  category: text("category").notNull().default("other"),
  locationType: text("location_type", { enum: ["remote", "hybrid", "onsite"] }).default("remote"),
  clientTimezone: text("client_timezone"),
  payRange: text("pay_range"),
  description: text("description"),
  applicationUrl: text("application_url"),
  postedAt: text("posted_at"),
  scrapedAt: text("scraped_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  contentHash: text("content_hash").notNull(), // 64-bit cyrb-style hash of title+sourceUrl (packages/scraper/contentHash.ts); dedup belt — primary dedup is UNIQUE source_url
  updatedAt: text("updated_at"),
  lastSeenInFeedAt: text("last_seen_in_feed_at"),
  lastVerifiedAt: text("last_verified_at"),
  failedVerificationCount: integer("failed_verification_count").notNull().default(0),
  experienceLevel: text("experience_level", { enum: ["entry", "mid", "senior", "any"] }),
  descriptionHash: text("description_hash"),
  clickCount: integer("click_count").notNull().default(0),
  // Geo-eligibility (migration 0021): the structured location signal the
  // source sent (RemoteOK `location`, WWR `<region>`, ATS offices) plus the
  // geo-gate verdict — makes "truly hires Filipinos" auditable per listing.
  locationRaw: text("location_raw"),
  geoScope: text("geo_scope", {
    enum: ["worldwide", "apac_incl_ph", "ph_only", "region_excl_ph", "country_locked", "unknown"],
  }),
  phEligibility: text("ph_eligibility", {
    enum: ["eligible_verified", "eligible_likely", "unclear", "ineligible"],
  }),
  geoEvidence: text("geo_evidence"),
  geoCheckedAt: text("geo_checked_at"),
}, (table) => ({
  activeScrapedIdx: index("active_scraped_idx").on(table.isActive, table.scrapedAt),
  activePostedIdx: index("active_posted_idx").on(table.isActive, table.postedAt),
  categoryActivePostedIdx: index("category_active_posted_idx").on(table.category, table.isActive, table.postedAt),
  // Expression index matching the board freshness sort (migration 0018). Kept
  // in sync with the DB so `drizzle-kit generate` cannot emit a migration that
  // drops it and regresses the temp-B-tree fix.
  activeEffectivePostedIdx: index("active_effective_posted_idx").on(table.isActive, sql`coalesce(${table.postedAt}, ${table.scrapedAt}) DESC`),
  activeLastVerifiedIdx: index("active_last_verified_idx").on(table.isActive, table.lastVerifiedAt),
  lastVerifiedIdx: index("last_verified_idx").on(table.lastVerifiedAt),
  contentHashIdx: uniqueIndex("content_hash_idx").on(table.contentHash),
  categoryIdx: index("category_idx").on(table.category),
  descriptionHashIdx: index("description_hash_idx").on(table.descriptionHash),
  // Board default view "Open to Philippines" filters on this (migration 0021).
  activePhEligibilityIdx: index("active_ph_eligibility_idx").on(table.isActive, table.phEligibility),
}));

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
  atsPlatform: text("ats_platform", { enum: ["lever", "greenhouse", "workable", "breezy", "ashby"] }),
  atsToken: text("ats_token"),
  // Link-health tracking (migration 0022): recurring directory pulse verdicts.
  // 3 consecutive hard-dead checks → is_verified = 0 + annotation, never deletion.
  linkStatus: text("link_status", { enum: ["ok", "bot_wall", "dead_http", "dead_dns", "parked", "no_url"] }),
  linkCheckedAt: text("link_checked_at"),
  linkEvidence: text("link_evidence"),
  linkFailCount: integer("link_fail_count").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
}, (table) => ({
  companyNameIdx: index("company_name_idx").on(table.companyName),
  // Directory pulse selects its per-run budget by oldest check (migration 0022).
  linkCheckedIdx: index("va_directory_link_checked_idx").on(table.linkCheckedAt),
}));

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

// Source fetch state keeps source-supported feeds on their requested cadence.
export const sourceFetchState = sqliteTable("source_fetch_state", {
  sourceId: text("source_id").primaryKey().notNull(),
  sourceName: text("source_name").notNull(),
  sourceType: text("source_type").notNull(),
  collectionMethod: text("collection_method").notNull(),
  complianceStatus: text("compliance_status").notNull(),
  lastAttemptAt: text("last_attempt_at"),
  lastSuccessAt: text("last_success_at"),
  lastCount: integer("last_count").notNull().default(0),
  lastError: text("last_error"),
  updatedAt: text("updated_at").notNull(),
  // Conditional-request validators + body hash (migration 0020): lets the
  // scraper send If-None-Match / If-Modified-Since and skip unchanged feeds.
  etag: text("etag"),
  lastModified: text("last_modified"),
  lastBodyHash: text("last_body_hash"),
}, (table) => ({
  lastAttemptIdx: index("source_fetch_state_last_attempt_idx").on(table.lastAttemptAt),
}));

// Source fetch events logs each fetch attempt for monitoring and trend analysis.
export const sourceFetchEvents = sqliteTable("source_fetch_events", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  sourceId: text("source_id").notNull(),
  sourceName: text("source_name").notNull(),
  sourceType: text("source_type").notNull(),
  collectionMethod: text("collection_method").notNull(),
  complianceStatus: text("compliance_status").notNull(),
  timestamp: text("timestamp").notNull(),
  ok: integer("ok", { mode: "boolean" }).notNull(),
  skipped: integer("skipped", { mode: "boolean" }).notNull(),
  count: integer("count").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  error: text("error"),
  skipReason: text("skip_reason"),
}, (table) => ({
  sourceIdIdx: index("source_fetch_events_source_id_idx").on(table.sourceId),
  timestampIdx: index("source_fetch_events_timestamp_idx").on(table.timestamp),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

export type Opportunity = typeof opportunities.$inferSelect;
export type NewOpportunity = typeof opportunities.$inferInsert;
export type VADirectoryEntry = typeof vaDirectory.$inferSelect;
export type NewVADirectoryEntry = typeof vaDirectory.$inferInsert;
export type ContentDigest = typeof contentDigests.$inferSelect;
export type NewContentDigest = typeof contentDigests.$inferInsert;
export type SourceFetchState = typeof sourceFetchState.$inferSelect;
export type NewSourceFetchState = typeof sourceFetchState.$inferInsert;
export type SourceFetchEvent = typeof sourceFetchEvents.$inferSelect;
export type NewSourceFetchEvent = typeof sourceFetchEvents.$inferInsert;
