-- SP-05 (2026-08-29): candidate lifecycle, evidence leases, and opt-out memory
--
-- Prior registry (SP-03) stores compliance/operational states and deadlines per
-- source, but has no durable do-not-reingest memory and no typed decision
-- history. SP-05 adds both without mutating existing rows or runtime policy.
-- No existing table is altered; rollback is to ignore new tables. Idempotent.

-- ─── Durable opt-out / do-not-reingest registry ───────────────────────────
-- One row per source_id that must never re-enter shadow/canary/active even if
-- discovery rediscovers it. Separate from `source_registry.opt_out` (a fast
-- boolean cache the resolver reads) so removal or reset of a source_registry
-- row cannot erase the durable memory. Prospector/SP-06 will check this table
-- before creating a candidate.

CREATE TABLE IF NOT EXISTS source_opt_outs (
  source_id TEXT PRIMARY KEY NOT NULL,
  provider_id TEXT,
  reason TEXT NOT NULL,
  requested_by TEXT,
  evidence_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS source_opt_outs_provider_idx
  ON source_opt_outs (provider_id);

-- ─── Reviewer decision history ────────────────────────────────────────────
-- Append-only log of every compliance/operational state change. History is
-- never deleted when a source retires; `source_id` is kept without a hard FK
-- so a decision survives even after a source_registry row is logically removed.

CREATE TABLE IF NOT EXISTS source_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  from_compliance TEXT,
  to_compliance TEXT NOT NULL CHECK (to_compliance IN ('needs_review','allowed','conditional','awaiting_permission','blocked','deprecated')),
  from_operational TEXT,
  to_operational TEXT NOT NULL CHECK (to_operational IN ('candidate','shadow','canary','active','review_due','degraded','quarantined','paused','retired')),
  actor TEXT NOT NULL,
  reason TEXT NOT NULL,
  evidence_hash TEXT,
  decided_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS source_decisions_source_idx
  ON source_decisions (source_id);

CREATE INDEX IF NOT EXISTS source_decisions_decided_at_idx
  ON source_decisions (decided_at);

-- ─── Lease/deadline indices on source_registry (read-only optimization) ────
-- These columns existed since 0036 but had no index. SP-05 adds them so the
-- deadline rollup and expiry sweeps do not scan the full registry.

CREATE INDEX IF NOT EXISTS source_registry_review_deadline_idx
  ON source_registry (review_deadline);

CREATE INDEX IF NOT EXISTS source_registry_policy_expiry_idx
  ON source_registry (policy_expiry);

CREATE INDEX IF NOT EXISTS source_registry_opt_out_idx
  ON source_registry (opt_out);
