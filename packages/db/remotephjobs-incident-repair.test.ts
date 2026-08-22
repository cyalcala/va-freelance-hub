import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

const migration = readFileSync(
  new URL("./migrations/0031_remotephjobs_incident_repair.sql", import.meta.url),
  "utf8",
);

function database(): Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE opportunities (
      id INTEGER PRIMARY KEY,
      source_url TEXT NOT NULL,
      application_url TEXT,
      updated_at TEXT
    );
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

describe("0031 remotephjobs incident repair", () => {
  test("quarantines cross-source apply URLs but preserves attributable external-source links", () => {
    const db = database();
    try {
      db.exec(`
        INSERT INTO opportunities VALUES
          (1, 'https://remoteok.com/remote-jobs/1', 'https://remotephjobs.com/apply/1', 'old'),
          (2, 'https://remotephjobs.com/jobs/2', 'https://remotephjobs.com/apply/2', 'old'),
          (3, 'https://remoteok.com/remote-jobs/3', 'https://remoteok.com/l/3', 'old');
      `);

      db.exec(migration);

      const rows = db.query("SELECT id, source_url, application_url, updated_at FROM opportunities ORDER BY id").all() as Array<Record<string, string>>;
      expect(rows[0]?.application_url).toBe(rows[0]?.source_url);
      expect(rows[0]?.updated_at).not.toBe("old");
      expect(rows[1]?.application_url).toBe("https://remotephjobs.com/apply/2");
      expect(rows[1]?.updated_at).toBe("old");
      expect(rows[2]?.application_url).toBe("https://remoteok.com/l/3");
    } finally {
      db.close();
    }
  });

  test("clears only the eight reviewed company assignments and is idempotent", () => {
    const db = database();
    try {
      const affected = ["Alpaca", "Xapo Bank", "Metabase", "CoinMarketCap", "Instrumentl", "Bobtail", "Maven Clinic", "APEX TRADE"];
      const insert = db.prepare("INSERT INTO va_directory (id, company_name, website, link_status, link_fail_count, notes) VALUES (?, ?, ?, 'dead_dns', 3, NULL)");
      affected.forEach((company, index) => insert.run(index + 1, company, "https://remotephjobs.com"));
      insert.run(9, "Remote PH Jobs", "https://remotephjobs.com");
      insert.run(10, "Alpaca", "https://alpaca.markets");

      db.exec(migration);
      db.exec(migration);

      const cleared = db.query("SELECT company_name, notes, link_fail_count FROM va_directory WHERE website IS NULL ORDER BY id").all() as Array<Record<string, string | number>>;
      expect(cleared).toHaveLength(8);
      expect(cleared.every((row) => String(row.notes).match(/cleared unattributable/g)?.length === 1)).toBe(true);
      expect(cleared.every((row) => row.link_fail_count === 0)).toBe(true);
      expect(db.query("SELECT website FROM va_directory WHERE id = 9").get()).toEqual({ website: "https://remotephjobs.com" });
      expect(db.query("SELECT website FROM va_directory WHERE id = 10").get()).toEqual({ website: "https://alpaca.markets" });
    } finally {
      db.close();
    }
  });
});
