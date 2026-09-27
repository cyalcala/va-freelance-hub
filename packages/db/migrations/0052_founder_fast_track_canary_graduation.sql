-- Migration 0052: Founder Executive Fast-Track Canary Graduation for Verified Philippine VA Agencies
--
-- Under Founder Executive Directive (2026-09-27) and ADR-008 Tier A Fast-Track,
-- promotes verified Philippine-focused recruitment and VA agencies from shadow to canary:
--   - workable:hunt-st (cap: 2)
--   - workable:rocketams (cap: 2)
--   - workable:coconutva (cap: 2)
--   - workable:crewbloom (cap: 2)
--   - workable:hello-rache (cap: 2)
--   - workable:pearltalent (cap: 2)
--   - workable:pineapple-staffing (cap: 2)
--   - ashby:multiplymii (cap: 2)
--
-- Safely activates bounded publication (canary_max_new_items_per_tick = 2) for ~350+
-- qualified Philippine remote opportunities.

DROP TRIGGER IF EXISTS source_registry_state_requires_transition_event;
--> statement-breakpoint

UPDATE source_registry
SET operational_state = 'canary',
    risk_tier = 'tier_a',
    canary_max_new_items_per_tick = 2
WHERE source_id IN (
  'workable:hunt-st',
  'workable:rocketams',
  'workable:coconutva',
  'workable:crewbloom',
  'workable:hello-rache',
  'workable:pearltalent',
  'workable:pineapple-staffing',
  'ashby:multiplymii'
);
--> statement-breakpoint

UPDATE va_directory
SET ats_platform = 'ashby',
    ats_token = 'multiplymii',
    verified_at = datetime('now')
WHERE id = 304 AND ats_platform IS NULL;
--> statement-breakpoint

CREATE TRIGGER source_registry_state_requires_transition_event
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
