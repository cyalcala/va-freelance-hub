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

export const systemHealth = sqliteTable('system_health', {
  id: text('id').primaryKey(),
  sourceName: text('source_name').notNull(),
  status: text('status').notNull(),
  lastSuccess: integer('last_success', { mode: 'timestamp' }),
  errorMessage: text('error_message'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export type NewOpportunity = typeof opportunities.$inferInsert;
export type SystemHealth = typeof systemHealth.$inferSelect;
export type NewSystemHealth = typeof systemHealth.$inferInsert;

let _db: any = null;

/**
 * Lazy-loaded database factory to avoid native module resolution during indexing
 */
export async function createDb() {
  if (_db) return _db;
  
  // Dynamic imports to hide from the Trigger.dev indexer
  const { createClient } = await import("@libsql/client/http");
  const { drizzle } = await import("drizzle-orm/libsql");
  
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;

  if (!url || !token) {
    const msg = `CRITICAL: Missing Turso Env Vars (URL: ${!!url}, Token: ${!!token})`;
    console.error(msg);
    // Try to send to ntfy
    try {
      await fetch("https://ntfy.sh/va-freelance-hub-task-log-cyrus", {
        method: "POST",
        body: `[DB-INIT] ${msg}`,
        headers: { "Priority": "5" }
      });
    } catch {}
    throw new Error(msg);
  }

  const client = createClient({
    url,
    authToken: token,
  });
  
  _db = drizzle(client, { schema: { opportunities, agencies, systemHealth } });
  return _db;
}


