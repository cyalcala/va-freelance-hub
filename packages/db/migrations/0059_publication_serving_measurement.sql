-- Live public serving exposure. Counts active Philippines-eligible rows.
-- This grants no source, blocks no writer, and adds no julianday('now').
-- A withdrawn row stays in the ledger book and leaves this book.

CREATE TABLE source_publication_serving_measurement (
  id INTEGER PRIMARY KEY AUTOINCREMENT CHECK (id > 0),
  source_id TEXT NOT NULL CHECK (typeof(source_id) = 'text' AND length(source_id) > 0 AND instr(source_id, char(0)) = 0),
  tick_key TEXT NOT NULL CHECK (length(tick_key) > 0 AND instr(tick_key, char(0)) = 0),
  retry_key TEXT NOT NULL UNIQUE CHECK (length(retry_key) > 0 AND instr(retry_key, char(0)) = 0),
  published_count INTEGER NOT NULL CHECK (typeof(published_count) = 'integer' AND published_count > 0 AND published_count <= 9007199254740991),
  book_total INTEGER NOT NULL CHECK (typeof(book_total) = 'integer' AND book_total > 0 AND book_total <= 9007199254740991),
  source_share_status TEXT NOT NULL CHECK (source_share_status IN ('OK', 'BREACH', 'UNKNOWN')),
  family_share_status TEXT NOT NULL CHECK (family_share_status IN ('OK', 'BREACH', 'UNKNOWN')),
  top_source_id TEXT,
  top_source_share REAL,
  top_family_id TEXT,
  top_family_share REAL,
  recorded_at TEXT NOT NULL CHECK (
    typeof(recorded_at) = 'text'
    AND length(recorded_at) = 24
    AND instr(recorded_at, char(0)) = 0
    AND substr(recorded_at, 12, 2) BETWEEN '00' AND '23'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', recorded_at) IS recorded_at
  ),
  CHECK (
    (source_share_status = 'UNKNOWN' AND top_source_id IS NULL AND top_source_share IS NULL)
    OR (
      source_share_status IN ('OK', 'BREACH')
      AND typeof(top_source_id) = 'text' AND length(top_source_id) > 0
      AND typeof(top_source_share) IN ('integer', 'real')
      AND top_source_share > 0 AND top_source_share <= 1
    )
  ),
  CHECK (
    (family_share_status = 'UNKNOWN' AND top_family_id IS NULL AND top_family_share IS NULL)
    OR (
      family_share_status IN ('OK', 'BREACH')
      AND typeof(top_family_id) = 'text' AND length(top_family_id) > 0
      AND typeof(top_family_share) IN ('integer', 'real')
      AND top_family_share > 0 AND top_family_share <= 1
    )
  )
);

CREATE TRIGGER source_publication_serving_measurement_reject_caller_id
BEFORE INSERT ON source_publication_serving_measurement
WHEN NEW.id > 0
BEGIN SELECT RAISE(ABORT, 'publication serving measurement id is SQLite-assigned'); END;

CREATE TRIGGER source_publication_serving_measurement_append_only_update
BEFORE UPDATE ON source_publication_serving_measurement
BEGIN SELECT RAISE(ABORT, 'publication serving measurement is append-only'); END;

CREATE TRIGGER source_publication_serving_measurement_append_only_delete
BEFORE DELETE ON source_publication_serving_measurement
BEGIN SELECT RAISE(ABORT, 'publication serving measurement is append-only'); END;
