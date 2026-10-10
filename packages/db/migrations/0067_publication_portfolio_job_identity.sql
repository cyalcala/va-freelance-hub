-- Named ledger receipt ids versus serving ids. Equal counts are not the same jobs.
-- An unnamed receipt stays unknown. This grants no source, blocks no writer,
-- and adds no julianday('now').

CREATE TABLE source_publication_portfolio_job_identity (
  id INTEGER PRIMARY KEY AUTOINCREMENT CHECK (id > 0),
  source_id TEXT NOT NULL CHECK (typeof(source_id) = 'text' AND length(source_id) > 0 AND instr(source_id, char(0)) = 0),
  tick_key TEXT NOT NULL CHECK (length(tick_key) > 0 AND instr(tick_key, char(0)) = 0),
  retry_key TEXT NOT NULL UNIQUE CHECK (length(retry_key) > 0 AND instr(retry_key, char(0)) = 0),
  ledger_ids_json TEXT NOT NULL CHECK (
    typeof(ledger_ids_json) = 'text'
    AND json_valid(ledger_ids_json)
    AND json_type(ledger_ids_json) = 'array'
  ),
  serving_ids_json TEXT NOT NULL CHECK (
    typeof(serving_ids_json) = 'text'
    AND json_valid(serving_ids_json)
    AND json_type(serving_ids_json) = 'array'
  ),
  ids_known INTEGER NOT NULL CHECK (ids_known IN (0, 1)),
  ids_differ INTEGER NOT NULL CHECK (ids_differ IN (0, 1)),
  recorded_at TEXT NOT NULL CHECK (
    typeof(recorded_at) = 'text'
    AND length(recorded_at) = 24
    AND instr(recorded_at, char(0)) = 0
    AND substr(recorded_at, 12, 2) BETWEEN '00' AND '23'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', recorded_at) IS recorded_at
  ),
  CHECK (
    (ids_known = 0 AND ids_differ = 0)
    OR (ids_known = 1 AND ids_differ = 1 AND ledger_ids_json != serving_ids_json)
    OR (ids_known = 1 AND ids_differ = 0 AND ledger_ids_json = serving_ids_json)
  )
);

CREATE TRIGGER source_publication_portfolio_job_identity_reject_caller_id
BEFORE INSERT ON source_publication_portfolio_job_identity
WHEN NEW.id > 0
BEGIN SELECT RAISE(ABORT, 'publication portfolio job identity id is SQLite-assigned'); END;

CREATE TRIGGER source_publication_portfolio_job_identity_append_only_update
BEFORE UPDATE ON source_publication_portfolio_job_identity
BEGIN SELECT RAISE(ABORT, 'publication portfolio job identity is append-only'); END;

CREATE TRIGGER source_publication_portfolio_job_identity_append_only_delete
BEFORE DELETE ON source_publication_portfolio_job_identity
BEGIN SELECT RAISE(ABORT, 'publication portfolio job identity is append-only'); END;
