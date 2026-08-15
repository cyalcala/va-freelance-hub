import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { SQL } from "drizzle-orm";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { directoryVisibilityFilters } from "../src/lib/directory-visibility";

test("directory visibility filters require hires_filipinos = 1", () => {
  const filters = directoryVisibilityFilters();
  expect(filters).toBeDefined();
  const dialect = new SQLiteSyncDialect();
  const query = dialect.sqlToQuery(filters as SQL);
  expect(query.sql).toContain("hires_filipinos");
  expect(query.sql).toContain("link_fail_count");
  expect(query.sql).toContain("?");
  expect(query.sql).toContain("<");
});

test("filter matches only visible rows from a seeded table", () => {
  const database = new Database(":memory:");
  try {
    database.exec(`
      CREATE TABLE va_directory (
        company_name TEXT, hires_filipinos INTEGER, link_fail_count INTEGER
      );
      INSERT INTO va_directory VALUES
        ('Visible PH Co', 1, 0),
        ('Visible Fresh Co', 1, 2),
        ('Hidden Non-PH', 0, 0),
        ('Hidden Three Strikes', 1, 3),
        ('Hidden Over Strikes', 1, 4);
    `);

    const dialect = new SQLiteSyncDialect();
    const filters = directoryVisibilityFilters();
    const { sql, params } = dialect.sqlToQuery(filters as SQL);

    const rows = database
      .query(`SELECT company_name FROM va_directory WHERE ${sql}`)
      .all(...(params as any[])) as Array<{ company_name: string }>;

    expect(rows.map((r) => r.company_name).sort()).toEqual([
      "Visible Fresh Co",
      "Visible PH Co",
    ]);
  } finally {
    database.close();
  }
});