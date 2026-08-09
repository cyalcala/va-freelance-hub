import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const migrationUrl = (filename: string) =>
  new URL(`./migrations/${filename}`, import.meta.url);

function applyMigration(database: Database, filename: string) {
  database.exec(readFileSync(migrationUrl(filename), "utf8"));
}

function assertFtsIntegrity(database: Database) {
  database.exec(
    "INSERT INTO opportunities_fts(opportunities_fts, rank) VALUES ('integrity-check', 1);",
  );
}

test("FTS migration rebuilds external content and avoids non-search update churn", () => {
  const database = new Database(":memory:");

  try {
    database.exec(`
      CREATE TABLE opportunities (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        company TEXT,
        tags TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT
      );
      INSERT INTO opportunities (id, title, company, tags, is_active, updated_at)
      VALUES
        (1, 'Active writer role', 'Northstar', 'writing, remote', 1, '2026-08-09'),
        (2, 'Historic designer role', 'Sunrise', 'design, remote', 0, '2026-08-09');
    `);

    applyMigration(database, "0026_fts5_search.sql");
    expect(() => assertFtsIntegrity(database)).toThrow();

    applyMigration(database, "0027_fts5_trigger_scope.sql");

    assertFtsIntegrity(database);

    const historicMatches = database
      .query("SELECT rowid FROM opportunities_fts WHERE opportunities_fts MATCH ?")
      .all("historic") as Array<{ rowid: number }>;
    expect(historicMatches).toContainEqual({ rowid: 2 });

    const updateTrigger = database
      .query(
        "SELECT sql FROM sqlite_master WHERE type = 'trigger' AND name = 'opportunities_fts_update'",
      )
      .get() as { sql: string };
    expect(updateTrigger.sql).toContain(
      "AFTER UPDATE OF title, company, tags ON opportunities",
    );

    database.run(
      "UPDATE opportunities SET updated_at = ? WHERE id = ?",
      "2026-08-10",
      1,
    );
    database.run(
      "UPDATE opportunities SET title = ? WHERE id = ?",
      "Revised alphaunique role",
      1,
    );

    const revisedMatches = database
      .query("SELECT rowid FROM opportunities_fts WHERE opportunities_fts MATCH ?")
      .all("alphaunique") as Array<{ rowid: number }>;
    expect(revisedMatches).toContainEqual({ rowid: 1 });
    assertFtsIntegrity(database);
  } finally {
    database.close();
  }
});
