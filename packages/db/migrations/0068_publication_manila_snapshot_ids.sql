-- Open-snapshot ids. Equal counts are not the same jobs.
-- The day's ids are this snapshot's ids, not the union of earlier snapshots.
-- This is not a closed day. It grants no source, blocks no writer,
-- and adds no julianday('now').

CREATE TABLE source_publication_manila_snapshot_ids (
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
  first_publish_ids_json TEXT NOT NULL CHECK (
    typeof(first_publish_ids_json) = 'text'
    AND json_valid(first_publish_ids_json)
    AND json_type(first_publish_ids_json) = 'array'
  ),
  still_public_ids_json TEXT NOT NULL CHECK (
    typeof(still_public_ids_json) = 'text'
    AND json_valid(still_public_ids_json)
    AND json_type(still_public_ids_json) = 'array'
    AND json_array_length(still_public_ids_json) <= json_array_length(first_publish_ids_json)
  ),
  recorded_at TEXT NOT NULL CHECK (
    typeof(recorded_at) = 'text'
    AND length(recorded_at) = 24
    AND instr(recorded_at, char(0)) = 0
    AND substr(recorded_at, 12, 2) BETWEEN '00' AND '23'
    AND strftime('%Y-%m-%dT%H:%M:%fZ', recorded_at) IS recorded_at
  )
);

CREATE TRIGGER source_publication_manila_snapshot_ids_reject_caller_id
BEFORE INSERT ON source_publication_manila_snapshot_ids
WHEN NEW.id > 0
BEGIN SELECT RAISE(ABORT, 'publication manila snapshot ids id is SQLite-assigned'); END;

CREATE TRIGGER source_publication_manila_snapshot_ids_append_only_update
BEFORE UPDATE ON source_publication_manila_snapshot_ids
BEGIN SELECT RAISE(ABORT, 'publication manila snapshot ids are append-only'); END;

CREATE TRIGGER source_publication_manila_snapshot_ids_append_only_delete
BEFORE DELETE ON source_publication_manila_snapshot_ids
BEGIN SELECT RAISE(ABORT, 'publication manila snapshot ids are append-only'); END;
