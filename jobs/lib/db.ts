import { createClient } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql";
import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";

export const agencies = sqliteTable('agencies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  websiteUrl: text('website_url'),
  hiringUrl: text('hiring_url').notNull(),
  logoUrl: text('logo_url'),
  description: text('description'),
  status: text('status').default('active'),
  lastSync: integer('last_sync', { mode: 'timestamp' }).notNull(),
  verifiedAt: integer('verified_at', { mode: 'timestamp' }),
  metadata: text('metadata', { mode: 'json' }),
  score: integer('score'),
  buzzScore: integer('buzz_score').default(0),
  hiringHeat: integer('hiring_heat').default(1),
  frictionLevel: integer('friction_level').default(3),
  createdAt: integer('created_at', { mode: 'timestamp' }),
});

export const opportunities = sqliteTable('opportunities', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  company: text('company'),
  type: text('type').default('agency'),
  sourceUrl: text('source_url').notNull(),
  sourcePlatform: text('source_platform'),
  tags: text('tags', { mode: 'json' }).default('[]'),
  locationType: text('location_type').default('remote'),
  payRange: text('pay_range'),
  description: text('description'),
  postedAt: integer('posted_at', { mode: 'timestamp' }),
  scrapedAt: integer('scraped_at', { mode: 'timestamp' }).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  tier: integer('tier').default(3),
  contentHash: text('content_hash').unique(),
});

export type NewOpportunity = typeof opportunities.$inferInsert;

export function createDb() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
  return drizzle(client, { schema: { opportunities, agencies } });
}
