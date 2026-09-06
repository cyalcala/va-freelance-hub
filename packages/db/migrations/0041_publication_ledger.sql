-- SP-23C: cumulative publication ledger. Exact-six remains uncapped.
-- This migration activates no source and does not enable a new schedule.
-- CASE expressions are parenthesized for D1's remote parser (workers-sdk#4727).

CREATE TABLE source_publication_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT CHECK (id > 0),
  source_id TEXT NOT NULL CHECK (typeof(source_id) = 'text' AND length(source_id) > 0 AND instr(source_id, char(0)) = 0),
  tick_key TEXT NOT NULL CHECK (length(tick_key) > 0 AND instr(tick_key, char(0)) = 0),
  retry_key TEXT NOT NULL CHECK (length(retry_key) > 0 AND instr(retry_key, char(0)) = 0),
  mode TEXT NOT NULL CHECK (mode IN ('unlimited','capped','blocked','rolled_back')),
  proposed_count INTEGER NOT NULL CHECK (typeof(proposed_count) = 'integer' AND proposed_count >= 0 AND proposed_count <= 9007199254740991),
  published_count INTEGER NOT NULL CHECK (typeof(published_count) = 'integer' AND published_count >= 0 AND published_count <= proposed_count),
  published_ids_json TEXT NOT NULL CHECK (json_valid(published_ids_json) AND json_type(published_ids_json) = 'array'),
  decided_at TEXT NOT NULL,
  UNIQUE(retry_key)
);
CREATE INDEX source_publication_ledger_tick_idx ON source_publication_ledger(source_id, tick_key, id);

CREATE TRIGGER source_publication_ledger_reject_caller_id
BEFORE INSERT ON source_publication_ledger
WHEN NEW.id > 0
BEGIN SELECT RAISE(ABORT, 'publication ledger id is SQLite-assigned'); END;

CREATE TRIGGER source_publication_ledger_append_only_update BEFORE UPDATE ON source_publication_ledger
BEGIN SELECT RAISE(ABORT, 'publication ledger is append-only'); END;
CREATE TRIGGER source_publication_ledger_append_only_delete BEFORE DELETE ON source_publication_ledger
BEGIN SELECT RAISE(ABORT, 'publication ledger is append-only'); END;

CREATE TRIGGER source_publication_ledger_validate_insert
BEFORE INSERT ON source_publication_ledger
BEGIN
  SELECT (CASE WHEN length(NEW.decided_at) <> 24
    OR NEW.decided_at NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
    OR substr(NEW.decided_at, 12, 2) NOT BETWEEN '00' AND '23'
    OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.decided_at) IS NOT NEW.decided_at
    OR abs(julianday(NEW.decided_at) - julianday('now')) > (5.0 / 1440.0)
    THEN RAISE(ABORT, 'publication ledger decided_at must be a canonical UTC timestamp within five minutes of D1 time') END);

  SELECT (CASE WHEN NEW.mode = 'rolled_back' AND NEW.published_count <> 0
    THEN RAISE(ABORT, 'rolled-back publication must expose zero items') END);

  SELECT (CASE WHEN NEW.mode = 'blocked' AND NEW.published_count <> 0
    THEN RAISE(ABORT, 'blocked publication must expose zero items') END);

  SELECT (CASE WHEN NEW.mode = 'capped' AND NOT EXISTS (
    SELECT 1 FROM source_registry
    WHERE source_id = NEW.source_id
      AND operational_state = 'canary'
      AND typeof(canary_max_new_items_per_tick) = 'integer'
      AND canary_max_new_items_per_tick > 0
  ) THEN RAISE(ABORT, 'capped publication requires a live canary with a positive cap') END);

  SELECT (CASE WHEN NEW.mode = 'capped' AND (
    NEW.published_count + IFNULL((
      SELECT SUM(published_count) FROM source_publication_ledger
      WHERE source_id = NEW.source_id AND tick_key = NEW.tick_key
    ), 0)
  ) > (SELECT canary_max_new_items_per_tick FROM source_registry WHERE source_id = NEW.source_id)
    THEN RAISE(ABORT, 'canary publication would exceed the current tick cap') END);
END;
