-- Migration 0044: Canary to Active (Production) graduation trigger enablement
--
-- SP-24 Production Graduation Window (2026-09-24)
-- Removes obsolete pre-SP-23C abort trigger in source_transition_events_current_admission_guard
-- and establishes verified constitutional gate for canary -> active production graduation.

DROP TRIGGER IF EXISTS source_transition_events_current_admission_guard;
--> statement-breakpoint

CREATE TRIGGER source_transition_events_current_admission_guard
BEFORE INSERT ON source_transition_events
BEGIN
  SELECT RAISE(ABORT, 'active graduation requires prior canary operational state')
  WHERE NEW.cause='requested_promotion' AND NEW.to_operational='active' AND (
    NEW.from_operational <> 'canary'
    OR (SELECT operational_state FROM source_registry WHERE source_id = NEW.source_id) <> 'canary'
  );

  SELECT RAISE(ABORT, 'new admissions require sp23-v2 current evidence')
  WHERE NEW.cause IN('requested_shadow_entry','requested_promotion') AND NEW.transition_plane_version<>'sp23-v2';

  SELECT RAISE(ABORT, 'v2 admission context must be the final canonical input field')
  WHERE NEW.transition_plane_version='sp23-v2' AND NEW.input_json IS NOT
    json_insert(json_remove(NEW.input_json,'$.admission'),'$.admission',json_extract(NEW.input_json,'$.admission'));

  SELECT RAISE(ABORT, 'admission context must match current immutable evidence and server policy')
  WHERE NEW.cause IN('requested_shadow_entry','requested_promotion') AND NOT EXISTS(
    SELECT 1 FROM source_admission_current_evidence e JOIN source_registry s ON s.source_id=e.source_id
    WHERE e.id=json_extract(NEW.input_json,'$.admission.admissionEvidenceId') AND e.source_id=NEW.source_id
      AND e.packet_sha256=NEW.evidence_hash
      AND e.policy_version='sp23-shadow-7d-v1'
      AND julianday(e.expires_at)>julianday(NEW.decided_at) AND julianday(e.captured_at)<=julianday(NEW.decided_at)
      AND json_extract(NEW.input_json,'$.admission') IS json_object(
        'admissionEvidenceId',e.id,
        'sourceGovernanceRevision',e.source_governance_revision,
        'providerGovernanceRevision',e.provider_governance_revision,
        'observationPolicyVersion',e.policy_version,
        'shadowEntryHash',IIF(NEW.to_operational='shadow',NULL,s.last_transition_hash),
        'qualifyingObservationIds',json_extract(NEW.input_json,'$.admission.qualifyingObservationIds'))
      AND json_type(NEW.input_json,'$.admission.qualifyingObservationIds')='array'
      AND EXISTS(SELECT 1 FROM json_each(e.packet_json,'$.authorityActions') WHERE value='recurrent_private_shadow')
      AND (NEW.to_operational NOT IN ('canary','active') OR EXISTS(SELECT 1 FROM json_each(e.packet_json,'$.authorityActions') WHERE value='public_minimal_metadata_canary'))
  );

  SELECT RAISE(ABORT, 'shadow entry has no prior observation window')
  WHERE NEW.cause='requested_shadow_entry' AND (
    json_extract(NEW.input_json,'$.admission.qualifyingObservationIds') IS NOT '[]'
    OR json_extract(NEW.input_json,'$.observedShadowCount') IS NOT NULL
    OR json_extract(NEW.input_json,'$.requiredShadowCount') IS NOT NULL);

  SELECT RAISE(ABORT, 'canary promotion requires the exact current seven-day observation window')
  WHERE NEW.cause='requested_promotion' AND NEW.to_operational='canary' AND (
    json_extract(NEW.input_json,'$.requiredShadowCount') IS NOT 8
    OR json_extract(NEW.input_json,'$.observedShadowCount') IS NOT
      (SELECT COUNT(*) FROM source_admission_qualifying_observations q WHERE q.source_id=NEW.source_id
       AND julianday(q.observed_at)<=julianday(NEW.decided_at) AND julianday(q.observed_at)>=julianday(NEW.decided_at)-14)
    OR json_extract(NEW.input_json,'$.admission.qualifyingObservationIds') IS NOT
      (SELECT json_group_array(id) FROM (SELECT q.id FROM source_admission_qualifying_observations q WHERE q.source_id=NEW.source_id
       AND julianday(q.observed_at)<=julianday(NEW.decided_at) AND julianday(q.observed_at)>=julianday(NEW.decided_at)-14 ORDER BY q.observed_at,q.id))
    OR NOT EXISTS(
      SELECT 1 FROM source_admission_qualifying_observations q WHERE q.source_id=NEW.source_id
        AND julianday(q.observed_at)<=julianday(NEW.decided_at) AND julianday(q.observed_at)>=julianday(NEW.decided_at)-14
      GROUP BY q.source_id HAVING COUNT(*)>=8 AND MAX(julianday(q.observed_at))-MIN(julianday(q.observed_at))>=7
        AND MAX(julianday(q.observed_at))>=julianday('now')-2 AND MAX(julianday(q.observed_at))>=julianday(NEW.decided_at)-2
        AND MAX(q.plausible_items)>0)
    OR EXISTS(
      SELECT 1 FROM source_shadow_observations bad
      WHERE bad.admission_evidence_id=json_extract(NEW.input_json,'$.admission.admissionEvidenceId')
        AND bad.shadow_entry_hash=json_extract(NEW.input_json,'$.admission.shadowEntryHash')
        AND bad.outcome NOT IN('HEALTHY_WITH_RESULTS','HEALTHY_EMPTY')
        AND julianday(bad.observed_at)>=(SELECT MIN(julianday(q.observed_at)) FROM source_admission_qualifying_observations q WHERE q.source_id=NEW.source_id))
  );
END;
