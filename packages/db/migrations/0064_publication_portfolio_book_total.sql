-- Ledger book total versus serving book total. Status agreement is not equality.
-- This grants no source, blocks no writer, and adds no julianday('now').

CREATE TABLE source_publication_portfolio_book_total (
  id INTEGER PRIMARY KEY AUTOINCREMENT CHECK (id > 0),
  source_id TEXT NOT NULL CHECK (typeof(source_id) = 'text' AND length(source_id) > 0 AND instr(source_id, char(0)) = 0),
  tick_key TEXT NOT NULL CHECK (length(tick_key) > 0 AND instr(tick_key, char(0)) = 0),
  retry_key TEXT NOT NULL UNIQUE CHECK (length(retry_key) > 0 AND instr(retry_key, char(0)) = 0),
  ledger_book_total INTEGER NOT NULL CHECK (
    typeof(ledger_book_total) = 'integer'
    AND ledger_book_total >= 1
    AND ledger_book_total <= 9007199254740991
  ),
  serving_book_total INTEGER NOT NULL CHECK (
    typeof(serving_book_total) = 'integer'
    AND serving_book_total >= 1
    AND serving_book_total <= 9007199254740991
  ),
  totals_differ INTEGER NOT NULL CHECK (totals_differ IN (0, 1)),
  recorded_at TEXT NOT NULL CHECK (
    typeof(recorded_at) = 'text'
    AND length(recorded_at) = 24
    AND instr(recorded_at, char(0)) = 0
    AND substr(recorded_at, 12, 2) BETWEEN '00' AND '23'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', recorded_at) IS recorded_at
  ),
  CHECK (
    (totals_differ = 1 AND ledger_book_total != serving_book_total)
    OR (totals_differ = 0 AND ledger_book_total = serving_book_total)
  )
);

CREATE TRIGGER source_publication_portfolio_book_total_reject_caller_id
BEFORE INSERT ON source_publication_portfolio_book_total
WHEN NEW.id > 0
BEGIN SELECT RAISE(ABORT, 'publication portfolio book total id is SQLite-assigned'); END;

CREATE TRIGGER source_publication_portfolio_book_total_append_only_update
BEFORE UPDATE ON source_publication_portfolio_book_total
BEGIN SELECT RAISE(ABORT, 'publication portfolio book total is append-only'); END;

CREATE TRIGGER source_publication_portfolio_book_total_append_only_delete
BEFORE DELETE ON source_publication_portfolio_book_total
BEGIN SELECT RAISE(ABORT, 'publication portfolio book total is append-only'); END;
