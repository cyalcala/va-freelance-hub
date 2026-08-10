import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { duplicateSurvivorSql } from "../src/lib/prune-query";

test("duplicate pruning retains the freshest active listing rather than the oldest id", () => {
  const database = new Database(":memory:");
  try {
    database.exec(`
      CREATE TABLE opportunities (
        id INTEGER PRIMARY KEY,
        company TEXT,
        description_hash TEXT,
        is_active INTEGER,
        last_seen_in_feed_at TEXT,
        posted_at TEXT,
        scraped_at TEXT
      );
      INSERT INTO opportunities VALUES
        (1, 'Acme', 'same', 1, '2026-08-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z'),
        (2, 'Acme', 'same', 1, '2026-08-08T00:00:00.000Z', '2026-08-07T00:00:00.000Z', '2026-08-08T00:00:00.000Z'),
        (3, 'Elsewhere', 'same', 1, '2026-08-09T00:00:00.000Z', '2026-08-09T00:00:00.000Z', '2026-08-09T00:00:00.000Z');
    `);

    const survivors = database.query(duplicateSurvivorSql).all() as Array<{ id: number }>;
    expect(survivors).toEqual(expect.arrayContaining([{ id: 2 }, { id: 3 }]));
    expect(survivors).not.toContainEqual({ id: 1 });
  } finally {
    database.close();
  }
});
