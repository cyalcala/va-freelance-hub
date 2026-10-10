-- Durable marker for a publication whose row write was followed by an
-- unconfirmed ledger acknowledgement. This table grants no source permission,
-- withdraws nothing by itself, and does not treat ledger-less history as failed.

CREATE TABLE IF NOT EXISTS publication_outcome_uncertainty (
  id INTEGER PRIMARY KEY AUTOINCREMENT CHECK (id > 0),
  source_id TEXT NOT NULL CHECK (typeof(source_id) = 'text' AND length(source_id) > 0 AND instr(source_id, char(0)) = 0),
  tick_key TEXT NOT NULL CHECK (length(tick_key) > 0 AND instr(tick_key, char(0)) = 0),
  retry_key TEXT NOT NULL UNIQUE CHECK (length(retry_key) > 0 AND instr(retry_key, char(0)) = 0),
  opportunity_ids_json TEXT NOT NULL CHECK (
    json_valid(opportunity_ids_json)
    AND json_type(opportunity_ids_json) = 'array'
    AND json_array_length(opportunity_ids_json) >= 1
  ),
  reason TEXT NOT NULL CHECK (reason = 'ledger-acknowledgement-unconfirmed'),
  recorded_at TEXT NOT NULL CHECK (
    length(recorded_at) = 24
    AND substr(recorded_at, 24, 1) = 'Z'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', recorded_at) = recorded_at
  )
);

CREATE TRIGGER IF NOT EXISTS publication_outcome_uncertainty_reject_caller_id
BEFORE INSERT ON publication_outcome_uncertainty
WHEN NEW.id > 0
BEGIN SELECT RAISE(ABORT, 'uncertainty id is SQLite-assigned'); END;

CREATE TRIGGER IF NOT EXISTS publication_outcome_uncertainty_append_only_update
BEFORE UPDATE ON publication_outcome_uncertainty
BEGIN SELECT RAISE(ABORT, 'publication uncertainty is append-only'); END;

CREATE TRIGGER IF NOT EXISTS publication_outcome_uncertainty_append_only_delete
BEFORE DELETE ON publication_outcome_uncertainty
BEGIN SELECT RAISE(ABORT, 'publication uncertainty is append-only'); END;
