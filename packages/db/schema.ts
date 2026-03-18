import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

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
  contentHash: text('content_hash').unique(),
});

export type Agency = typeof agencies.$inferSelect;
export type NewAgency = typeof agencies.$inferInsert;
export type Opportunity = typeof opportunities.$inferSelect;
export type NewOpportunity = typeof opportunities.$inferInsert;
