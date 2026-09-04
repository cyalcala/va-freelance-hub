-- SP-23 (2026-09-05): capped canary + typed transition persistence
--
-- This migration deliberately does not activate a source or wire a scheduler.
-- It creates the fail-closed storage contract for the future, capability-limited
-- transition gateway. Exact-six rows continue through the empty-registry
-- fallback unchanged.
--
-- `input_hash` / `decision_hash` are deterministic replay fingerprints from
-- packages/scraper/transition-plane.ts, not cryptographic tamper evidence.
-- The masterplan's hash-chained, independently anchored ledger remains a
-- later Autonomy Cutover Predicate requirement.

-- A source may be prepared with a cap while it is candidate/shadow, but it
-- cannot enter canary without a positive integer ceiling and parseable lease.
ALTER TABLE source_registry
  ADD COLUMN canary_max_new_items_per_tick INTEGER;

-- The state-mutation guard below uses this immutable event fingerprint to
-- distinguish the transition-event trigger's write from a raw registry update.
ALTER TABLE source_registry
  ADD COLUMN last_transition_hash TEXT;

-- New identities begin dormant. Entering shadow/canary/active is a lifecycle
-- transition and must therefore be represented by source_transition_events.
CREATE TRIGGER IF NOT EXISTS source_registry_initial_state_is_dormant
BEFORE INSERT ON source_registry
FOR EACH ROW
WHEN NEW.operational_state NOT IN ('candidate', 'paused', 'retired')
BEGIN
  SELECT RAISE(ABORT, 'source_registry initial state must be candidate, paused, or retired; use the typed transition gateway');
END;

CREATE TRIGGER IF NOT EXISTS source_registry_canary_requires_envelope_insert
BEFORE INSERT ON source_registry
FOR EACH ROW
WHEN NEW.operational_state = 'canary'
 AND (
   NEW.canary_max_new_items_per_tick IS NULL
   OR typeof(NEW.canary_max_new_items_per_tick) <> 'integer'
   OR NEW.canary_max_new_items_per_tick <= 0
   OR NEW.policy_expiry IS NULL
   OR trim(NEW.policy_expiry) = ''
   OR julianday(NEW.policy_expiry) IS NULL
 )
BEGIN
  SELECT RAISE(ABORT, 'canary requires a positive integer per-tick cap and parseable evidence lease');
END;

CREATE TRIGGER IF NOT EXISTS source_registry_canary_requires_envelope_update
BEFORE UPDATE OF operational_state, canary_max_new_items_per_tick, policy_expiry ON source_registry
FOR EACH ROW
WHEN NEW.operational_state = 'canary'
 AND (
   NEW.canary_max_new_items_per_tick IS NULL
   OR typeof(NEW.canary_max_new_items_per_tick) <> 'integer'
   OR NEW.canary_max_new_items_per_tick <= 0
   OR NEW.policy_expiry IS NULL
   OR trim(NEW.policy_expiry) = ''
   OR julianday(NEW.policy_expiry) IS NULL
 )
BEGIN
  SELECT RAISE(ABORT, 'canary requires a positive integer per-tick cap and parseable evidence lease');
END;

-- An append-only, replayable event record for every SP-23 operational change.
-- source_id intentionally has no FK: source history survives retirement or a
-- future source_registry cleanup, as source_decisions does.
CREATE TABLE IF NOT EXISTS source_transition_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transition_plane_version TEXT NOT NULL,
  source_id TEXT NOT NULL,
  from_compliance TEXT NOT NULL CHECK (from_compliance IN ('needs_review','allowed','conditional','awaiting_permission','blocked','deprecated')),
  from_operational TEXT NOT NULL CHECK (from_operational IN ('candidate','shadow','canary','active','review_due','degraded','quarantined','paused','retired')),
  to_compliance TEXT NOT NULL CHECK (to_compliance IN ('needs_review','allowed','conditional','awaiting_permission','blocked','deprecated')),
  to_operational TEXT NOT NULL CHECK (to_operational IN ('candidate','shadow','canary','active','review_due','degraded','quarantined','paused','retired')),
  cause TEXT NOT NULL CHECK (cause IN (
    'requested_shadow_entry','requested_promotion',
    'canary_cap_breach','evidence_lease_expired','invalid_canary_cap',
    'health_quarantine','policy_expiry_review','emergency_pause','retirement'
  )),
  decided_at TEXT NOT NULL,
  evidence_hash TEXT,
  input_json TEXT NOT NULL CHECK (json_valid(input_json)),
  input_hash TEXT NOT NULL,
  decision_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS source_transition_events_source_decided_idx
  ON source_transition_events (source_id, decided_at);

CREATE UNIQUE INDEX IF NOT EXISTS source_transition_events_decision_hash_unique
  ON source_transition_events (decision_hash);

-- The event must be a canonical projection of its replay input, must start
-- from the live row, and may only use one of the explicit SP-23 paths. This
-- catches stale compare-and-swap attempts even if a caller has re-read an old
-- registry snapshot.
CREATE TRIGGER IF NOT EXISTS source_transition_events_validate_insert
BEFORE INSERT ON source_transition_events
FOR EACH ROW
BEGIN
  SELECT CASE WHEN
    json_extract(NEW.input_json, '$.version') IS NOT NEW.transition_plane_version
    OR json_extract(NEW.input_json, '$.sourceId') IS NOT NEW.source_id
    OR json_extract(NEW.input_json, '$.fromCompliance') IS NOT NEW.from_compliance
    OR json_extract(NEW.input_json, '$.fromOperational') IS NOT NEW.from_operational
    OR json_extract(NEW.input_json, '$.toCompliance') IS NOT NEW.to_compliance
    OR json_extract(NEW.input_json, '$.toOperational') IS NOT NEW.to_operational
    OR json_extract(NEW.input_json, '$.cause') IS NOT NEW.cause
    OR json_extract(NEW.input_json, '$.now') IS NOT NEW.decided_at
    OR json_extract(NEW.input_json, '$.evidenceHash') IS NOT NEW.evidence_hash
  THEN RAISE(ABORT, 'transition event fields must match canonical replay input') END;

  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM source_registry AS source
    WHERE source.source_id = NEW.source_id
      AND source.compliance_state = NEW.from_compliance
      AND source.operational_state = NEW.from_operational
      AND json_extract(NEW.input_json, '$.policyExpiry') IS source.policy_expiry
      AND json_extract(NEW.input_json, '$.canaryMaxNewItemsPerTick') IS source.canary_max_new_items_per_tick
      AND CAST(json_extract(NEW.input_json, '$.optOut') AS INTEGER) = source.opt_out
  ) THEN RAISE(ABORT, 'transition event does not match current source registry state') END;

  SELECT CASE WHEN NEW.from_compliance <> NEW.to_compliance
    THEN RAISE(ABORT, 'SP-23 transition events cannot change the compliance axis') END;

  SELECT CASE WHEN NEW.cause IN ('requested_shadow_entry','requested_promotion')
    AND (
      EXISTS (SELECT 1 FROM source_opt_outs WHERE source_id = NEW.source_id)
      OR (SELECT opt_out FROM source_registry WHERE source_id = NEW.source_id) <> 0
    ) THEN RAISE(ABORT, 'opted-out source cannot enter shadow or public promotion') END;

  SELECT CASE WHEN NEW.cause = 'requested_shadow_entry'
    AND NOT (NEW.from_operational = 'candidate' AND NEW.to_operational = 'shadow' AND NEW.evidence_hash IS NOT NULL AND trim(NEW.evidence_hash) <> '')
    THEN RAISE(ABORT, 'requested_shadow_entry must be evidenced candidate to shadow') END;

  SELECT CASE WHEN NEW.cause = 'requested_promotion'
    AND NOT (
      (NEW.from_operational = 'shadow' AND NEW.to_operational = 'canary')
      OR (NEW.from_operational = 'canary' AND NEW.to_operational = 'active')
    ) THEN RAISE(ABORT, 'requested_promotion must be shadow to canary or canary to active') END;

  SELECT CASE WHEN NEW.cause IN ('canary_cap_breach','evidence_lease_expired','invalid_canary_cap')
    AND NOT (NEW.from_operational = 'canary' AND NEW.to_operational = 'shadow')
    THEN RAISE(ABORT, 'automatic canary rollback must be canary to shadow') END;

  SELECT CASE WHEN NEW.cause = 'health_quarantine'
    AND NOT (NEW.to_operational = 'quarantined' AND NEW.evidence_hash IS NOT NULL AND trim(NEW.evidence_hash) <> '')
    THEN RAISE(ABORT, 'health_quarantine requires a target quarantine and evidence') END;

  SELECT CASE WHEN NEW.cause = 'policy_expiry_review'
    AND NOT (NEW.from_operational IN ('shadow','active') AND NEW.to_operational = 'review_due')
    THEN RAISE(ABORT, 'policy_expiry_review must be shadow or active to review_due') END;

  SELECT CASE WHEN NEW.cause = 'emergency_pause' AND NEW.to_operational <> 'paused'
    THEN RAISE(ABORT, 'emergency_pause must target paused') END;

  SELECT CASE WHEN NEW.cause = 'retirement' AND NEW.to_operational <> 'retired'
    THEN RAISE(ABORT, 'retirement must target retired') END;

  SELECT CASE WHEN NEW.cause IN ('requested_shadow_entry','requested_promotion')
    AND (
      (SELECT policy_expiry IS NULL OR julianday(policy_expiry) IS NULL OR julianday(policy_expiry) <= julianday(NEW.decided_at)
       FROM source_registry WHERE source_id = NEW.source_id)
    ) THEN RAISE(ABORT, 'promotion requires a current source evidence lease') END;

  SELECT CASE WHEN NEW.cause = 'requested_promotion'
    AND NEW.to_operational = 'canary'
    AND (
      (SELECT canary_max_new_items_per_tick IS NULL
              OR typeof(canary_max_new_items_per_tick) <> 'integer'
              OR canary_max_new_items_per_tick <= 0
       FROM source_registry WHERE source_id = NEW.source_id)
      OR CAST(json_extract(NEW.input_json, '$.observedShadowCount') AS INTEGER) < CAST(json_extract(NEW.input_json, '$.requiredShadowCount') AS INTEGER)
      OR CAST(json_extract(NEW.input_json, '$.requiredShadowCount') AS INTEGER) <= 0
      OR NEW.evidence_hash IS NULL
      OR trim(NEW.evidence_hash) = ''
    ) THEN RAISE(ABORT, 'canary promotion requires cap, evidence, and qualifying shadow observations') END;

  SELECT CASE WHEN NEW.cause = 'requested_promotion'
    AND NEW.to_operational = 'active'
    AND (NEW.evidence_hash IS NULL OR trim(NEW.evidence_hash) = '')
    THEN RAISE(ABORT, 'active promotion requires source-scoped evidence') END;

  SELECT CASE WHEN NEW.cause = 'canary_cap_breach'
    AND NOT (
      CAST(json_extract(NEW.input_json, '$.canaryMaxNewItemsPerTick') AS INTEGER) > 0
      AND CAST(json_extract(NEW.input_json, '$.proposedNewItems') AS INTEGER) > CAST(json_extract(NEW.input_json, '$.canaryMaxNewItemsPerTick') AS INTEGER)
    ) THEN RAISE(ABORT, 'canary cap breach event requires proposed items above the cap') END;

  SELECT CASE WHEN NEW.cause = 'evidence_lease_expired'
    AND (SELECT policy_expiry IS NOT NULL AND julianday(policy_expiry) > julianday(NEW.decided_at)
         FROM source_registry WHERE source_id = NEW.source_id)
    THEN RAISE(ABORT, 'evidence lease rollback requires an expired or invalid lease') END;

  SELECT CASE WHEN NEW.cause = 'invalid_canary_cap'
    AND (SELECT canary_max_new_items_per_tick IS NOT NULL
                AND typeof(canary_max_new_items_per_tick) = 'integer'
                AND canary_max_new_items_per_tick > 0
         FROM source_registry WHERE source_id = NEW.source_id)
    THEN RAISE(ABORT, 'invalid cap rollback requires a missing or invalid cap') END;
END;

-- A successful immutable event is the only route that changes the operational
-- state under this migration. The source guard below verifies this event hash
-- during the UPDATE, and any failed constraint aborts the INSERT atomically.
CREATE TRIGGER IF NOT EXISTS source_transition_events_apply_registry_state
AFTER INSERT ON source_transition_events
FOR EACH ROW
BEGIN
  UPDATE source_registry
  SET compliance_state = NEW.to_compliance,
      operational_state = NEW.to_operational,
      last_transition_hash = NEW.decision_hash,
      last_decision = 'sp23:' || NEW.cause,
      last_decision_at = NEW.decided_at,
      updated_at = NEW.decided_at
  WHERE source_id = NEW.source_id;
END;

CREATE TRIGGER IF NOT EXISTS source_registry_state_requires_transition_event
BEFORE UPDATE OF compliance_state, operational_state ON source_registry
FOR EACH ROW
WHEN NEW.compliance_state IS NOT OLD.compliance_state
  OR NEW.operational_state IS NOT OLD.operational_state
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM source_transition_events AS event
    WHERE event.decision_hash = NEW.last_transition_hash
      AND event.source_id = OLD.source_id
      AND event.from_compliance = OLD.compliance_state
      AND event.from_operational = OLD.operational_state
      AND event.to_compliance = NEW.compliance_state
      AND event.to_operational = NEW.operational_state
  ) THEN RAISE(ABORT, 'source_registry lifecycle state requires a matching immutable transition event') END;
END;

CREATE TRIGGER IF NOT EXISTS source_transition_events_append_only_update
BEFORE UPDATE ON source_transition_events
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'source_transition_events are append-only');
END;

CREATE TRIGGER IF NOT EXISTS source_transition_events_append_only_delete
BEFORE DELETE ON source_transition_events
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'source_transition_events are append-only');
END;
