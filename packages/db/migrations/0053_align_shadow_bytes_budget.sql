-- Migration 0053: Align SQLite shadow observation trigger byte budget to 1 MiB (1048576 bytes)
--
-- Parameter shadow_max_bytes was increased from 524288 (512 KiB) to 1048576 (1 MiB)
-- in docs/ACCEPTED_PARAMETERS.yaml and packages/scraper/candidate-shadow.ts
-- to accommodate larger employer job boards (e.g. Canonical at ~568 KiB and
-- Recruitee My Jewellery at ~558 KiB).
--
-- However, trigger source_shadow_observations_admission_insert was still checking:
--   NEW.bytes_received > 524288
-- causing D1 to abort valid observations for boards between 512 KiB and 1 MiB,
-- producing run-level HTTP 503 errors and blocking shadow sources from accumulating
-- clean days for canary graduation.
--
-- This migration updates the trigger to enforce NEW.bytes_received > 1048576,
-- establishing 100% parity between TypeScript runtime, parameter documentation,
-- and the SQLite database trigger.

DROP TRIGGER IF EXISTS source_shadow_observations_admission_insert;
--> statement-breakpoint

CREATE TRIGGER source_shadow_observations_admission_insert
BEFORE INSERT ON source_shadow_observations
BEGIN
  SELECT RAISE(ABORT, 'observation requires a unique dispatch and current admission context')
  WHERE NEW.admission_evidence_id IS NULL OR NEW.shadow_entry_hash IS NULL
    OR NEW.dispatch_key IS NULL OR length(trim(NEW.dispatch_key))=0 OR instr(NEW.dispatch_key,char(0))>0
    OR EXISTS(SELECT 1 FROM source_shadow_observations WHERE dispatch_key=NEW.dispatch_key);
  SELECT RAISE(ABORT, 'observation timestamp must be current canonical UTC')
  WHERE NOT (length(NEW.observed_at) = 24 AND substr(NEW.observed_at,12,2) BETWEEN '00' AND '23' AND strftime('%Y-%m-%dT%H:%M:%fZ',NEW.observed_at) IS NEW.observed_at) OR abs(julianday(NEW.observed_at)-julianday('now'))>5.0/1440;
  SELECT RAISE(ABORT, 'observation admission context changed or expired')
  WHERE NOT EXISTS(
    SELECT 1 FROM source_admission_evidence e JOIN source_registry s ON s.source_id=e.source_id JOIN provider_profiles p ON p.id=e.provider_id
    WHERE e.id=NEW.admission_evidence_id AND e.id=(SELECT MAX(id) FROM source_admission_evidence WHERE source_id=s.source_id)
      AND s.source_id=NEW.source_id AND p.id=NEW.provider_id AND s.provider_id=p.id
      AND s.operational_state='shadow' AND s.last_transition_hash=NEW.shadow_entry_hash
      AND s.governance_revision=e.source_governance_revision AND p.governance_revision=e.provider_governance_revision
      AND s.endpoint_url=e.endpoint_url AND s.compliance_state IN('allowed','conditional') AND s.opt_out=0
      AND NOT EXISTS(SELECT 1 FROM source_opt_outs WHERE source_id=s.source_id)
      AND julianday(e.expires_at)>julianday('now') AND julianday(s.policy_expiry)>julianday('now')
      AND julianday(NEW.observed_at)>=julianday(e.captured_at)
  );
  SELECT RAISE(ABORT, 'observation result projections do not match persisted metadata')
  WHERE NOT json_valid(NEW.result_json)
    OR json_extract(NEW.result_json,'$.sourceId') IS NOT NEW.source_id
    OR json_extract(NEW.result_json,'$.providerId') IS NOT NEW.provider_id
    OR json_extract(NEW.result_json,'$.timestamp') IS NOT NEW.observed_at
    OR json_extract(NEW.result_json,'$.endpoint.url') IS NOT (SELECT endpoint_url FROM source_admission_evidence WHERE id=NEW.admission_evidence_id)
    OR json_extract(NEW.result_json,'$.admissionBinding.evidenceId') IS NOT NEW.admission_evidence_id
    OR json_extract(NEW.result_json,'$.admissionBinding.shadowEntryHash') IS NOT NEW.shadow_entry_hash
    OR json_extract(NEW.result_json,'$.admissionBinding.dispatchKey') IS NOT NEW.dispatch_key
    OR json_extract(NEW.result_json,'$.diagnostic.outcome') IS NOT NEW.outcome
    OR json_extract(NEW.result_json,'$.diagnostic.requestCount') IS NOT NEW.request_count
    OR json_extract(NEW.result_json,'$.diagnostic.bytesReceived') IS NOT NEW.bytes_received
    OR json_extract(NEW.result_json,'$.diagnostic.durationMs') IS NOT NEW.duration_ms
    OR json_extract(NEW.result_json,'$.parse.itemCount') IS NOT NEW.item_count
    OR json_extract(NEW.result_json,'$.sampleFunnel.plausibleItems') IS NOT NEW.plausible_items
    OR json_extract(NEW.result_json,'$.stopReason') IS NOT NEW.stop_reason
    OR json_extract(NEW.result_json,'$.diagnostic.shadowMode') IS NOT 1
    OR json_extract(NEW.result_json,'$.diagnostic.mutations') IS NOT 0
    OR typeof(NEW.request_count)<>'integer' OR NEW.request_count<0
    OR typeof(NEW.bytes_received)<>'integer' OR NEW.bytes_received<0
    OR typeof(NEW.item_count)<>'integer' OR NEW.item_count<0
    OR typeof(NEW.plausible_items)<>'integer' OR NEW.plausible_items<0
    OR typeof(NEW.duration_ms)<>'integer' OR NEW.duration_ms<0
    OR length(NEW.evidence_hash)<>64 OR NEW.evidence_hash GLOB '*[^0-9a-f]*';
  SELECT RAISE(ABORT, 'healthy observation requires the current probe contract and successful safety checks')
  WHERE NEW.outcome IN('HEALTHY_WITH_RESULTS','HEALTHY_EMPTY') AND (
    json_extract(NEW.result_json,'$.version') IS NOT '1.1.0'
    OR json_extract(NEW.result_json,'$.robots.checked') IS NOT 1
    OR json_extract(NEW.result_json,'$.robots.verdict') IS NOT 'allowed'
    OR json_extract(NEW.result_json,'$.robots.wouldBlock') IS NOT 0
    OR json_extract(NEW.result_json,'$.endpoint.isHttps') IS NOT 1
    OR json_extract(NEW.result_json,'$.endpoint.hostValid') IS NOT 1
    OR json_extract(NEW.result_json,'$.auth.class') IS NOT 'none'
    OR json_extract(NEW.result_json,'$.auth.supported') IS NOT 1
    OR json_extract(NEW.result_json,'$.visibility.isPublic') IS NOT 1
    OR json_extract(NEW.result_json,'$.visibility.ambiguous') IS NOT 0
    OR json_extract(NEW.result_json,'$.fetch.attempted') IS NOT 1
    OR json_type(NEW.result_json,'$.fetch.status') IS NOT 'integer'
    OR json_extract(NEW.result_json,'$.fetch.status') NOT BETWEEN 200 AND 299
    OR json_extract(NEW.result_json,'$.parse.attempted') IS NOT 1
    OR (json_extract(NEW.result_json,'$.parse.schemaHealth') IS NOT 'ok' AND json_extract(NEW.result_json,'$.parse.schemaHealth') IS NOT 'empty')
    OR (NEW.item_count=0 AND json_extract(NEW.result_json,'$.parse.schemaHealth') IS NOT 'empty')
    OR (NEW.item_count>0 AND json_extract(NEW.result_json,'$.parse.schemaHealth') IS NOT 'ok')
    OR (NEW.outcome='HEALTHY_WITH_RESULTS' AND NEW.plausible_items=0)
    OR (NEW.outcome='HEALTHY_EMPTY' AND NEW.plausible_items<>0)
    OR NEW.plausible_items>NEW.item_count
    OR NEW.request_count>2 OR NEW.bytes_received>1048576 OR NEW.item_count>200
  );
END;
