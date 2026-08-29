-- SP-03 (2026-08-29): provider/source registry foundation
--
-- The existing source policy lives in two places: a static list in
-- `packages/scraper/sources.ts` and hard-coded ATS token/platform policies in
-- `apps/web/src/pages/api/cron/scrape.ts`. That design is fail-closed but not
-- self-replenishing: each addition is a code exception, evidence lives in prose,
-- and there is no place to record a candidate, its evidence lease, or its
-- independent compliance/operational state.
--
-- This migration is the first registry slice. It creates two additive,
-- nullable tables that describe the *mechanism* (provider) and the *identity*
-- (source) separately, with explicit compliance and operational states,
-- cadence envelope, evidence lease, and opt-out memory. No existing row is
-- mutated, no runtime code reads these tables yet (SP-04 adds the resolver),
-- and rollback is to ignore them. Idempotent: safe to re-apply.

-- ─── Provider profiles ───────────────────────────────────────────────────────
-- One row per provider mechanism/host family (e.g. "remotive-rss",
-- "jobicy-rss", "greenhouse-ats"). Providers are the unit of
-- correlated-risk counting (ADR-006 §7), evidence lease, and rate guidance.

CREATE TABLE IF NOT EXISTS provider_profiles (
  id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL,
  provider_family TEXT NOT NULL,
  mechanism TEXT NOT NULL CHECK (mechanism IN ('syndication_feed','public_api','customer_auth','partner_feed','rss_feed','public_html','public_json_api','ats_api')),
  auth_class TEXT NOT NULL CHECK (auth_class IN ('none','api_key','oauth','partner_token','customer_auth')),
  endpoint_pattern TEXT,
  allowed_hosts TEXT,
  evidence_url TEXT,
  evidence_hash TEXT,
  evidence_captured_at TEXT,
  visibility_filter TEXT CHECK (visibility_filter IN ('published','listed','public','indexable','private') OR visibility_filter IS NULL),
  content_scope TEXT CHECK (content_scope IN ('minimal','full','metadata_only') OR content_scope IS NULL),
  cadence_min_minutes INTEGER CHECK (cadence_min_minutes IS NULL OR cadence_min_minutes >= 0),
  cadence_max_minutes INTEGER CHECK (cadence_max_minutes IS NULL OR cadence_max_minutes >= 0),
  rate_guidance TEXT,
  robots_handling TEXT,
  removal_semantics TEXT,
  evidence_lease_days INTEGER NOT NULL DEFAULT 180 CHECK (evidence_lease_days > 0),
  default_compliance_state TEXT NOT NULL CHECK (default_compliance_state IN ('needs_review','allowed','conditional','awaiting_permission','blocked','deprecated')),
  default_operational_state TEXT NOT NULL CHECK (default_operational_state IN ('candidate','shadow','canary','active','review_due','degraded','quarantined','paused','retired')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (cadence_max_minutes IS NULL OR cadence_min_minutes IS NULL OR cadence_max_minutes >= cadence_min_minutes)
);

-- ─── Source registry ─────────────────────────────────────────────────────────
-- One row per durable source identity (e.g. "we-work-remotely",
-- "jobicy-supporting-apac", "ashby:supabase", "greenhouse:gitlab").
-- The stable `source_id` is the same value persisted on
-- `opportunities.source_id` and `source_fetch_events.source_id`, so
-- source economics, fetch events, and the registry share one key.

CREATE TABLE IF NOT EXISTS source_registry (
  source_id TEXT PRIMARY KEY NOT NULL,
  provider_id TEXT NOT NULL REFERENCES provider_profiles(id),
  display_name TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  company_token TEXT,
  discovery_provenance TEXT,
  compliance_state TEXT NOT NULL CHECK (compliance_state IN ('needs_review','allowed','conditional','awaiting_permission','blocked','deprecated')),
  operational_state TEXT NOT NULL CHECK (operational_state IN ('candidate','shadow','canary','active','review_due','degraded','quarantined','paused','retired')),
  review_deadline TEXT,
  policy_expiry TEXT,
  owner TEXT,
  last_decision TEXT,
  last_decision_at TEXT,
  opt_out INTEGER NOT NULL DEFAULT 0 CHECK (opt_out IN (0,1)),
  health_rollup TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  -- Only compliance-allowed/conditional sources may be in shadow/canary/active.
  -- A compliance hold must never auto-promote via an operational state.
  CHECK (
    operational_state NOT IN ('shadow','canary','active')
    OR compliance_state IN ('allowed','conditional')
  )
);

CREATE INDEX IF NOT EXISTS provider_profiles_family_idx
  ON provider_profiles (provider_family);

CREATE INDEX IF NOT EXISTS source_registry_provider_idx
  ON source_registry (provider_id);

CREATE INDEX IF NOT EXISTS source_registry_compliance_idx
  ON source_registry (compliance_state);

CREATE INDEX IF NOT EXISTS source_registry_operational_idx
  ON source_registry (operational_state);
