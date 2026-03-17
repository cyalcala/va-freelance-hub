import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { sql } from "drizzle-orm";
import {
  text,
  integer,
  sqliteTable,
} from "drizzle-orm/sqlite-core";

// ─── Schema ──────────────────────────────────────────────────────────────────

export const opportunities = sqliteTable("opportunities", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  company: text("company"),
  type: text("type", { enum: ["VA", "freelance", "project", "full-time", "part-time"] })
    .notNull()
    .default("freelance"),
  sourceUrl: text("source_url").notNull().unique(),
  sourcePlatform: text("source_platform").notNull(),
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  locationType: text("location_type", { enum: ["remote", "hybrid", "onsite"] }).default("remote"),
  payRange: text("pay_range"),
  description: text("description"),
  postedAt: text("posted_at"),
  scrapedAt: text("scraped_at").notNull().default(sql`(datetime('now'))`),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  contentHash: text("content_hash").notNull(),
});

export const vaDirectory = sqliteTable("va_directory", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  companyName: text("company_name").notNull(),
  website: text("website"),
  hiresFilipinosf: integer("hires_filipinos", { mode: "boolean" }).notNull().default(true),
  niche: text("niche", {
    enum: ["admin", "creative", "tech", "social-media", "customer-support", "finance", "other"],
  }).default("admin"),
  hiringPageUrl: text("hiring_page_url"),
  verifiedAt: text("verified_at"),
  notes: text("notes"),
  rating: integer("rating"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const contentDigests = sqliteTable("content_digests", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  creatorName: text("creator_name").notNull(),
  videoId: text("video_id").notNull().unique(),
  videoTitle: text("video_title").notNull(),
  videoUrl: text("video_url").notNull(),
  transcriptRaw: text("transcript_raw"),
  actionPlan: text("action_plan", { mode: "json" }).$type<string[]>().default([]),
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  publishedAt: text("published_at"),
  processedAt: text("processed_at").notNull().default(sql`(datetime('now'))`),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type Opportunity = typeof opportunities.$inferSelect;
export type VADirectoryEntry = typeof vaDirectory.$inferSelect;
export type ContentDigest = typeof contentDigests.$inferSelect;

// ─── Client ──────────────────────────────────────────────────────────────────

function createDb() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) throw new Error("TURSO_DATABASE_URL is not set");
  if (!authToken) throw new Error("TURSO_AUTH_TOKEN is not set");

  const client = createClient({ url, authToken });
  return drizzle(client, { schema: { opportunities, vaDirectory, contentDigests } });
}

export const db = createDb();
