-- SP-22 (2026-09-02): durable shadow-observation history
--
-- The 2026-08-31 audit found: "a registry `shadow` label is not dispatched by
-- the current policy resolver; several adapters are not in live cron
-- enumeration" -- SP-07's shadow prober (candidate-shadow.ts) exists and is
-- proven, but every observation so far has been a one-shot, unrecorded
-- manual run. This migration adds the durable store SP-22's dispatcher writes
-- to, so "recurrent shadow" is provable from D1 history rather than asserted
-- from a single session's evidence doc.
--
-- Additive only: no existing table is altered, no existing row is touched.
-- Dispatch itself never writes to opportunities, source_registry,
-- provider_profiles, or source_decisions -- this table is the only write
-- path SP-22 introduces. Rollback is to stop writing to this table; reading
-- it is optional and nothing else depends on its existence.

CREATE TABLE IF NOT EXISTS source_shadow_observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  observed_at TEXT NOT NULL DEFAULT (datetime('now')),
  dispatcher_version TEXT NOT NULL,
  -- Mirrors packages/scraper/source-doctor.ts's DoctorOutcome union, reused
  -- verbatim by candidate-shadow.ts's CandidateShadowResult.diagnostic.outcome.
  outcome TEXT NOT NULL CHECK (outcome IN (
    'HEALTHY_WITH_RESULTS','HEALTHY_EMPTY','DEGRADED_ANOMALOUS',
    'SCHEMA_BROKEN','RATE_LIMITED','UNREACHABLE','POLICY_BLOCKED',
    'INTERNAL_PIPELINE_FAILURE','UNKNOWN'
  )),
  request_count INTEGER NOT NULL DEFAULT 0,
  bytes_received INTEGER NOT NULL DEFAULT 0,
  item_count INTEGER NOT NULL DEFAULT 0,
  plausible_items INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  stop_reason TEXT,
  -- SHA-256 of the full CandidateShadowResult (packages/scraper/contentHash.ts
  -- sha256Hex), so a later dispute can verify a stored summary against the
  -- exact evidence it was derived from without re-fetching the source.
  evidence_hash TEXT NOT NULL,
  -- Bounded raw result for audit/replay. Shadow probes already cap at 512 KiB
  -- (SHADOW_MAX_BYTES) and only ever report counts/metadata, never full
  -- item bodies, so the serialized CandidateShadowResult itself stays small;
  -- no separate truncation is applied here.
  result_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS source_shadow_observations_source_idx
  ON source_shadow_observations (source_id);

CREATE INDEX IF NOT EXISTS source_shadow_observations_observed_at_idx
  ON source_shadow_observations (observed_at);
