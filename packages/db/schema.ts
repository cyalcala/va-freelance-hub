import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const agencies = sqliteTable('agencies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  websiteUrl: text('website_url'),
  hiringUrl: text('hiring_url').notNull(),
  logoUrl: text('logo_url'),
  description: text('description'),
  status: text('status', { enum: ['active', 'quiet'] }).default('active'),
  lastSync: integer('last_sync', { mode: 'timestamp' }).notNull(),
  verifiedAt: integer('verified_at', { mode: 'timestamp' }),
  metadata: text('metadata', { mode: 'json' }), // raw JSON from APIs
  score: integer('score'), // search-relevancy score
  buzzScore: integer('buzz_score').default(0), // overall activity score
  hiringHeat: integer('hiring_heat').default(1), // 1-3 Flames
  frictionLevel: integer('friction_level').default(3), // 1-5 (1=Easiest/Direct Portal, 5=High Friction)
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const opportunities = sqliteTable('opportunities', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  company: text('company'),
  type: text('type').default('agency'), // e.g., 'agency', 'direct'
  sourceUrl: text('source_url').notNull(),
  sourcePlatform: text('source_platform'),
  tags: text('tags', { mode: 'json' }).default('[]'),
  locationType: text('location_type').default('remote'),
  payRange: text('pay_range'),
  description: text('description'),
  postedAt: integer('posted_at', { mode: 'timestamp' }),
  scrapedAt: integer('scraped_at', { mode: 'timestamp' }).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  tier: integer('tier').default(3), // 1=Gold, 2=Silver, 3=Bronze, 4=Trash
  contentHash: text('content_hash').unique(),
}, (table) => ({
  titleCompanyIdx: uniqueIndex('title_company_idx').on(table.title, table.company),
}));

export const systemHealth = sqliteTable('system_health', {
  id: text('id').primaryKey(),
  sourceName: text('source_name').notNull(), // e.g. 'Upwork', 'Reddit'
  status: text('status').notNull(), // 'OK', 'FAIL', 'STALE'
  lastSuccess: integer('last_success', { mode: 'timestamp' }),
  errorMessage: text('error_message'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export type Agency = typeof agencies.$inferSelect;
export type NewAgency = typeof agencies.$inferInsert;
export type Opportunity = typeof opportunities.$inferSelect;
export type NewOpportunity = typeof opportunities.$inferInsert;
export type SystemHealth = typeof systemHealth.$inferSelect;
export type NewSystemHealth = typeof systemHealth.$inferInsert;
