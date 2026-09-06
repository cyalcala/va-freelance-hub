-- SP-23B: immutable current evidence and revision-scoped admission.
-- This migration activates no source and schedules no dispatch. SP-23 remains
-- VERIFYING until the separate publication/rollback and real-source gates pass.
-- SHA-256 is verified by the trusted TypeScript evidence/observation recorder;
-- SQL independently enforces immutable identity, snapshots, scope, and races.
-- CASE expressions are parenthesized for D1's remote parser (workers-sdk#4727).

ALTER TABLE source_registry ADD COLUMN governance_revision INTEGER NOT NULL DEFAULT 1 CHECK (governance_revision BETWEEN 1 AND 9007199254740991);
ALTER TABLE provider_profiles ADD COLUMN governance_revision INTEGER NOT NULL DEFAULT 1 CHECK (governance_revision BETWEEN 1 AND 9007199254740991);
ALTER TABLE source_shadow_observations ADD COLUMN admission_evidence_id INTEGER;
ALTER TABLE source_shadow_observations ADD COLUMN shadow_entry_hash TEXT;
ALTER TABLE source_shadow_observations ADD COLUMN dispatch_key TEXT;

CREATE TABLE source_admission_evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT CHECK (id > 0),
  source_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  source_governance_revision INTEGER NOT NULL CHECK (source_governance_revision BETWEEN 1 AND 9007199254740991),
  provider_governance_revision INTEGER NOT NULL CHECK (provider_governance_revision BETWEEN 1 AND 9007199254740991),
  endpoint_url TEXT NOT NULL,
  policy_version TEXT NOT NULL CHECK (policy_version = 'sp23-shadow-7d-v1'),
  captured_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  adjudication_ref TEXT NOT NULL,
  packet_json TEXT NOT NULL CHECK (json_valid(packet_json)),
  packet_sha256 TEXT NOT NULL UNIQUE CHECK (length(packet_sha256)=64 AND packet_sha256 NOT GLOB '*[^0-9a-f]*'),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX source_admission_evidence_source_idx ON source_admission_evidence(source_id,id);
CREATE UNIQUE INDEX source_shadow_observations_dispatch_key_unique ON source_shadow_observations(dispatch_key) WHERE dispatch_key IS NOT NULL;
CREATE INDEX source_shadow_observations_admission_window_idx ON source_shadow_observations(admission_evidence_id,shadow_entry_hash,observed_at,id);

-- An explicit +1 bump is safe: it only invalidates old evidence. Decreases and
-- arbitrary resets are forbidden; material edits also bump atomically.
CREATE TRIGGER source_registry_governance_revision_monotonic
BEFORE UPDATE OF governance_revision ON source_registry
WHEN typeof(NEW.governance_revision) <> 'integer' OR (NEW.governance_revision IS NOT OLD.governance_revision AND NEW.governance_revision <> OLD.governance_revision + 1)
BEGIN SELECT RAISE(ABORT, 'governance revision may only advance by one'); END;
CREATE TRIGGER source_registry_governance_revision_bump
AFTER UPDATE OF provider_id,endpoint_url,company_token,compliance_state,opt_out,policy_expiry,canary_max_new_items_per_tick,discovery_provenance,review_deadline,display_name ON source_registry
WHEN NEW.provider_id IS NOT OLD.provider_id OR NEW.endpoint_url IS NOT OLD.endpoint_url OR NEW.company_token IS NOT OLD.company_token OR NEW.compliance_state IS NOT OLD.compliance_state OR NEW.opt_out IS NOT OLD.opt_out OR NEW.policy_expiry IS NOT OLD.policy_expiry OR NEW.canary_max_new_items_per_tick IS NOT OLD.canary_max_new_items_per_tick OR NEW.discovery_provenance IS NOT OLD.discovery_provenance OR NEW.review_deadline IS NOT OLD.review_deadline OR NEW.display_name IS NOT OLD.display_name
BEGIN UPDATE source_registry SET governance_revision=governance_revision+1 WHERE source_id=NEW.source_id; END;

-- An explicit +1 bump is safe: it only invalidates old evidence. Decreases and
-- arbitrary resets are forbidden; material edits also bump atomically.
CREATE TRIGGER provider_profiles_governance_revision_monotonic
BEFORE UPDATE OF governance_revision ON provider_profiles
WHEN typeof(NEW.governance_revision) <> 'integer' OR (NEW.governance_revision IS NOT OLD.governance_revision AND NEW.governance_revision <> OLD.governance_revision + 1)
BEGIN SELECT RAISE(ABORT, 'governance revision may only advance by one'); END;
CREATE TRIGGER provider_profiles_governance_revision_bump
AFTER UPDATE OF provider_family,mechanism,auth_class,endpoint_pattern,allowed_hosts,evidence_url,evidence_hash,evidence_captured_at,visibility_filter,content_scope,cadence_min_minutes,cadence_max_minutes,rate_guidance,robots_handling,removal_semantics,evidence_lease_days ON provider_profiles
WHEN NEW.provider_family IS NOT OLD.provider_family OR NEW.mechanism IS NOT OLD.mechanism OR NEW.auth_class IS NOT OLD.auth_class OR NEW.endpoint_pattern IS NOT OLD.endpoint_pattern OR NEW.allowed_hosts IS NOT OLD.allowed_hosts OR NEW.evidence_url IS NOT OLD.evidence_url OR NEW.evidence_hash IS NOT OLD.evidence_hash OR NEW.evidence_captured_at IS NOT OLD.evidence_captured_at OR NEW.visibility_filter IS NOT OLD.visibility_filter OR NEW.content_scope IS NOT OLD.content_scope OR NEW.cadence_min_minutes IS NOT OLD.cadence_min_minutes OR NEW.cadence_max_minutes IS NOT OLD.cadence_max_minutes OR NEW.rate_guidance IS NOT OLD.rate_guidance OR NEW.robots_handling IS NOT OLD.robots_handling OR NEW.removal_semantics IS NOT OLD.removal_semantics OR NEW.evidence_lease_days IS NOT OLD.evidence_lease_days
BEGIN UPDATE provider_profiles SET governance_revision=governance_revision+1 WHERE id=NEW.id; END;

CREATE TRIGGER provider_profiles_identity_is_immutable
BEFORE UPDATE OF id ON provider_profiles WHEN NEW.id IS NOT OLD.id
BEGIN SELECT RAISE(ABORT, 'provider identity is immutable'); END;
-- Ignore collisions once evidence exists: harmless INSERT OR IGNORE seeders
-- remain no-ops, and INSERT OR REPLACE cannot reset a governed provider.
CREATE TRIGGER provider_profiles_evidenced_identity_collision
BEFORE INSERT ON provider_profiles
WHEN EXISTS(SELECT 1 FROM source_admission_evidence WHERE provider_id=NEW.id)
BEGIN
  SELECT RAISE(ABORT, 'historical provider identity cannot be reused') WHERE NOT EXISTS(SELECT 1 FROM provider_profiles WHERE id=NEW.id);
  SELECT RAISE(IGNORE);
END;
CREATE TRIGGER source_registry_evidenced_identity_collision
BEFORE INSERT ON source_registry
WHEN EXISTS(SELECT 1 FROM source_admission_evidence WHERE source_id=NEW.source_id)
BEGIN SELECT RAISE(ABORT, 'evidenced source identity cannot be replaced or reused'); END;
CREATE TRIGGER source_admission_evidence_reject_identity_collision
BEFORE INSERT ON source_admission_evidence
BEGIN
  SELECT RAISE(ABORT, 'admission evidence id is SQLite-assigned') WHERE NEW.id > 0;
  SELECT RAISE(ABORT, 'admission evidence is immutable') WHERE EXISTS(SELECT 1 FROM source_admission_evidence WHERE packet_sha256=NEW.packet_sha256);
END;
CREATE TRIGGER source_admission_evidence_append_only_update BEFORE UPDATE ON source_admission_evidence
BEGIN SELECT RAISE(ABORT, 'admission evidence is append-only'); END;
CREATE TRIGGER source_admission_evidence_append_only_delete BEFORE DELETE ON source_admission_evidence
BEGIN SELECT RAISE(ABORT, 'admission evidence is append-only'); END;

CREATE TRIGGER source_admission_evidence_validate_insert
BEFORE INSERT ON source_admission_evidence
BEGIN
  SELECT RAISE(ABORT, 'evidence capture and lease must be current canonical UTC instants')
  WHERE NOT (length(NEW.captured_at) = 24 AND NEW.captured_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z' AND substr(NEW.captured_at,12,2) BETWEEN '00' AND '23' AND strftime('%Y-%m-%dT%H:%M:%fZ',NEW.captured_at) IS NEW.captured_at) OR NOT (length(NEW.expires_at) = 24 AND NEW.expires_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z' AND substr(NEW.expires_at,12,2) BETWEEN '00' AND '23' AND strftime('%Y-%m-%dT%H:%M:%fZ',NEW.expires_at) IS NEW.expires_at)
    OR abs(julianday(NEW.captured_at)-julianday('now')) > 5.0/1440
    OR julianday(NEW.expires_at) <= julianday('now') OR julianday(NEW.expires_at) <= julianday(NEW.captured_at);
  SELECT RAISE(ABORT, 'evidence packet fields do not match its immutable row')
  WHERE json_extract(NEW.packet_json,'$.version') IS NOT 'sp23-evidence-v1'
    OR json_extract(NEW.packet_json,'$.policyVersion') IS NOT NEW.policy_version
    OR json_extract(NEW.packet_json,'$.capturedAt') IS NOT NEW.captured_at
    OR json_extract(NEW.packet_json,'$.expiresAt') IS NOT NEW.expires_at
    OR json_extract(NEW.packet_json,'$.adjudicationRef') IS NOT NEW.adjudication_ref
    OR length(trim(NEW.adjudication_ref))=0 OR instr(NEW.adjudication_ref,char(0))>0;
  SELECT RAISE(ABORT, 'evidence requires primary references and bounded recorded authority')
  WHERE json_type(NEW.packet_json,'$.primaryEvidence') IS NOT 'array'
    OR json_array_length(NEW.packet_json,'$.primaryEvidence') < 1
    OR EXISTS(SELECT 1 FROM json_each(NEW.packet_json,'$.primaryEvidence') WHERE
      json_type(value,'$.url') IS NOT 'text' OR json_extract(value,'$.url') NOT LIKE 'https://%'
      OR json_type(value,'$.contentSha256') IS NOT 'text' OR length(json_extract(value,'$.contentSha256'))<>64
      OR json_extract(value,'$.contentSha256') GLOB '*[^0-9a-f]*'
      OR json_type(value,'$.capturedAt') IS NOT 'text' OR julianday(json_extract(value,'$.capturedAt')) IS NULL
      OR NOT (length(json_extract(value,'$.capturedAt')) = 24 AND json_extract(value,'$.capturedAt') GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z' AND substr(json_extract(value,'$.capturedAt'),12,2) BETWEEN '00' AND '23' AND strftime('%Y-%m-%dT%H:%M:%fZ',json_extract(value,'$.capturedAt')) IS json_extract(value,'$.capturedAt'))
      OR julianday(json_extract(value,'$.capturedAt'))>julianday(NEW.captured_at))
    OR json_type(NEW.packet_json,'$.authorityActions') IS NOT 'array'
    OR NOT EXISTS(SELECT 1 FROM json_each(NEW.packet_json,'$.authorityActions') WHERE value='recurrent_private_shadow')
    OR EXISTS(SELECT 1 FROM json_each(NEW.packet_json,'$.authorityActions') WHERE type<>'text' OR value NOT IN('recurrent_private_shadow','public_minimal_metadata_canary'));
  SELECT RAISE(ABORT, 'admission evidence must bind the current eligible source and provider snapshots')
  WHERE NOT EXISTS(
    SELECT 1 FROM source_registry s JOIN provider_profiles p ON p.id=s.provider_id
    WHERE s.source_id=NEW.source_id AND p.id=NEW.provider_id
      AND s.governance_revision=NEW.source_governance_revision AND p.governance_revision=NEW.provider_governance_revision
      AND s.endpoint_url=NEW.endpoint_url
      AND json_extract(NEW.packet_json,'$.source') IS json_object('sourceId', s.source_id, 'providerId', s.provider_id, 'endpointUrl', s.endpoint_url, 'companyToken', s.company_token, 'complianceState', s.compliance_state, 'policyExpiry', s.policy_expiry, 'canaryMaxNewItemsPerTick', s.canary_max_new_items_per_tick, 'optOut', json(IIF(s.opt_out <> 0, 'true', 'false')), 'governanceRevision', s.governance_revision)
      AND json_extract(NEW.packet_json,'$.provider') IS json_object('id', p.id, 'providerFamily', p.provider_family, 'mechanism', p.mechanism, 'authClass', p.auth_class, 'endpointPattern', p.endpoint_pattern, 'allowedHosts', p.allowed_hosts, 'evidenceUrl', p.evidence_url, 'evidenceHash', p.evidence_hash, 'evidenceCapturedAt', p.evidence_captured_at, 'visibilityFilter', p.visibility_filter, 'contentScope', p.content_scope, 'cadenceMinMinutes', p.cadence_min_minutes, 'cadenceMaxMinutes', p.cadence_max_minutes, 'rateGuidance', p.rate_guidance, 'robotsHandling', p.robots_handling, 'removalSemantics', p.removal_semantics, 'evidenceLeaseDays', p.evidence_lease_days, 'governanceRevision', p.governance_revision)
      AND s.compliance_state IN('allowed','conditional') AND s.opt_out=0
      AND NOT EXISTS(SELECT 1 FROM source_opt_outs WHERE source_id=s.source_id)
      AND p.auth_class='none' AND p.visibility_filter IN('published','listed','public','indexable')
      AND p.content_scope IN('minimal','metadata_only')
      AND p.cadence_min_minutes>0 AND p.cadence_max_minutes>=p.cadence_min_minutes
      AND p.allowed_hosts IS NOT NULL AND length(trim(p.allowed_hosts))>0
      AND p.evidence_url LIKE 'https://%' AND length(trim(p.removal_semantics))>0 AND length(trim(p.robots_handling))>0
      AND (length(s.policy_expiry) = 24 AND s.policy_expiry GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z' AND substr(s.policy_expiry,12,2) BETWEEN '00' AND '23' AND strftime('%Y-%m-%dT%H:%M:%fZ',s.policy_expiry) IS s.policy_expiry) AND julianday(s.policy_expiry)>=julianday(NEW.expires_at)
      AND (length(p.evidence_captured_at) = 24 AND p.evidence_captured_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z' AND substr(p.evidence_captured_at,12,2) BETWEEN '00' AND '23' AND strftime('%Y-%m-%dT%H:%M:%fZ',p.evidence_captured_at) IS p.evidence_captured_at) AND julianday(p.evidence_captured_at)<=julianday(NEW.captured_at)
      AND julianday(p.evidence_captured_at)+p.evidence_lease_days>=julianday(NEW.expires_at)
      AND EXISTS(SELECT 1 FROM json_each(NEW.packet_json,'$.primaryEvidence')
        WHERE json_extract(value,'$.url')=p.evidence_url AND json_extract(value,'$.contentSha256')=p.evidence_hash)
  );
  SELECT RAISE(ABORT, 'admission evidence probe must match source scope and pass non-public safety checks')
  WHERE json_extract(NEW.packet_json,'$.probe.version') IS NOT '1.1.0'
    OR json_extract(NEW.packet_json,'$.probe.sourceId') IS NOT NEW.source_id
    OR json_extract(NEW.packet_json,'$.probe.providerId') IS NOT NEW.provider_id
    OR json_extract(NEW.packet_json,'$.probe.endpoint.url') IS NOT NEW.endpoint_url
    OR json_extract(NEW.packet_json,'$.probe.endpoint.isHttps') IS NOT 1
    OR json_extract(NEW.packet_json,'$.probe.endpoint.hostValid') IS NOT 1
    OR json_extract(NEW.packet_json,'$.probe.auth.class') IS NOT 'none'
    OR json_extract(NEW.packet_json,'$.probe.auth.supported') IS NOT 1
    OR json_extract(NEW.packet_json,'$.probe.visibility.isPublic') IS NOT 1
    OR json_extract(NEW.packet_json,'$.probe.visibility.ambiguous') IS NOT 0
    OR json_extract(NEW.packet_json,'$.probe.robots.checked') IS NOT 1
    OR json_extract(NEW.packet_json,'$.probe.robots.wouldBlock') IS NOT 0
    OR json_extract(NEW.packet_json,'$.probe.robots.verdict') IS NOT 'allowed'
    OR json_extract(NEW.packet_json,'$.probe.fetch.attempted') IS NOT 1
    OR json_type(NEW.packet_json,'$.probe.fetch.status') IS NOT 'integer'
    OR json_extract(NEW.packet_json,'$.probe.fetch.status') NOT BETWEEN 200 AND 299
    OR json_extract(NEW.packet_json,'$.probe.parse.attempted') IS NOT 1
    OR (json_extract(NEW.packet_json,'$.probe.parse.schemaHealth') IS NOT 'ok' AND json_extract(NEW.packet_json,'$.probe.parse.schemaHealth') IS NOT 'empty')
    OR (json_extract(NEW.packet_json,'$.probe.diagnostic.outcome') IS NOT 'HEALTHY_WITH_RESULTS' AND json_extract(NEW.packet_json,'$.probe.diagnostic.outcome') IS NOT 'HEALTHY_EMPTY')
    OR json_extract(NEW.packet_json,'$.probe.diagnostic.shadowMode') IS NOT 1
    OR json_extract(NEW.packet_json,'$.probe.diagnostic.mutations') IS NOT 0;
END;

-- Every newly persisted observation is bound; legacy nullable rows are retained
-- as history, never inferred into a newer evidence/epoch window.
CREATE TRIGGER source_shadow_observations_admission_insert
BEFORE INSERT ON source_shadow_observations
BEGIN
  SELECT RAISE(ABORT, 'observation requires a unique dispatch and current admission context')
  WHERE NEW.admission_evidence_id IS NULL OR NEW.shadow_entry_hash IS NULL
    OR NEW.dispatch_key IS NULL OR length(trim(NEW.dispatch_key))=0 OR instr(NEW.dispatch_key,char(0))>0
    OR EXISTS(SELECT 1 FROM source_shadow_observations WHERE dispatch_key=NEW.dispatch_key);
  SELECT RAISE(ABORT, 'observation timestamp must be current canonical UTC')
  WHERE NOT (length(NEW.observed_at) = 24 AND NEW.observed_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z' AND substr(NEW.observed_at,12,2) BETWEEN '00' AND '23' AND strftime('%Y-%m-%dT%H:%M:%fZ',NEW.observed_at) IS NEW.observed_at) OR abs(julianday(NEW.observed_at)-julianday('now'))>5.0/1440;
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
    OR NEW.request_count>2 OR NEW.bytes_received>524288 OR NEW.item_count>200
  );
END;
CREATE TRIGGER source_shadow_observations_append_only_update BEFORE UPDATE ON source_shadow_observations
BEGIN SELECT RAISE(ABORT, 'shadow observations are append-only'); END;
CREATE TRIGGER source_shadow_observations_append_only_delete BEFORE DELETE ON source_shadow_observations
BEGIN SELECT RAISE(ABORT, 'shadow observations are append-only'); END;

-- Retain v1's lifecycle/atomicity rules, but extend canonical input for v2.
-- The independent admission guard below prevents old v1 promotion bypass.
DROP TRIGGER source_transition_events_validate_insert;
CREATE TRIGGER IF NOT EXISTS source_transition_events_validate_insert
BEFORE INSERT ON source_transition_events
FOR EACH ROW
BEGIN
  SELECT (CASE WHEN NEW.transition_plane_version NOT IN ('sp23-v1','sp23-v2')
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
  SELECT (CASE WHEN (CASE WHEN NEW.transition_plane_version='sp23-v2' THEN json_remove(NEW.input_json,'$.admission') ELSE NEW.input_json END) IS NOT (
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


CREATE VIEW source_admission_current_evidence AS
SELECT e.* FROM source_admission_evidence e
JOIN source_registry s ON s.source_id=e.source_id
JOIN provider_profiles p ON p.id=e.provider_id
WHERE e.id=(SELECT MAX(latest.id) FROM source_admission_evidence latest WHERE latest.source_id=s.source_id)
  AND s.provider_id=p.id AND s.endpoint_url=e.endpoint_url
  AND s.governance_revision=e.source_governance_revision AND p.governance_revision=e.provider_governance_revision
  AND s.compliance_state IN('allowed','conditional') AND s.opt_out=0
  AND NOT EXISTS(SELECT 1 FROM source_opt_outs WHERE source_id=s.source_id)
  AND julianday(e.expires_at)>julianday('now') AND julianday(s.policy_expiry)>julianday('now');

-- One representative per healthy UTC day. Repeated responses on different
-- days remain valid; duplicate attempts never manufacture the required span.
CREATE VIEW source_admission_qualifying_observations AS
SELECT o.* FROM source_shadow_observations o
JOIN source_admission_current_evidence e ON e.id=o.admission_evidence_id
JOIN source_registry s ON s.source_id=e.source_id
WHERE s.operational_state='shadow' AND o.shadow_entry_hash=s.last_transition_hash
  AND o.source_id=e.source_id AND o.provider_id=e.provider_id
  AND o.outcome IN('HEALTHY_WITH_RESULTS','HEALTHY_EMPTY')
  AND julianday(o.observed_at)>=julianday(e.captured_at)
  AND julianday(o.observed_at)>=julianday('now')-14 AND julianday(o.observed_at)<=julianday('now')
  AND o.id=(SELECT MIN(day.id) FROM source_shadow_observations day
    WHERE day.admission_evidence_id=o.admission_evidence_id AND day.shadow_entry_hash=o.shadow_entry_hash
      AND day.outcome IN('HEALTHY_WITH_RESULTS','HEALTHY_EMPTY')
      AND substr(day.observed_at,1,10)=substr(o.observed_at,1,10)
      AND julianday(day.observed_at)>=julianday(e.captured_at)
      AND julianday(day.observed_at)>=julianday('now')-14 AND julianday(day.observed_at)<=julianday('now'));

CREATE TRIGGER source_transition_events_current_admission_guard
BEFORE INSERT ON source_transition_events
BEGIN
  SELECT RAISE(ABORT, 'active promotion is disabled until the SP-23C exposure gate exists')
  WHERE NEW.cause='requested_promotion' AND NEW.to_operational='active';
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
      AND (NEW.to_operational<>'canary' OR EXISTS(SELECT 1 FROM json_each(e.packet_json,'$.authorityActions') WHERE value='public_minimal_metadata_canary'))
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
