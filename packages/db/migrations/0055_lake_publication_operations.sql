-- Private publication intent only. No opportunities, publication receipts,
-- source authority, clocks, or candidate acquisition bodies are changed.
CREATE TABLE IF NOT EXISTS lake_publication_operations (
  operation_key TEXT PRIMARY KEY NOT NULL CHECK(length(operation_key) BETWEEN 1 AND 128 AND instr(operation_key,char(0))=0),
  source_id TEXT NOT NULL CHECK(length(source_id) BETWEEN 1 AND 200 AND instr(source_id,char(0))=0),
  manifest_hash TEXT NOT NULL CHECK(length(manifest_hash)=64 AND instr(manifest_hash,char(0))=0 AND manifest_hash NOT GLOB '*[^0-9a-f]*'),
  candidate_descriptors_json TEXT NOT NULL CHECK(json_valid(candidate_descriptors_json)
    AND json_type(candidate_descriptors_json)='array' AND json_array_length(candidate_descriptors_json) BETWEEN 1 AND 200
    AND length(CAST(candidate_descriptors_json AS BLOB))<=262144),
  staged_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    CHECK(length(staged_at)=24 AND substr(staged_at,24,1)='Z'
      AND strftime('%Y-%m-%dT%H:%M:%fZ',staged_at,'+0 seconds') IS NOT NULL
      AND strftime('%Y-%m-%dT%H:%M:%fZ',staged_at,'+0 seconds')=staged_at),
  revision INTEGER NOT NULL DEFAULT 0 CHECK(typeof(revision)='integer' AND revision BETWEEN 0 AND 9007199254740991),
  -- Assigned by a future verified publication commit, never by staging/client input.
  source_identity_hash TEXT CHECK(source_identity_hash IS NULL OR
    (length(source_identity_hash)=64 AND instr(source_identity_hash,char(0))=0 AND source_identity_hash NOT GLOB '*[^0-9a-f]*')),
  publication_tick_key TEXT CHECK(publication_tick_key IS NULL OR
    (length(publication_tick_key) BETWEEN 1 AND 256 AND instr(publication_tick_key,char(0))=0)),
  committed_receipt_key TEXT UNIQUE CHECK(committed_receipt_key IS NULL OR
    (length(committed_receipt_key) BETWEEN 1 AND 512 AND instr(committed_receipt_key,char(0))=0)),
  committed_outcomes_json TEXT CHECK(committed_outcomes_json IS NULL OR
    (json_valid(committed_outcomes_json) AND json_type(committed_outcomes_json)='array'
      AND length(CAST(committed_outcomes_json AS BLOB))<=262144)),
  CHECK((committed_receipt_key IS NULL)=(committed_outcomes_json IS NULL)),
  CHECK(committed_receipt_key IS NULL OR (source_identity_hash IS NOT NULL AND publication_tick_key IS NOT NULL))
);

CREATE TRIGGER IF NOT EXISTS lake_publication_descriptors_guard
BEFORE INSERT ON lake_publication_operations
BEGIN
  SELECT (CASE WHEN EXISTS (
    SELECT 1 FROM json_each(NEW.candidate_descriptors_json) d
    WHERE json_type(d.value) IS NOT 'object'
      OR (SELECT COUNT(*) FROM json_each(d.value))<>4
      OR EXISTS (SELECT 1 FROM json_each(d.value) f WHERE f.key NOT IN
        ('lakeCandidateId','lakeFingerprint','sourceUrl','materialSha256'))
      OR json_type(d.value,'$.lakeCandidateId') IS NOT 'integer'
      OR json_extract(d.value,'$.lakeCandidateId') NOT BETWEEN 1 AND 9007199254740991
      OR json_type(d.value,'$.lakeFingerprint') IS NOT 'text'
      OR length(json_extract(d.value,'$.lakeFingerprint')) NOT BETWEEN 1 AND 128
      OR instr(json_extract(d.value,'$.lakeFingerprint'),char(0))<>0
      OR json_type(d.value,'$.sourceUrl') IS NOT 'text'
      OR length(json_extract(d.value,'$.sourceUrl')) NOT BETWEEN 1 AND 2048
      OR instr(json_extract(d.value,'$.sourceUrl'),char(0))<>0
      OR json_type(d.value,'$.materialSha256') IS NOT 'text'
      OR length(json_extract(d.value,'$.materialSha256'))<>64
      OR instr(json_extract(d.value,'$.materialSha256'),char(0))<>0
      OR json_extract(d.value,'$.materialSha256') GLOB '*[^0-9a-f]*'
  ) THEN RAISE(ABORT,'invalid private lake descriptors') END);
END;

CREATE TRIGGER IF NOT EXISTS lake_publication_operation_immutable
BEFORE UPDATE ON lake_publication_operations
WHEN NEW.operation_key IS NOT OLD.operation_key OR NEW.source_id IS NOT OLD.source_id
  OR NEW.manifest_hash IS NOT OLD.manifest_hash OR NEW.candidate_descriptors_json IS NOT OLD.candidate_descriptors_json
  OR NEW.staged_at IS NOT OLD.staged_at OR NEW.revision<>OLD.revision+1
  OR (OLD.source_identity_hash IS NOT NULL AND NEW.source_identity_hash IS NOT OLD.source_identity_hash)
  OR (OLD.publication_tick_key IS NOT NULL AND NEW.publication_tick_key IS NOT OLD.publication_tick_key)
  OR (OLD.committed_receipt_key IS NOT NULL AND NEW.committed_receipt_key IS NOT OLD.committed_receipt_key)
  OR (OLD.committed_outcomes_json IS NOT NULL AND NEW.committed_outcomes_json IS NOT OLD.committed_outcomes_json)
  OR (NEW.committed_receipt_key IS NOT NULL AND EXISTS(SELECT 1 FROM lake_publication_operations
    WHERE committed_receipt_key=NEW.committed_receipt_key AND operation_key<>OLD.operation_key))
BEGIN SELECT RAISE(ABORT,'immutable lake operation or stale revision'); END;

-- REPLACE performs a delete/insert, so an UPDATE guard alone is insufficient.
-- Ignore an exact material retry before REPLACE can erase the original controls.
CREATE TRIGGER IF NOT EXISTS lake_publication_operation_insert_immutable
BEFORE INSERT ON lake_publication_operations
WHEN EXISTS(SELECT 1 FROM lake_publication_operations WHERE operation_key=NEW.operation_key)
  OR (NEW.committed_receipt_key IS NOT NULL AND EXISTS(SELECT 1 FROM lake_publication_operations
    WHERE committed_receipt_key=NEW.committed_receipt_key))
BEGIN
  SELECT (CASE WHEN EXISTS(SELECT 1 FROM lake_publication_operations
    WHERE operation_key=NEW.operation_key AND source_id=NEW.source_id
      AND manifest_hash=NEW.manifest_hash AND candidate_descriptors_json=NEW.candidate_descriptors_json)
    THEN 1 ELSE RAISE(ABORT,'immutable lake operation manifest') END);
  SELECT RAISE(IGNORE);
END;

CREATE TRIGGER IF NOT EXISTS lake_publication_operation_no_delete
BEFORE DELETE ON lake_publication_operations
BEGIN SELECT RAISE(ABORT,'lake operation identity must be retained'); END;
