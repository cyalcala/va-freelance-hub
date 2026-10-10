-- Ledger source set versus serving source set. Equal totals are not the same book.
-- This grants no source, blocks no writer, and adds no julianday('now').

CREATE TABLE source_publication_portfolio_book_membership (
  id INTEGER PRIMARY KEY AUTOINCREMENT CHECK (id > 0),
  source_id TEXT NOT NULL CHECK (typeof(source_id) = 'text' AND length(source_id) > 0 AND instr(source_id, char(0)) = 0),
  tick_key TEXT NOT NULL CHECK (length(tick_key) > 0 AND instr(tick_key, char(0)) = 0),
  retry_key TEXT NOT NULL UNIQUE CHECK (length(retry_key) > 0 AND instr(retry_key, char(0)) = 0),
  ledger_sources_json TEXT NOT NULL CHECK (
    typeof(ledger_sources_json) = 'text'
    AND json_valid(ledger_sources_json)
    AND json_type(ledger_sources_json) = 'array'
    AND json_array_length(ledger_sources_json) >= 1
  ),
  serving_sources_json TEXT NOT NULL CHECK (
    typeof(serving_sources_json) = 'text'
    AND json_valid(serving_sources_json)
    AND json_type(serving_sources_json) = 'array'
    AND json_array_length(serving_sources_json) >= 1
  ),
  sets_differ INTEGER NOT NULL CHECK (sets_differ IN (0, 1)),
  recorded_at TEXT NOT NULL CHECK (
    typeof(recorded_at) = 'text'
    AND length(recorded_at) = 24
    AND instr(recorded_at, char(0)) = 0
    AND substr(recorded_at, 12, 2) BETWEEN '00' AND '23'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', recorded_at) IS recorded_at
  ),
  CHECK (
    (sets_differ = 1 AND ledger_sources_json != serving_sources_json)
    OR (sets_differ = 0 AND ledger_sources_json = serving_sources_json)
  )
);

CREATE TRIGGER source_publication_portfolio_book_membership_reject_caller_id
BEFORE INSERT ON source_publication_portfolio_book_membership
WHEN NEW.id > 0
BEGIN SELECT RAISE(ABORT, 'publication portfolio book membership id is SQLite-assigned'); END;

CREATE TRIGGER source_publication_portfolio_book_membership_append_only_update
BEFORE UPDATE ON source_publication_portfolio_book_membership
BEGIN SELECT RAISE(ABORT, 'publication portfolio book membership is append-only'); END;

CREATE TRIGGER source_publication_portfolio_book_membership_append_only_delete
BEFORE DELETE ON source_publication_portfolio_book_membership
BEGIN SELECT RAISE(ABORT, 'publication portfolio book membership is append-only'); END;
