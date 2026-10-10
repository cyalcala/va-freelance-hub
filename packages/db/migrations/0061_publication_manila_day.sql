-- Distinct first-published ids for one Manila calendar day.
-- This grants no source, blocks no writer, and adds no julianday('now').
-- Empty id lists and earlier Manila days do not increment the count.
-- The count is not a certified production daily flow.

CREATE TABLE source_publication_manila_day (
  id INTEGER PRIMARY KEY AUTOINCREMENT CHECK (id > 0),
  source_id TEXT NOT NULL CHECK (typeof(source_id) = 'text' AND length(source_id) > 0 AND instr(source_id, char(0)) = 0),
  tick_key TEXT NOT NULL CHECK (length(tick_key) > 0 AND instr(tick_key, char(0)) = 0),
  retry_key TEXT NOT NULL UNIQUE CHECK (length(retry_key) > 0 AND instr(retry_key, char(0)) = 0),
  manila_date TEXT NOT NULL CHECK (
    typeof(manila_date) = 'text'
    AND length(manila_date) = 10
    AND substr(manila_date, 5, 1) = '-'
    AND substr(manila_date, 8, 1) = '-'
    AND strftime('%Y-%m-%d', manila_date) IS manila_date
  ),
  first_publish_count INTEGER NOT NULL CHECK (
    typeof(first_publish_count) = 'integer'
    AND first_publish_count >= 0
    AND first_publish_count <= 9007199254740991
  ),
  recorded_at TEXT NOT NULL CHECK (
    typeof(recorded_at) = 'text'
    AND length(recorded_at) = 24
    AND instr(recorded_at, char(0)) = 0
    AND substr(recorded_at, 12, 2) BETWEEN '00' AND '23'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', recorded_at) IS recorded_at
  )
);

CREATE TRIGGER source_publication_manila_day_reject_caller_id
BEFORE INSERT ON source_publication_manila_day
WHEN NEW.id > 0
BEGIN SELECT RAISE(ABORT, 'publication manila day id is SQLite-assigned'); END;

CREATE TRIGGER source_publication_manila_day_append_only_update
BEFORE UPDATE ON source_publication_manila_day
BEGIN SELECT RAISE(ABORT, 'publication manila day is append-only'); END;

CREATE TRIGGER source_publication_manila_day_append_only_delete
BEFORE DELETE ON source_publication_manila_day
BEGIN SELECT RAISE(ABORT, 'publication manila day is append-only'); END;
