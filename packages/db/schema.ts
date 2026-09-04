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
  // Exact configured source identity (SP-01, migration 0034). Distinct from the
  // display-oriented source_platform: a static source.id (e.g. "we-work-remotely")
  // or an ATS platform:token key (e.g. "workable:acme"). Nullable + additive —
  // legacy rows stay NULL (no ambiguous backfill); every row inserted from
  // migration 0034 onward carries the identity that produced it, so source
  // economics never infer identity from a shared display label.
  sourceId: text("source_id"),
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
  // A reversible system state, deliberately distinct from policy rejection.
  // Feed reappearance may reactivate only `stale-feed` / `link-unavailable`.
  inactiveReason: text("inactive_reason"),
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
  // Category pages use the same effective-date order but should not scan the
  // entire active corpus before applying their category filter (migration 0029).
  categoryActiveEffectivePostedIdx: index("category_active_effective_posted_idx").on(
    table.category,
    table.isActive,
    sql`coalesce(${table.postedAt}, ${table.scrapedAt}) DESC`,
  ),
  activeLastVerifiedIdx: index("active_last_verified_idx").on(table.isActive, table.lastVerifiedAt),
  // Unclear-backlog sweep row selection (migration 0025). Declared here so
  // `drizzle-kit generate` cannot emit a migration that drops it. geo_checked_at
  // precedes scraped_at so the sweep's ORDER BY is served by the index and stops
  // at LIMIT rather than sorting every matching row on all 96 daily ticks.
  unclearSweepIdx: index("unclear_sweep_idx").on(table.isActive, table.phEligibility, table.geoCheckedAt, table.scrapedAt),
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
  linkStatus: text("link_status", { enum: ["ok", "bot_wall", "dead_http", "unreachable", "dead_dns", "parked", "no_url"] }),
  linkCheckedAt: text("link_checked_at"),
  linkEvidence: text("link_evidence"),
  linkFailCount: integer("link_fail_count").notNull().default(0),
  // Website provenance (migration 0033, DATA-05B): origin of the current
  // website value. 'curated' = seed/import insert; 'manual' = human edit;
  // 'enrichment' = retired automated writer (must never be written again);
  // 'repair_cleared' = the approval-gated DATA-05B repair cleared an
  // unsupported value, so website is NULL. NULL = legacy/unknown provenance:
  // unclassified by the DATA-05B report, never treated as trusted.
  websiteSource: text("website_source"),
  websiteEvidence: text("website_evidence"),
  websiteSetAt: text("website_set_at"),
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
  // Robots provenance (COMP-01A): durable evidence for every static/ATS fetch.
  // The origin checked, the verdict, human-auditable evidence, declared
  // crawl-delay, whether enforce mode would have blocked, and the gate mode.
  robotsOrigin: text("robots_origin"),
  robotsVerdict: text("robots_verdict"),
  robotsEvidence: text("robots_evidence"),
  robotsCrawlDelay: integer("robots_crawl_delay"),
  robotsWouldBlock: integer("robots_would_block", { mode: "boolean" }),
  robotsMode: text("robots_mode"),
  // Unchanged-feed marker (SP-02, migration 0035): true when this fetch was a
  // conditional 304 / identical-body response. Such events carry the prior
  // run's count forward, so source economics must exclude them from real
  // fetches and item counts — an unchanged poll is not new supply. NULL =
  // legacy event, treated as a real (changed) fetch.
  notModified: integer("not_modified", { mode: "boolean" }),
}, (table) => ({
  sourceIdIdx: index("source_fetch_events_source_id_idx").on(table.sourceId),
  timestampIdx: index("source_fetch_events_timestamp_idx").on(table.timestamp),
  robotsOriginIdx: index("source_fetch_events_robots_origin_idx").on(table.robotsOrigin),
  robotsVerdictIdx: index("source_fetch_events_robots_verdict_idx").on(table.robotsVerdict),
}));

// Runtime robots.txt cache (migration 0030). Keyed by origin, not by source:
// one robots.txt governs every source sharing a host, so caching by origin
// keeps the crawl polite and the Workers budget small. TTL is enforced at read
// time in robotsGate.ts, so no cleanup job is required.
export const robotsCache = sqliteTable("robots_cache", {
  origin: text("origin").primaryKey().notNull(),
  fetchedAt: text("fetched_at").notNull(),
  status: integer("status").notNull(),
  body: text("body"),
  crawlDelay: integer("crawl_delay"),
  contentSignals: text("content_signals"),
  error: text("error"),
}, (table) => ({
  fetchedAtIdx: index("robots_cache_fetched_at_idx").on(table.fetchedAt),
}));

// ─── Provider profiles (SP-03) ────────────────────────────────────────────────
// One row per provider mechanism/host family (e.g. "remotive-rss",
// "jobicy-rss"). Providers are the correlated-risk unit for evidence lease,
// rate guidance, and concentration (ADR-006 §7).

export const providerProfiles = sqliteTable("provider_profiles", {
  id: text("id").primaryKey().notNull(),
  displayName: text("display_name").notNull(),
  providerFamily: text("provider_family").notNull(),
  mechanism: text("mechanism", {
    enum: ["syndication_feed", "public_api", "customer_auth", "partner_feed", "rss_feed", "public_html", "public_json_api", "ats_api"],
  }).notNull(),
  authClass: text("auth_class", {
    enum: ["none", "api_key", "oauth", "partner_token", "customer_auth"],
  }).notNull(),
  endpointPattern: text("endpoint_pattern"),
  allowedHosts: text("allowed_hosts"),
  evidenceUrl: text("evidence_url"),
  evidenceHash: text("evidence_hash"),
  evidenceCapturedAt: text("evidence_captured_at"),
  visibilityFilter: text("visibility_filter", {
    enum: ["published", "listed", "public", "indexable", "private"],
  }),
  contentScope: text("content_scope", {
    enum: ["minimal", "full", "metadata_only"],
  }),
  cadenceMinMinutes: integer("cadence_min_minutes"),
  cadenceMaxMinutes: integer("cadence_max_minutes"),
  rateGuidance: text("rate_guidance"),
  robotsHandling: text("robots_handling"),
  removalSemantics: text("removal_semantics"),
  evidenceLeaseDays: integer("evidence_lease_days").notNull().default(180),
  defaultComplianceState: text("default_compliance_state", {
    enum: ["needs_review", "allowed", "conditional", "awaiting_permission", "blocked", "deprecated"],
  }).notNull(),
  defaultOperationalState: text("default_operational_state", {
    enum: ["candidate", "shadow", "canary", "active", "review_due", "degraded", "quarantined", "paused", "retired"],
  }).notNull(),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
}, (table) => ({
  familyIdx: index("provider_profiles_family_idx").on(table.providerFamily),
}));

// ─── Source registry (SP-03) ──────────────────────────────────────────────────
// One row per durable source identity (e.g. "we-work-remotely",
// "ashby:supabase"). The stable `source_id` is the same value persisted on
// `opportunities.source_id` and `source_fetch_events.source_id`.

export const sourceRegistry = sqliteTable("source_registry", {
  sourceId: text("source_id").primaryKey().notNull(),
  providerId: text("provider_id")
    .notNull()
    .references(() => providerProfiles.id),
  displayName: text("display_name").notNull(),
  endpointUrl: text("endpoint_url").notNull(),
  companyToken: text("company_token"),
  discoveryProvenance: text("discovery_provenance"),
  complianceState: text("compliance_state", {
    enum: ["needs_review", "allowed", "conditional", "awaiting_permission", "blocked", "deprecated"],
  }).notNull(),
  operationalState: text("operational_state", {
    enum: ["candidate", "shadow", "canary", "active", "review_due", "degraded", "quarantined", "paused", "retired"],
  }).notNull(),
  reviewDeadline: text("review_deadline"),
  policyExpiry: text("policy_expiry"),
  // SP-23: nullable while dormant; positive integer is enforced by the
  // canary-state migration trigger before any public exposure is possible.
  canaryMaxNewItemsPerTick: integer("canary_max_new_items_per_tick"),
  owner: text("owner"),
  lastDecision: text("last_decision"),
  lastDecisionAt: text("last_decision_at"),
  lastTransitionHash: text("last_transition_hash"),
  optOut: integer("opt_out", { mode: "boolean" }).notNull().default(false),
  healthRollup: text("health_rollup"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
}, (table) => ({
  providerIdx: index("source_registry_provider_idx").on(table.providerId),
  complianceIdx: index("source_registry_compliance_idx").on(table.complianceState),
  operationalIdx: index("source_registry_operational_idx").on(table.operationalState),
}));

// ─── Opt-out / do-not-reingest registry (SP-05) ───────────────────────────────
// Durable memory that a source must not re-enter shadow/canary/active even if
// discovery rediscovers it. Separate from `source_registry.opt_out` so a
// registry row reset cannot erase the durable signal.

export const sourceOptOuts = sqliteTable("source_opt_outs", {
  sourceId: text("source_id").primaryKey().notNull(),
  providerId: text("provider_id"),
  reason: text("reason").notNull(),
  requestedBy: text("requested_by"),
  evidenceUrl: text("evidence_url"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  createdBy: text("created_by"),
  notes: text("notes"),
}, (table) => ({
  providerIdx: index("source_opt_outs_provider_idx").on(table.providerId),
}));

// ─── Decision history (SP-05) ───────────────────────────────────────────────
// Append-only log of every compliance/operational transition with actor +
// reason. Source-id is kept without hard CASCADE so history survives.

export const sourceDecisions = sqliteTable("source_decisions", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  sourceId: text("source_id").notNull(),
  fromCompliance: text("from_compliance"),
  toCompliance: text("to_compliance", {
    enum: ["needs_review", "allowed", "conditional", "awaiting_permission", "blocked", "deprecated"],
  }).notNull(),
  fromOperational: text("from_operational"),
  toOperational: text("to_operational", {
    enum: ["candidate", "shadow", "canary", "active", "review_due", "degraded", "quarantined", "paused", "retired"],
  }).notNull(),
  actor: text("actor").notNull(),
  reason: text("reason").notNull(),
  evidenceHash: text("evidence_hash"),
  decidedAt: text("decided_at")
    .notNull()
    .default(sql`(datetime('now'))`),
}, (table) => ({
  sourceIdx: index("source_decisions_source_idx").on(table.sourceId),
  decidedAtIdx: index("source_decisions_decided_at_idx").on(table.decidedAt),
}));

// ─── Typed transition history (SP-23) ───────────────────────────────────────
// Append-only replay records applied by the transition-event trigger. These
// fingerprints make replay deterministic but are intentionally not presented
// as the masterplan's future tamper-evident ledger.

export const sourceTransitionEvents = sqliteTable("source_transition_events", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  transitionPlaneVersion: text("transition_plane_version").notNull(),
  sourceId: text("source_id").notNull(),
  fromCompliance: text("from_compliance", {
    enum: ["needs_review", "allowed", "conditional", "awaiting_permission", "blocked", "deprecated"],
  }).notNull(),
  fromOperational: text("from_operational", {
    enum: ["candidate", "shadow", "canary", "active", "review_due", "degraded", "quarantined", "paused", "retired"],
  }).notNull(),
  toCompliance: text("to_compliance", {
    enum: ["needs_review", "allowed", "conditional", "awaiting_permission", "blocked", "deprecated"],
  }).notNull(),
  toOperational: text("to_operational", {
    enum: ["candidate", "shadow", "canary", "active", "review_due", "degraded", "quarantined", "paused", "retired"],
  }).notNull(),
  cause: text("cause", {
    enum: [
      "requested_shadow_entry", "requested_promotion",
      "canary_cap_breach", "evidence_lease_expired", "invalid_canary_cap",
      "health_quarantine", "policy_expiry_review", "emergency_pause", "retirement",
    ],
  }).notNull(),
  decidedAt: text("decided_at").notNull(),
  evidenceHash: text("evidence_hash"),
  inputJson: text("input_json").notNull(),
  inputHash: text("input_hash").notNull(),
  decisionHash: text("decision_hash").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
}, (table) => ({
  sourceDecidedIdx: index("source_transition_events_source_decided_idx").on(table.sourceId, table.decidedAt),
  decisionHashIdx: uniqueIndex("source_transition_events_decision_hash_unique").on(table.decisionHash),
}));

// ─── Shadow observations (SP-22) ────────────────────────────────────────────
// Durable history of every SP-07 shadow probe SP-22's dispatcher runs, so
// "recurrent shadow" is provable from D1 rather than asserted from a single
// manual run. Additive only; never written by the exact-six freshness loop.

export const sourceShadowObservations = sqliteTable("source_shadow_observations", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  sourceId: text("source_id").notNull(),
  providerId: text("provider_id").notNull(),
  observedAt: text("observed_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  dispatcherVersion: text("dispatcher_version").notNull(),
  outcome: text("outcome", {
    enum: [
      "HEALTHY_WITH_RESULTS", "HEALTHY_EMPTY", "DEGRADED_ANOMALOUS",
      "SCHEMA_BROKEN", "RATE_LIMITED", "UNREACHABLE", "POLICY_BLOCKED",
      "INTERNAL_PIPELINE_FAILURE", "UNKNOWN",
    ],
  }).notNull(),
  requestCount: integer("request_count").notNull().default(0),
  bytesReceived: integer("bytes_received").notNull().default(0),
  itemCount: integer("item_count").notNull().default(0),
  plausibleItems: integer("plausible_items").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  stopReason: text("stop_reason"),
  evidenceHash: text("evidence_hash").notNull(),
  resultJson: text("result_json").notNull(),
}, (table) => ({
  sourceIdx: index("source_shadow_observations_source_idx").on(table.sourceId),
  observedAtIdx: index("source_shadow_observations_observed_at_idx").on(table.observedAt),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProviderProfile = typeof providerProfiles.$inferSelect;
export type NewProviderProfile = typeof providerProfiles.$inferInsert;
export type SourceRegistryRow = typeof sourceRegistry.$inferSelect;
export type NewSourceRegistryRow = typeof sourceRegistry.$inferInsert;
export type ShadowObservationRow = typeof sourceShadowObservations.$inferSelect;
export type NewShadowObservationRow = typeof sourceShadowObservations.$inferInsert;
export type SourceOptOut = typeof sourceOptOuts.$inferSelect;
export type NewSourceOptOut = typeof sourceOptOuts.$inferInsert;
export type SourceDecision = typeof sourceDecisions.$inferSelect;
export type NewSourceDecision = typeof sourceDecisions.$inferInsert;
export type SourceTransitionEvent = typeof sourceTransitionEvents.$inferSelect;
export type NewSourceTransitionEvent = typeof sourceTransitionEvents.$inferInsert;

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
export type RobotsCacheRow = typeof robotsCache.$inferSelect;
export type NewRobotsCacheRow = typeof robotsCache.$inferInsert;
