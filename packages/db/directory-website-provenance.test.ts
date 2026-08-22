import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

const migration = readFileSync(
  new URL("./migrations/0033_directory_website_provenance.sql", import.meta.url),
  "utf8",
);

function database(): Database {
  const db = new Database(":memory:");
  // Pre-0033 va_directory shape: the provenance columns must not exist yet.
  db.exec(`
    CREATE TABLE va_directory (
      id INTEGER PRIMARY KEY,
      company_name TEXT NOT NULL,
      website TEXT,
      link_status TEXT,
      link_checked_at TEXT,
      link_evidence TEXT,
      link_fail_count INTEGER NOT NULL DEFAULT 0,
      notes TEXT
    );
  `);
  return db;
}

describe("0033 directory website provenance", () => {
  test("adds nullable provenance columns without touching existing values", () => {
    const db = database();
    try {
      db.exec(`
        INSERT INTO va_directory (id, company_name, website, link_status, link_fail_count, notes) VALUES
          (1, 'Curated Co', 'https://curated.example', 'ok', 0, NULL),
          (2, 'Cleared Co', NULL, NULL, 0, '[incident 2026-08-22] cleared unattributable remotephjobs.com website');
      `);

      db.exec(migration);

      const cols = (db.query("PRAGMA table_info(va_directory)").all() as Array<{ name: string; notnull: number; dflt_value: string | null }>)
        .filter((c) => c.name.startsWith("website_"));
      expect(cols.map((c) => c.name).sort()).toEqual([
        "website_evidence",
        "website_set_at",
        "website_source",
      ]);
      // Additive only: every new column is nullable with no default so legacy
      // rows stay byte-identical and NULL keeps meaning "unclassified".
      for (const col of cols) {
        expect(col.notnull).toBe(0);
        expect(col.dflt_value).toBeNull();
      }

      const rows = db.query("SELECT id, company_name, website, website_source, website_evidence, website_set_at, notes FROM va_directory ORDER BY id").all() as Array<Record<string, string | null>>;
      // Existing data and notes are untouched; provenance starts NULL (unknown).
      expect(rows[0]).toMatchObject({
        id: 1,
        company_name: "Curated Co",
        website: "https://curated.example",
        website_source: null,
        website_evidence: null,
        website_set_at: null,
      });
      expect(rows[1]?.website).toBeNull();
      expect(rows[1]?.notes).toContain("cleared unattributable remotephjobs.com");
    } finally {
      db.close();
    }
  });
});
