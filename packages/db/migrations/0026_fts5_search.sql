-- FTS5 full-text search for opportunities.
--
-- Replaces the LIKE '%term%' scan on /opportunities with BM25-ranked search.
-- D1 supports FTS5 natively. The virtual table mirrors title, company, and
-- tags from the opportunities table; triggers keep it in sync on every
-- INSERT, UPDATE, and DELETE.
--
-- The content= option makes this an "external content" FTS5 table: the actual
-- text lives in the opportunities table, and the FTS index stores only the
-- inverted index. This avoids doubling storage.

CREATE VIRTUAL TABLE IF NOT EXISTS opportunities_fts USING fts5(
  title,
  company,
  tags,
  content='opportunities',
  content_rowid='id'
);

-- Backfill existing rows into the FTS index.
INSERT INTO opportunities_fts(rowid, title, company, tags)
  SELECT id, title, COALESCE(company, ''), COALESCE(tags, '')
  FROM opportunities
  WHERE is_active = 1;

-- Keep FTS in sync on INSERT.
CREATE TRIGGER IF NOT EXISTS opportunities_fts_insert
  AFTER INSERT ON opportunities
BEGIN
  INSERT INTO opportunities_fts(rowid, title, company, tags)
    VALUES (NEW.id, NEW.title, COALESCE(NEW.company, ''), COALESCE(NEW.tags, ''));
END;

-- Keep FTS in sync on UPDATE (delete old entry, insert new one).
CREATE TRIGGER IF NOT EXISTS opportunities_fts_update
  AFTER UPDATE ON opportunities
BEGIN
  INSERT INTO opportunities_fts(opportunities_fts, rowid, title, company, tags)
    VALUES ('delete', OLD.id, OLD.title, COALESCE(OLD.company, ''), COALESCE(OLD.tags, ''));
  INSERT INTO opportunities_fts(rowid, title, company, tags)
    VALUES (NEW.id, NEW.title, COALESCE(NEW.company, ''), COALESCE(NEW.tags, ''));
END;

-- Keep FTS in sync on DELETE.
CREATE TRIGGER IF NOT EXISTS opportunities_fts_delete
  AFTER DELETE ON opportunities
BEGIN
  INSERT INTO opportunities_fts(opportunities_fts, rowid, title, company, tags)
    VALUES ('delete', OLD.id, OLD.title, COALESCE(OLD.company, ''), COALESCE(OLD.tags, ''));
END;
