import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

/** Cloudflare D1 SQLITE_LIMIT_LIKE_PATTERN_LENGTH. Docs: developers.cloudflare.com/d1/platform/limits */
const D1_LIKE_GLOB_PATTERN_MAX_BYTES = 50;

function applyRegistryHead(): Database {
  const dir = join(import.meta.dir, "migrations");
  const files = readdirSync(dir)
    .filter((name) => /^\d{4}_.+\.sql$/.test(name) && name >= "0036_registry_foundation.sql")
    .sort();
  const db = new Database(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  for (const name of files) {
    db.exec(readFileSync(join(dir, name), "utf-8"));
  }
  return db;
}

function oversizeLikeGlobPatterns(sql: string): Array<{ pattern: string; bytes: number }> {
  const found: Array<{ pattern: string; bytes: number }> = [];
  for (const match of sql.matchAll(/(?:LIKE|GLOB)\s+'([^']*)'/gi)) {
    const pattern = match[1]!;
    const bytes = Buffer.byteLength(pattern);
    if (bytes > D1_LIKE_GLOB_PATTERN_MAX_BYTES) found.push({ pattern, bytes });
  }
  return found;
}

describe("D1 LIKE/GLOB pattern limit", () => {
  test("0042 preserves complete triggers through Wrangler transport and parenthesizes CASE", async () => {
    const { unstable_splitSqlQuery } = await import("wrangler");
    const dir = join(import.meta.dir, "migrations");
    const migration = readFileSync(join(dir, "0042_d1_like_glob_limit.sql"), "utf-8");
    const executableSql = migration.replace(/--[^\n]*/g, "");
    expect(executableSql).not.toMatch(/(?<!\()\bCASE\b/);
    const head = readdirSync(dir)
      .filter((name) => /^\d{4}_.+\.sql$/.test(name) && name >= "0036_registry_foundation.sql" && name < "0042_d1_like_glob_limit.sql")
      .sort();
    for (const newline of ["\n", "\r\n"]) {
      const statements = unstable_splitSqlQuery(migration.replace(/\r?\n/g, newline));
      expect(statements.length).toBeGreaterThan(6);
      const db = new Database(":memory:");
      db.exec("PRAGMA foreign_keys = ON;");
      try {
        for (const name of head) db.exec(readFileSync(join(dir, name), "utf-8"));
        for (const statement of statements) db.exec(statement);
        const oversize = oversizeLikeGlobPatterns(
          (db.query(
            "SELECT group_concat(sql, char(10)) AS sql FROM sqlite_master WHERE type='trigger'",
          ).get() as { sql: string }).sql,
        );
        expect(oversize).toEqual([]);
      } finally {
        db.close();
      }
    }
  });

  test("live sqlite_master SQL has no LIKE/GLOB pattern longer than 50 bytes", () => {
    const db = applyRegistryHead();
    try {
      const rows = db.query(
        "SELECT name, sql FROM sqlite_master WHERE sql IS NOT NULL",
      ).all() as Array<{ name: string; sql: string }>;
      const oversize = rows.flatMap((row) =>
        oversizeLikeGlobPatterns(row.sql).map((hit) => ({ object: row.name, ...hit })),
      );
      expect(oversize).toEqual([]);
    } finally {
      db.close();
    }
  });
});
