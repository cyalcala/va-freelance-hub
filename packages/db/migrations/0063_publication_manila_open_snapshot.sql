-- An open Manila-day snapshot. This is not a closed day and not a certified flow.
-- This grants no source, blocks no writer, and adds no julianday('now').
-- The only stored day state is OPEN.

CREATE TABLE source_publication_manila_open_snapshot (
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
  day_state TEXT NOT NULL CHECK (day_state = 'OPEN'),
  first_publish_count INTEGER NOT NULL CHECK (
    typeof(first_publish_count) = 'integer'
    AND first_publish_count >= 0
    AND first_publish_count <= 9007199254740991
  ),
  still_public_count INTEGER NOT NULL CHECK (
    typeof(still_public_count) = 'integer'
    AND still_public_count >= 0
    AND still_public_count <= first_publish_count
  ),
  recorded_at TEXT NOT NULL CHECK (
    typeof(recorded_at) = 'text'
    AND length(recorded_at) = 24
    AND instr(recorded_at, char(0)) = 0
    AND substr(recorded_at, 12, 2) BETWEEN '00' AND '23'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', recorded_at) IS recorded_at
  )
);

CREATE TRIGGER source_publication_manila_open_snapshot_reject_caller_id
BEFORE INSERT ON source_publication_manila_open_snapshot
WHEN NEW.id > 0
BEGIN SELECT RAISE(ABORT, 'publication manila open snapshot id is SQLite-assigned'); END;

CREATE TRIGGER source_publication_manila_open_snapshot_append_only_update
BEFORE UPDATE ON source_publication_manila_open_snapshot
BEGIN SELECT RAISE(ABORT, 'publication manila open snapshot is append-only'); END;

CREATE TRIGGER source_publication_manila_open_snapshot_append_only_delete
BEFORE DELETE ON source_publication_manila_open_snapshot
BEGIN SELECT RAISE(ABORT, 'publication manila open snapshot is append-only'); END;
