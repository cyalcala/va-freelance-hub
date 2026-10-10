-- Shared canary hold. A proposal is reserved before persistence so a second
-- writer cannot pass the same remaining tick cap. This grants no source,
-- caps no unlimited exact-six writer, and adds no julianday('now').

CREATE TABLE source_publication_reservation (
  id INTEGER PRIMARY KEY AUTOINCREMENT CHECK (id > 0),
  source_id TEXT NOT NULL CHECK (typeof(source_id) = 'text' AND length(source_id) > 0 AND instr(source_id, char(0)) = 0),
  tick_key TEXT NOT NULL CHECK (length(tick_key) > 0 AND instr(tick_key, char(0)) = 0),
  retry_key TEXT NOT NULL UNIQUE CHECK (length(retry_key) > 0 AND instr(retry_key, char(0)) = 0),
  reserved_count INTEGER NOT NULL CHECK (typeof(reserved_count) = 'integer' AND reserved_count > 0 AND reserved_count <= 9007199254740991)
);

CREATE INDEX source_publication_reservation_tick_idx
  ON source_publication_reservation(source_id, tick_key, id);

CREATE TRIGGER source_publication_reservation_reject_caller_id
BEFORE INSERT ON source_publication_reservation
WHEN NEW.id > 0
BEGIN SELECT RAISE(ABORT, 'publication reservation id is SQLite-assigned'); END;

CREATE TRIGGER source_publication_reservation_append_only_update
BEFORE UPDATE ON source_publication_reservation
BEGIN SELECT RAISE(ABORT, 'publication reservation is append-only'); END;

CREATE TRIGGER source_publication_reservation_append_only_delete
BEFORE DELETE ON source_publication_reservation
BEGIN SELECT RAISE(ABORT, 'publication reservation is append-only'); END;

CREATE TRIGGER source_publication_reservation_cap
BEFORE INSERT ON source_publication_reservation
BEGIN
  SELECT (CASE WHEN NOT EXISTS (
    SELECT 1 FROM source_registry
    WHERE source_id = NEW.source_id
      AND operational_state = 'canary'
      AND typeof(canary_max_new_items_per_tick) = 'integer'
      AND canary_max_new_items_per_tick > 0
  ) THEN RAISE(ABORT, 'canary reservation requires a live canary with a positive cap') END);

  SELECT (CASE WHEN (
    NEW.reserved_count
    + IFNULL((
      SELECT SUM(published_count) FROM source_publication_ledger
      WHERE source_id = NEW.source_id AND tick_key = NEW.tick_key
        AND mode IN ('capped', 'unlimited')
    ), 0)
    + IFNULL((
      SELECT SUM(reserved_count) FROM source_publication_reservation
      WHERE source_id = NEW.source_id AND tick_key = NEW.tick_key
        AND retry_key NOT IN (
          SELECT retry_key FROM source_publication_ledger
          WHERE source_id = NEW.source_id AND tick_key = NEW.tick_key
        )
    ), 0)
  ) > (
    SELECT canary_max_new_items_per_tick FROM source_registry WHERE source_id = NEW.source_id
  ) THEN RAISE(ABORT, 'canary publication would exceed the current tick cap') END);
END;
