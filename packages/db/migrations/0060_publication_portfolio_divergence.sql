-- Ledger book versus live serving book. Records disagreement.
-- This grants no source, blocks no writer, and adds no julianday('now').
-- A matching pair is agreement. A missing table fails open.

CREATE TABLE source_publication_portfolio_divergence (
  id INTEGER PRIMARY KEY AUTOINCREMENT CHECK (id > 0),
  source_id TEXT NOT NULL CHECK (typeof(source_id) = 'text' AND length(source_id) > 0 AND instr(source_id, char(0)) = 0),
  tick_key TEXT NOT NULL CHECK (length(tick_key) > 0 AND instr(tick_key, char(0)) = 0),
  retry_key TEXT NOT NULL UNIQUE CHECK (length(retry_key) > 0 AND instr(retry_key, char(0)) = 0),
  published_count INTEGER NOT NULL CHECK (typeof(published_count) = 'integer' AND published_count > 0 AND published_count <= 9007199254740991),
  ledger_source_status TEXT NOT NULL CHECK (ledger_source_status IN ('OK', 'BREACH', 'UNKNOWN')),
  ledger_family_status TEXT NOT NULL CHECK (ledger_family_status IN ('OK', 'BREACH', 'UNKNOWN')),
  serving_source_status TEXT NOT NULL CHECK (serving_source_status IN ('OK', 'BREACH', 'UNKNOWN')),
  serving_family_status TEXT NOT NULL CHECK (serving_family_status IN ('OK', 'BREACH', 'UNKNOWN')),
  source_status_agrees INTEGER NOT NULL CHECK (source_status_agrees IN (0, 1)),
  family_status_agrees INTEGER NOT NULL CHECK (family_status_agrees IN (0, 1)),
  recorded_at TEXT NOT NULL CHECK (
    typeof(recorded_at) = 'text'
    AND length(recorded_at) = 24
    AND instr(recorded_at, char(0)) = 0
    AND substr(recorded_at, 12, 2) BETWEEN '00' AND '23'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', recorded_at) IS recorded_at
  ),
  CHECK (
    (source_status_agrees = 1 AND ledger_source_status = serving_source_status)
    OR (source_status_agrees = 0 AND ledger_source_status != serving_source_status)
  ),
  CHECK (
    (family_status_agrees = 1 AND ledger_family_status = serving_family_status)
    OR (family_status_agrees = 0 AND ledger_family_status != serving_family_status)
  )
);

CREATE TRIGGER source_publication_portfolio_divergence_reject_caller_id
BEFORE INSERT ON source_publication_portfolio_divergence
WHEN NEW.id > 0
BEGIN SELECT RAISE(ABORT, 'publication portfolio divergence id is SQLite-assigned'); END;

CREATE TRIGGER source_publication_portfolio_divergence_append_only_update
BEFORE UPDATE ON source_publication_portfolio_divergence
BEGIN SELECT RAISE(ABORT, 'publication portfolio divergence is append-only'); END;

CREATE TRIGGER source_publication_portfolio_divergence_append_only_delete
BEFORE DELETE ON source_publication_portfolio_divergence
BEGIN SELECT RAISE(ABORT, 'publication portfolio divergence is append-only'); END;
