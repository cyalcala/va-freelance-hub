-- SP-23 (2026-09-05): capped canary + typed transition persistence
--
-- This migration deliberately does not activate a source or wire a scheduler.
-- It creates the fail-closed storage contract for the future, capability-limited
-- transition gateway. Exact-six rows continue through the empty-registry
-- fallback unchanged.
--
-- `input_hash` / `decision_hash` are SQL-verifiable canonical replay
-- fingerprints (`hex(input_json)`), not cryptographic tamper evidence.
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

-- Match transition-plane.ts's canonical source-id policy before a malformed
-- identity can become durable registry debt. The lower-case ASCII grammar
-- preserves the established namespace punctuation while rejecting Unicode
-- lookalikes and every whitespace code point consistently with TypeScript.
CREATE TRIGGER IF NOT EXISTS source_registry_source_id_is_canonical_insert
BEFORE INSERT ON source_registry
FOR EACH ROW
WHEN typeof(NEW.source_id) <> 'text'
  OR instr(NEW.source_id, char(0)) <> 0
  OR length(NEW.source_id) = 0
  OR NEW.source_id GLOB '*[^a-z0-9:._-]*'
BEGIN
  SELECT RAISE(ABORT, 'source_registry source_id must be a non-empty lowercase ASCII canonical identifier');
END;

CREATE TRIGGER IF NOT EXISTS source_registry_source_id_is_immutable
BEFORE UPDATE OF source_id ON source_registry
FOR EACH ROW
WHEN NEW.source_id IS NOT OLD.source_id
BEGIN
  SELECT RAISE(ABORT, 'source_registry source_id is immutable; create a new candidate identity instead');
END;

-- Canonical replay runs in JavaScript, so durable integer values must remain
-- inside IEEE-754's exact-integer domain. Store a cap only when it is a
-- positive JavaScript-safe integer, even while the source is still dormant.
CREATE TRIGGER IF NOT EXISTS source_registry_canary_cap_is_safe_integer_insert
BEFORE INSERT ON source_registry
FOR EACH ROW
WHEN NEW.canary_max_new_items_per_tick IS NOT NULL
  AND (
    typeof(NEW.canary_max_new_items_per_tick) <> 'integer'
    OR NEW.canary_max_new_items_per_tick <= 0
    OR NEW.canary_max_new_items_per_tick > 9007199254740991
  )
BEGIN
  SELECT RAISE(ABORT, 'canary cap must be a positive JavaScript-safe integer');
END;

CREATE TRIGGER IF NOT EXISTS source_registry_canary_cap_is_safe_integer_update
BEFORE UPDATE OF canary_max_new_items_per_tick ON source_registry
FOR EACH ROW
WHEN NEW.canary_max_new_items_per_tick IS NOT NULL
  AND (
    typeof(NEW.canary_max_new_items_per_tick) <> 'integer'
    OR NEW.canary_max_new_items_per_tick <= 0
    OR NEW.canary_max_new_items_per_tick > 9007199254740991
  )
BEGIN
  SELECT RAISE(ABORT, 'canary cap must be a positive JavaScript-safe integer');
END;

-- New evidence leases use the one UTC instant grammar that the pure replay
-- authority accepts. Legacy rows are rechecked at transition time so an
-- ambiguous pre-SP-23 value can fail closed instead of becoming public.
CREATE TRIGGER IF NOT EXISTS source_registry_policy_expiry_is_canonical_utc_insert
BEFORE INSERT ON source_registry
FOR EACH ROW
WHEN NEW.policy_expiry IS NOT NULL
  AND (
    length(NEW.policy_expiry) <> 24
    OR NEW.policy_expiry NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
    OR substr(NEW.policy_expiry, 12, 2) NOT BETWEEN '00' AND '23'
    OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.policy_expiry) IS NOT NEW.policy_expiry
  )
BEGIN
  SELECT RAISE(ABORT, 'policy expiry must be a canonical UTC ISO-8601 instant');
END;

CREATE TRIGGER IF NOT EXISTS source_registry_policy_expiry_is_canonical_utc_update
BEFORE UPDATE OF policy_expiry ON source_registry
FOR EACH ROW
WHEN NEW.policy_expiry IS NOT NULL
  AND (
    length(NEW.policy_expiry) <> 24
    OR NEW.policy_expiry NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
    OR substr(NEW.policy_expiry, 12, 2) NOT BETWEEN '00' AND '23'
    OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.policy_expiry) IS NOT NEW.policy_expiry
  )
BEGIN
  SELECT RAISE(ABORT, 'policy expiry must be a canonical UTC ISO-8601 instant');
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

-- Canary exposure configuration is part of the typed/replayable decision.
-- Change it only after rolling back to shadow, then re-promote with a fresh
-- event; raw cap/lease edits must never silently widen or extend a canary.
CREATE TRIGGER IF NOT EXISTS source_registry_canary_envelope_is_immutable
BEFORE UPDATE OF canary_max_new_items_per_tick, policy_expiry ON source_registry
FOR EACH ROW
WHEN OLD.operational_state = 'canary'
  AND (
    NEW.canary_max_new_items_per_tick IS NOT OLD.canary_max_new_items_per_tick
    OR NEW.policy_expiry IS NOT OLD.policy_expiry
  )
BEGIN
  SELECT RAISE(ABORT, 'canary cap and evidence lease are immutable until typed rollback to shadow');
END;

-- An append-only, replayable event record for every SP-23 operational change.
-- source_id intentionally has no FK: source history survives retirement or a
-- future source_registry cleanup, as source_decisions does.
CREATE TABLE IF NOT EXISTS source_transition_events (
  -- SQLite exposes -1 as NEW.id to BEFORE INSERT triggers when an INTEGER
  -- PRIMARY KEY value is omitted. Reserve IDs for ordinary positive sequence
  -- allocation so an explicitly supplied negative ID cannot poison later
  -- collision checks for every implicit insert.
  id INTEGER PRIMARY KEY AUTOINCREMENT CHECK (id > 0),
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

-- Events intentionally outlive a registry cleanup. Once a typed transition
-- exists, its source_id is therefore a permanent historical identity: a fresh
-- candidate must not reuse it, because that could make an old immutable event
-- appear to authorize a state change on the new row. A source may still be
-- retired or deleted; subsequent reconsideration needs a new canonical ID.
CREATE TRIGGER IF NOT EXISTS source_registry_historical_identity_is_not_reusable
BEFORE INSERT ON source_registry
FOR EACH ROW
WHEN EXISTS (
  SELECT 1 FROM source_transition_events WHERE source_id = NEW.source_id
)
BEGIN
  SELECT RAISE(ABORT, 'source_registry source_id cannot be reused after an immutable transition event');
END;

-- An event ID is SQLite-assigned only. In a BEFORE INSERT trigger an omitted
-- INTEGER PRIMARY KEY arrives as -1, while any positive value was supplied by
-- the caller. Reject supplied positive IDs before they can advance
-- sqlite_sequence to its maximum and deny every later ordinary event insert.
CREATE TRIGGER IF NOT EXISTS source_transition_events_reject_caller_supplied_id
BEFORE INSERT ON source_transition_events
FOR EACH ROW
WHEN NEW.id > 0
BEGIN
  SELECT RAISE(ABORT, 'source_transition_events id is SQLite-assigned');
END;

-- SQLite's `INSERT OR REPLACE` may delete a conflicting row without firing
-- DELETE triggers when recursive triggers are off. Reject a decision-fingerprint
-- collision before conflict handling so a caller cannot replace immutable
-- history through the UNIQUE decision_hash constraint.
CREATE TRIGGER IF NOT EXISTS source_transition_events_reject_identity_collision
BEFORE INSERT ON source_transition_events
FOR EACH ROW
WHEN EXISTS (
  SELECT 1 FROM source_transition_events WHERE decision_hash = NEW.decision_hash
)
BEGIN
  SELECT RAISE(ABORT, 'source_transition_events immutable identity already exists');
END;

-- Parenthesize CASE expressions inside trigger bodies for D1 remote-query
-- parser compatibility (cloudflare/workers-sdk#4727). SQLite and Wrangler
-- local splitting accept the unparenthesized form, which is insufficient
-- production transport verification. These parentheses preserve every guard.
--
-- The event must be a canonical projection of its replay input, must start
-- from the live row, and may only use one of the explicit SP-23 paths. This
-- catches stale compare-and-swap attempts even if a caller has re-read an old
-- registry snapshot.
CREATE TRIGGER IF NOT EXISTS source_transition_events_validate_insert
BEFORE INSERT ON source_transition_events
FOR EACH ROW
BEGIN
  SELECT (CASE WHEN NEW.transition_plane_version <> 'sp23-v1'
    THEN RAISE(ABORT, 'unsupported transition plane version') END);

  SELECT (CASE WHEN typeof(NEW.source_id) <> 'text'
    OR instr(NEW.source_id, char(0)) <> 0
    OR length(NEW.source_id) = 0
    OR NEW.source_id GLOB '*[^a-z0-9:._-]*'
    THEN RAISE(ABORT, 'transition event source_id must be a non-empty lowercase ASCII canonical identifier') END);

  -- Event evidence is a compact source-scoped identifier, not arbitrary text
  -- or a URL. Restrict it to an ASCII token grammar so SQLite's byte-oriented
  -- JSON storage and JavaScript's UTF-8 replay always observe the same packet.
  SELECT (CASE WHEN NEW.evidence_hash IS NOT NULL
    AND (
      typeof(NEW.evidence_hash) <> 'text'
      OR instr(NEW.evidence_hash, char(0)) <> 0
      OR length(NEW.evidence_hash) = 0
      OR NEW.evidence_hash GLOB '*[^A-Za-z0-9._:-]*'
    ) THEN RAISE(ABORT, 'transition event evidence_hash must be a non-empty ASCII token') END);

  -- SQLite integers can exceed JavaScript's exact numeric range. Reject any
  -- such packet before it can be stored, otherwise JSON.parse would round it
  -- and the replay verifier could not reconstruct the canonical bytes.
  SELECT (CASE WHEN
    (typeof(json_extract(NEW.input_json, '$.observedShadowCount')) = 'integer'
      AND (
        CAST(json_extract(NEW.input_json, '$.observedShadowCount') AS INTEGER) < -9007199254740991
        OR CAST(json_extract(NEW.input_json, '$.observedShadowCount') AS INTEGER) > 9007199254740991
      ))
    OR (typeof(json_extract(NEW.input_json, '$.requiredShadowCount')) = 'integer'
      AND (
        CAST(json_extract(NEW.input_json, '$.requiredShadowCount') AS INTEGER) < -9007199254740991
        OR CAST(json_extract(NEW.input_json, '$.requiredShadowCount') AS INTEGER) > 9007199254740991
      ))
    OR (typeof(json_extract(NEW.input_json, '$.canaryMaxNewItemsPerTick')) = 'integer'
      AND (
        CAST(json_extract(NEW.input_json, '$.canaryMaxNewItemsPerTick') AS INTEGER) < -9007199254740991
        OR CAST(json_extract(NEW.input_json, '$.canaryMaxNewItemsPerTick') AS INTEGER) > 9007199254740991
      ))
    OR (typeof(json_extract(NEW.input_json, '$.proposedNewItems')) = 'integer'
      AND (
        CAST(json_extract(NEW.input_json, '$.proposedNewItems') AS INTEGER) < -9007199254740991
        OR CAST(json_extract(NEW.input_json, '$.proposedNewItems') AS INTEGER) > 9007199254740991
      ))
    THEN RAISE(ABORT, 'transition event numeric fields must be JavaScript-safe integers') END);

  SELECT (CASE WHEN length(NEW.decided_at) <> 24
    OR NEW.decided_at NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
    OR substr(NEW.decided_at, 12, 2) NOT BETWEEN '00' AND '23'
    OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.decided_at) IS NOT NEW.decided_at
    OR julianday(NEW.decided_at) IS NULL
    OR abs(julianday(NEW.decided_at) - julianday('now')) > (5.0 / 1440.0)
    THEN RAISE(ABORT, 'transition event decided_at must be a canonical UTC timestamp within five minutes of D1 time') END);

  SELECT (CASE WHEN NEW.input_hash <> hex(NEW.input_json)
    OR NEW.decision_hash <> hex(NEW.input_json)
    THEN RAISE(ABORT, 'transition event fingerprints must be the canonical input encoding') END);

  SELECT (CASE WHEN
    json_extract(NEW.input_json, '$.version') IS NOT NEW.transition_plane_version
    OR json_extract(NEW.input_json, '$.sourceId') IS NOT NEW.source_id
    OR json_extract(NEW.input_json, '$.fromCompliance') IS NOT NEW.from_compliance
    OR json_extract(NEW.input_json, '$.fromOperational') IS NOT NEW.from_operational
    OR json_extract(NEW.input_json, '$.toCompliance') IS NOT NEW.to_compliance
    OR json_extract(NEW.input_json, '$.toOperational') IS NOT NEW.to_operational
    OR json_extract(NEW.input_json, '$.cause') IS NOT NEW.cause
    OR json_extract(NEW.input_json, '$.now') IS NOT NEW.decided_at
    OR json_extract(NEW.input_json, '$.evidenceHash') IS NOT NEW.evidence_hash
  THEN RAISE(ABORT, 'transition event fields must match canonical replay input') END);

  SELECT (CASE WHEN NOT EXISTS (
    SELECT 1 FROM source_registry AS source
    WHERE source.source_id = NEW.source_id
      AND source.compliance_state = NEW.from_compliance
      AND source.operational_state = NEW.from_operational
      AND json_extract(NEW.input_json, '$.policyExpiry') IS source.policy_expiry
      AND json_extract(NEW.input_json, '$.canaryMaxNewItemsPerTick') IS source.canary_max_new_items_per_tick
      AND CAST(json_extract(NEW.input_json, '$.optOut') AS INTEGER) = (CASE
        WHEN source.opt_out <> 0
          OR EXISTS (SELECT 1 FROM source_opt_outs WHERE source_id = NEW.source_id)
        THEN 1 ELSE 0 END)
  ) THEN RAISE(ABORT, 'transition event does not match current source registry state') END);

  -- A replay packet is byte-canonical, not merely JSON-shaped: its exact
  -- field order, values, types, and key set must be what transition-plane.ts
  -- emits. This rejects reordered, whitespace-padded, duplicate, or extra-key
  -- packets even when their extracted fields would otherwise look valid.
  SELECT (CASE WHEN NEW.input_json IS NOT (
    SELECT json_object(
      'version', NEW.transition_plane_version,
      'sourceId', NEW.source_id,
      'fromCompliance', NEW.from_compliance,
      'fromOperational', NEW.from_operational,
      'toCompliance', NEW.to_compliance,
      'toOperational', NEW.to_operational,
      'optOut', json(CASE WHEN source.opt_out <> 0
        OR EXISTS (SELECT 1 FROM source_opt_outs WHERE source_id = NEW.source_id)
        THEN 'true' ELSE 'false' END),
      'cause', NEW.cause,
      'now', NEW.decided_at,
      'policyExpiry', source.policy_expiry,
      'evidenceHash', NEW.evidence_hash,
      'observedShadowCount', CAST(json_extract(NEW.input_json, '$.observedShadowCount') AS INTEGER),
      'requiredShadowCount', CAST(json_extract(NEW.input_json, '$.requiredShadowCount') AS INTEGER),
      'canaryMaxNewItemsPerTick', source.canary_max_new_items_per_tick,
      'proposedNewItems', CAST(json_extract(NEW.input_json, '$.proposedNewItems') AS INTEGER)
    )
    FROM source_registry AS source
    WHERE source.source_id = NEW.source_id
  ) THEN RAISE(ABORT, 'transition event input_json must be the exact canonical replay packet') END);

  SELECT (CASE WHEN NEW.from_compliance <> NEW.to_compliance
    THEN RAISE(ABORT, 'SP-23 transition events cannot change the compliance axis') END);

  -- Mirror the operational topology in source-lifecycle.ts at the persistence
  -- boundary. The TypeScript gateway is the normal authority, but an event
  -- row must never admit an edge the pure validator would reject.
  SELECT (CASE WHEN NOT (
    NEW.from_operational = NEW.to_operational
    OR (NEW.from_operational = 'candidate' AND NEW.to_operational IN ('shadow','paused','retired'))
    OR (NEW.from_operational = 'shadow' AND NEW.to_operational IN ('canary','review_due','paused','quarantined','retired'))
    OR (NEW.from_operational = 'canary' AND NEW.to_operational IN ('shadow','active','paused','quarantined','degraded','retired'))
    OR (NEW.from_operational = 'active' AND NEW.to_operational IN ('review_due','degraded','quarantined','paused','retired'))
    OR (NEW.from_operational = 'review_due' AND NEW.to_operational IN ('active','paused','retired'))
    OR (NEW.from_operational = 'degraded' AND NEW.to_operational IN ('quarantined','paused','active','retired'))
    OR (NEW.from_operational = 'quarantined' AND NEW.to_operational IN ('paused','retired','active'))
    OR (NEW.from_operational = 'paused' AND NEW.to_operational IN ('candidate','retired'))
  ) THEN RAISE(ABORT, 'transition event operational edge is not allowed by lifecycle graph') END);

  SELECT (CASE WHEN NEW.cause IN ('requested_shadow_entry','requested_promotion')
    AND (
      EXISTS (SELECT 1 FROM source_opt_outs WHERE source_id = NEW.source_id)
      OR (SELECT opt_out FROM source_registry WHERE source_id = NEW.source_id) <> 0
    ) THEN RAISE(ABORT, 'opted-out source cannot enter shadow or public promotion') END);

  SELECT (CASE WHEN NEW.cause = 'requested_shadow_entry'
    AND NOT (NEW.from_operational = 'candidate' AND NEW.to_operational = 'shadow' AND NEW.evidence_hash IS NOT NULL)
    THEN RAISE(ABORT, 'requested_shadow_entry must be evidenced candidate to shadow') END);

  SELECT (CASE WHEN NEW.cause = 'requested_promotion'
    AND NOT (
      (NEW.from_operational = 'shadow' AND NEW.to_operational = 'canary')
      OR (NEW.from_operational = 'canary' AND NEW.to_operational = 'active')
    ) THEN RAISE(ABORT, 'requested_promotion must be shadow to canary or canary to active') END);

  SELECT (CASE WHEN NEW.cause IN ('canary_cap_breach','evidence_lease_expired','invalid_canary_cap')
    AND NOT (NEW.from_operational = 'canary' AND NEW.to_operational = 'shadow')
    THEN RAISE(ABORT, 'automatic canary rollback must be canary to shadow') END);

  SELECT (CASE WHEN NEW.cause = 'health_quarantine'
    AND NOT (
      NEW.from_operational IN ('shadow','canary','active','degraded','quarantined')
      AND NEW.to_operational = 'quarantined'
      AND NEW.evidence_hash IS NOT NULL
    )
    THEN RAISE(ABORT, 'health_quarantine requires a target quarantine and evidence') END);

  SELECT (CASE WHEN NEW.cause = 'policy_expiry_review'
    AND NOT (
      NEW.from_operational IN ('shadow','active')
      AND NEW.to_operational = 'review_due'
      AND (
        (SELECT policy_expiry IS NULL
                OR julianday(policy_expiry) IS NULL
                OR length(policy_expiry) <> 24
                OR policy_expiry NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
                OR substr(policy_expiry, 12, 2) NOT BETWEEN '00' AND '23'
                OR strftime('%Y-%m-%dT%H:%M:%fZ', policy_expiry) IS NOT policy_expiry
                OR (
                  julianday(policy_expiry) <= julianday('now')
                  AND julianday(policy_expiry) <= julianday(NEW.decided_at)
                )
         FROM source_registry WHERE source_id = NEW.source_id)
      )
    )
    THEN RAISE(ABORT, 'policy_expiry_review requires shadow/active and an expired or invalid lease') END);

  SELECT (CASE WHEN NEW.cause = 'emergency_pause'
    AND NOT (
      NEW.from_operational IN ('candidate','shadow','canary','active','review_due','degraded','quarantined','paused')
      AND NEW.to_operational = 'paused'
    ) THEN RAISE(ABORT, 'emergency_pause must follow the lifecycle graph and target paused') END);

  SELECT (CASE WHEN NEW.cause = 'retirement' AND NEW.to_operational <> 'retired'
    THEN RAISE(ABORT, 'retirement must target retired') END);

  SELECT (CASE WHEN NEW.cause IN ('requested_shadow_entry','requested_promotion')
    AND (
      (SELECT policy_expiry IS NULL
              OR julianday(policy_expiry) IS NULL
              OR length(policy_expiry) <> 24
              OR policy_expiry NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
              OR substr(policy_expiry, 12, 2) NOT BETWEEN '00' AND '23'
              OR strftime('%Y-%m-%dT%H:%M:%fZ', policy_expiry) IS NOT policy_expiry
              OR julianday(policy_expiry) <= julianday('now')
              OR julianday(policy_expiry) <= julianday(NEW.decided_at)
       FROM source_registry WHERE source_id = NEW.source_id)
    ) THEN RAISE(ABORT, 'promotion requires a current source evidence lease') END);

  SELECT (CASE WHEN NEW.cause = 'requested_promotion'
    AND NEW.to_operational = 'canary'
    AND (
       (SELECT canary_max_new_items_per_tick IS NULL
               OR typeof(canary_max_new_items_per_tick) <> 'integer'
               OR canary_max_new_items_per_tick <= 0
        FROM source_registry WHERE source_id = NEW.source_id)
       OR typeof(json_extract(NEW.input_json, '$.observedShadowCount')) <> 'integer'
       OR typeof(json_extract(NEW.input_json, '$.requiredShadowCount')) <> 'integer'
       OR CAST(json_extract(NEW.input_json, '$.requiredShadowCount') AS INTEGER) <= 0
       OR CAST(json_extract(NEW.input_json, '$.observedShadowCount') AS INTEGER) <> (
         SELECT COUNT(*) FROM source_shadow_observations
         WHERE source_id = NEW.source_id
           AND outcome IN ('HEALTHY_WITH_RESULTS', 'HEALTHY_EMPTY')
       )
       OR (
         SELECT COUNT(*) FROM source_shadow_observations
         WHERE source_id = NEW.source_id
           AND outcome IN ('HEALTHY_WITH_RESULTS', 'HEALTHY_EMPTY')
       ) < CAST(json_extract(NEW.input_json, '$.requiredShadowCount') AS INTEGER)
       OR NEW.evidence_hash IS NULL
    ) THEN RAISE(ABORT, 'canary promotion requires cap, evidence, and qualifying shadow observations') END);

  SELECT (CASE WHEN NEW.cause = 'requested_promotion'
    AND NEW.to_operational = 'active'
    AND NEW.evidence_hash IS NULL
    THEN RAISE(ABORT, 'active promotion requires source-scoped evidence') END);

  SELECT (CASE WHEN NEW.cause = 'canary_cap_breach'
    AND (
      typeof(json_extract(NEW.input_json, '$.canaryMaxNewItemsPerTick')) <> 'integer'
      OR typeof(json_extract(NEW.input_json, '$.proposedNewItems')) <> 'integer'
      OR CAST(json_extract(NEW.input_json, '$.canaryMaxNewItemsPerTick') AS INTEGER) <= 0
      OR CAST(json_extract(NEW.input_json, '$.proposedNewItems') AS INTEGER) <= CAST(json_extract(NEW.input_json, '$.canaryMaxNewItemsPerTick') AS INTEGER)
    ) THEN RAISE(ABORT, 'canary cap breach event requires proposed items above the cap') END);

  SELECT (CASE WHEN NEW.cause = 'evidence_lease_expired'
    AND (SELECT policy_expiry IS NOT NULL
                AND length(policy_expiry) = 24
                AND policy_expiry GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
                AND substr(policy_expiry, 12, 2) BETWEEN '00' AND '23'
                AND strftime('%Y-%m-%dT%H:%M:%fZ', policy_expiry) IS policy_expiry
                AND julianday(policy_expiry) IS NOT NULL
                AND (
                  julianday(policy_expiry) > julianday('now')
                  OR julianday(policy_expiry) > julianday(NEW.decided_at)
                )
         FROM source_registry WHERE source_id = NEW.source_id)
    THEN RAISE(ABORT, 'evidence lease rollback requires an expired or invalid lease') END);

  SELECT (CASE WHEN NEW.cause = 'invalid_canary_cap'
    AND (SELECT canary_max_new_items_per_tick IS NOT NULL
                AND typeof(canary_max_new_items_per_tick) = 'integer'
                AND canary_max_new_items_per_tick > 0
         FROM source_registry WHERE source_id = NEW.source_id)
    THEN RAISE(ABORT, 'invalid cap rollback requires a missing or invalid cap') END);
END;

-- A successful immutable event is the only route that changes the operational
-- state under this migration. The source guard below requires the event to be
-- the newest immutable event for this source during the UPDATE, so an older
-- hash cannot be replayed by a raw registry mutation. Any failed constraint
-- aborts the INSERT atomically.
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
BEFORE UPDATE OF operational_state, last_transition_hash ON source_registry
FOR EACH ROW
WHEN NEW.operational_state IS NOT OLD.operational_state
  OR NEW.last_transition_hash IS NOT OLD.last_transition_hash
BEGIN
  SELECT (CASE WHEN NOT EXISTS (
    SELECT 1
    FROM source_transition_events AS event
    WHERE event.decision_hash = NEW.last_transition_hash
      AND event.source_id = OLD.source_id
      AND event.id = (
        SELECT MAX(latest.id)
        FROM source_transition_events AS latest
        WHERE latest.source_id = OLD.source_id
      )
      AND event.from_compliance = OLD.compliance_state
      AND event.from_operational = OLD.operational_state
      AND event.to_compliance = NEW.compliance_state
      AND event.to_operational = NEW.operational_state
  ) THEN RAISE(ABORT, 'source_registry lifecycle state requires a matching immutable transition event') END);
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
