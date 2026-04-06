import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

export const VA_NICHES = [
  'TECH_ENGINEERING',
  'MARKETING',
  'SALES_GROWTH',
  'VA_SUPPORT',
  'ADMIN_BACKOFFICE',
  'CREATIVE_MULTIMEDIA',
  'BPO_SERVICES'
] as const;

export type VaNiche = typeof VA_NICHES[number];

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
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }),
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
  md5_hash: text('md5_hash').unique().notNull(), // The Idempotency Shield
  title: text('title').notNull(),
  company: text('company').notNull(),
  url: text('url').notNull(),
  salary: text('salary'), // Nullable
  description: text('description').notNull(),
  niche: text('niche', { enum: VA_NICHES }).notNull(),
  type: text('type').notNull().default('agency'), // e.g., 'agency', 'direct'
  sourcePlatform: text('source_platform').default('Generic'),
  tags: text('tags', { mode: 'json' }).notNull().default('[]'),
  locationType: text('location_type').notNull().default('remote'),
  postedAt: integer('posted_at', { mode: 'timestamp' }),
  scrapedAt: integer('scraped_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  tier: integer('tier').notNull().default(3), // 0=Platinum, 1=Gold, 2=Silver, 3=Bronze, 4=Trash
  relevanceScore: integer('relevance_score').notNull().default(0), 
  latestActivityMs: integer('latest_activity_ms').notNull().default(0), 
  companyLogo: text('company_logo'), 
  metadata: text('metadata', { mode: 'json' }).notNull().default('{}'), 
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  nicheIdx: index('niche_idx').on(table.niche),
  md5Idx: index('md5_idx').on(table.md5_hash),
  tierLatestIdx: index('tier_latest_idx').on(table.tier, table.latestActivityMs),
  domainRankIdx: index('domain_rank_idx').on(table.relevanceScore, table.tier),
}));

export const systemHealth = sqliteTable('system_health', {
  id: text('id').primaryKey(),
  sourceName: text('source_name').notNull(),
  status: text('status').notNull(),
  lastSuccess: integer('last_success', { mode: 'timestamp' }),
  errorMessage: text('error_message'),
  consecutiveFailures: integer('consecutive_failures').default(0), // Circuit breaker telemetry
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const extractionRules = sqliteTable('extraction_rules', {
  id: text('id').primaryKey(),
  sourceName: text('source_name').unique().notNull(),
  jsonataPattern: text('jsonata_pattern').notNull(), // LLM-generated JSONata
  confidenceScore: integer('confidence_score').default(0), // 0-100
  samplePayload: text('sample_payload'), // For debugging/validation
  failureReason: text('failure_reason'), // Why the last extraction failed
  lastErrorLog: text('last_error_log'), // Full trace if LLM recovery failed
  lastValidatedAt: integer('last_validated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const vitals = sqliteTable('vitals', {
  id: text('id').primaryKey(),
  aiQuotaCount: integer('ai_quota_count').default(0),
  aiQuotaDate: text('ai_quota_date'),
  lockStatus: text('lock_status').default('IDLE'),
  lockUpdatedAt: integer('lock_updated_at', { mode: 'timestamp' }),
  successiveFailureCount: integer('successive_failure_count').default(0),
  lastErrorHash: text('last_error_hash'),
  lastRecoveryAt: integer('last_recovery_at', { mode: 'timestamp' }),
});

export const logs = sqliteTable('logs', {
  id: text('id').primaryKey(),
  message: text('message').notNull(),
  level: text('level').default('info'), // 'info', 'warn', 'error', 'snapshot'
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  metadata: text('metadata', { mode: 'json' }).default('{}'),
}, (table) => ({
  timestampIdx: index('timestamp_idx').on(table.timestamp), // Speeds up Terminal log stream
}));

export const noteslog = sqliteTable('noteslog', {
  id: text('id').primaryKey(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  driftMinutes: integer('drift_minutes').notNull(),
  actionsTaken: text('actions_taken').notNull(), 
  status: text('status').notNull(), 
  metadata: text('metadata', { mode: 'json' }).default('{}'),
});

export type Agency = typeof agencies.$inferSelect;
export type NewAgency = typeof agencies.$inferInsert;
export type Opportunity = typeof opportunities.$inferSelect;
export type NewOpportunity = typeof opportunities.$inferInsert;
export type SystemHealth = typeof systemHealth.$inferSelect;
export type NewSystemHealth = typeof systemHealth.$inferInsert;
export type ExtractionRule = typeof extractionRules.$inferSelect;
export type NewExtractionRule = typeof extractionRules.$inferInsert;
export type Vitals = typeof vitals.$inferSelect;
export type NewVitals = typeof vitals.$inferInsert;
export type Log = typeof logs.$inferSelect;
export type NewLog = typeof logs.$inferInsert;
export type NotesLog = typeof noteslog.$inferSelect;
export type NewNotesLog = typeof noteslog.$inferInsert;
