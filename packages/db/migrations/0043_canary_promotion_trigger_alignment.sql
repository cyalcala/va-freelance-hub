-- Migration 0043: Canary promotion trigger alignment and canary cap backfill
--
-- Resolves trigger conflict between 0039/0042 and 0040 on canary promotion:
-- 1. In source_transition_events_validate_insert, gate the raw observation count
--    check with NEW.transition_plane_version = 'sp23-v1', letting sp23-v2
--    transitions be guarded by source_transition_events_current_admission_guard
--    which verifies the exact 7-day distinct calendar qualifying window.
-- 2. Backfill canary_max_new_items_per_tick = 2 for sources with NULL cap,
--    temporarily dropping source_registry_governance_revision_bump to preserve
--    governance_revision = 1 and evidence continuity.
--> statement-breakpoint

-- 1. Temporarily drop the revision bump trigger so backfilling canary_max_new_items_per_tick
-- does not bump governance_revision, which would invalidate current qualifying evidence.
DROP TRIGGER IF EXISTS source_registry_governance_revision_bump;
--> statement-breakpoint

UPDATE source_registry
SET canary_max_new_items_per_tick = 2
WHERE canary_max_new_items_per_tick IS NULL;
--> statement-breakpoint

CREATE TRIGGER source_registry_governance_revision_bump
BEFORE UPDATE OF endpoint_url, company_token, discovery_provenance, compliance_state,
                 canary_max_new_items_per_tick, opt_out, review_deadline, policy_expiry
ON source_registry
FOR EACH ROW
WHEN OLD.governance_revision = NEW.governance_revision
  AND (
    OLD.endpoint_url IS NOT NEW.endpoint_url
    OR OLD.company_token IS NOT NEW.company_token
    OR OLD.discovery_provenance IS NOT NEW.discovery_provenance
    OR OLD.compliance_state IS NOT NEW.compliance_state
    OR OLD.canary_max_new_items_per_tick IS NOT NEW.canary_max_new_items_per_tick
    OR OLD.opt_out IS NOT NEW.opt_out
    OR OLD.review_deadline IS NOT NEW.review_deadline
    OR OLD.policy_expiry IS NOT NEW.policy_expiry
  )
BEGIN
  UPDATE source_registry
  SET governance_revision = OLD.governance_revision + 1
  WHERE source_id = OLD.source_id;
END;
--> statement-breakpoint

-- 2. Align source_transition_events_validate_insert to allow sp23-v2 canary admissions
DROP TRIGGER IF EXISTS source_transition_events_validate_insert;
--> statement-breakpoint

CREATE TRIGGER source_transition_events_validate_insert
BEFORE INSERT ON source_transition_events
BEGIN
  SELECT (CASE WHEN length(NEW.decided_at) <> 24
    OR substr(NEW.decided_at, 12, 2) NOT BETWEEN '00' AND '23'
    OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.decided_at) IS NOT NEW.decided_at
    OR abs(julianday(NEW.decided_at) - julianday('now')) > (5.0 / 1440.0)
    THEN RAISE(ABORT, 'decided_at must be a canonical UTC timestamp within five minutes of D1 time') END);

  SELECT (CASE WHEN (
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
       OR (
         NEW.transition_plane_version = 'sp23-v1' AND (
           CAST(json_extract(NEW.input_json, '$.observedShadowCount') AS INTEGER) <> (
             SELECT COUNT(*) FROM source_shadow_observations
             WHERE source_id = NEW.source_id
               AND outcome IN ('HEALTHY_WITH_RESULTS', 'HEALTHY_EMPTY')
           )
           OR (
             SELECT COUNT(*) FROM source_shadow_observations
             WHERE source_id = NEW.source_id
               AND outcome IN ('HEALTHY_WITH_RESULTS', 'HEALTHY_EMPTY')
           ) < CAST(json_extract(NEW.input_json, '$.requiredShadowCount') AS INTEGER)
         )
       )
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
