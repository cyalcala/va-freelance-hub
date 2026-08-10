-- Repair the external-content FTS5 index created by 0026.
--
-- opportunities_fts uses opportunities as its external content table. The
-- index therefore has to include every source row, including inactive rows;
-- the application applies is_active filtering after a search match. This also
-- restricts trigger work to fields that are actually indexed so routine
-- freshness, verification, click, and archival writes do not churn FTS rows.

DROP TRIGGER IF EXISTS opportunities_fts_insert;
DROP TRIGGER IF EXISTS opportunities_fts_update;
DROP TRIGGER IF EXISTS opportunities_fts_delete;

CREATE TRIGGER opportunities_fts_insert
  AFTER INSERT ON opportunities
BEGIN
  INSERT INTO opportunities_fts(rowid, title, company, tags)
    VALUES (NEW.id, NEW.title, COALESCE(NEW.company, ''), COALESCE(NEW.tags, ''));
END;

CREATE TRIGGER opportunities_fts_update
  AFTER UPDATE OF title, company, tags ON opportunities
BEGIN
  INSERT INTO opportunities_fts(opportunities_fts, rowid, title, company, tags)
    VALUES ('delete', OLD.id, OLD.title, COALESCE(OLD.company, ''), COALESCE(OLD.tags, ''));
  INSERT INTO opportunities_fts(rowid, title, company, tags)
    VALUES (NEW.id, NEW.title, COALESCE(NEW.company, ''), COALESCE(NEW.tags, ''));
END;

CREATE TRIGGER opportunities_fts_delete
  AFTER DELETE ON opportunities
BEGIN
  INSERT INTO opportunities_fts(opportunities_fts, rowid, title, company, tags)
    VALUES ('delete', OLD.id, OLD.title, COALESCE(OLD.company, ''), COALESCE(OLD.tags, ''));
END;

-- Rebuild from the complete external content table to repair the original
-- active-only backfill and establish a consistent index before the scoped
-- triggers take effect.
INSERT INTO opportunities_fts(opportunities_fts) VALUES ('rebuild');
