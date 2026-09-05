import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sql = readFileSync(resolve(import.meta.dir, "verify-source-transition.sql"), "utf8");
const migrationDir = resolve(import.meta.dir, "../../packages/db/migrations");

function fixture() {
  const db = new Database(":memory:");
  for (const name of ["0036_registry_foundation.sql", "0037_source_lifecycle_opt_out.sql", "0038_shadow_observations.sql", "0039_canary_transition_plane.sql"]) {
    db.exec(readFileSync(resolve(migrationDir, name), "utf8"));
  }
  db.exec(`CREATE TABLE d1_migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
    INSERT INTO d1_migrations (name) VALUES ('0039_canary_transition_plane.sql');
    CREATE TABLE opportunities (source_id TEXT, scraped_at TEXT, is_active INTEGER, ph_eligibility TEXT);
    INSERT INTO opportunities VALUES
      ('we-work-remotely', datetime('now', '-1 hour'), 1, 'eligible_verified'),
      (NULL, datetime('now', '-2 days'), 1, 'eligible_likely'),
      ('remotive', datetime('now', '-8 days'), 1, 'eligible_likely'),
      ('remotive', datetime('now', '+1 day'), 1, 'eligible_likely'),
      ('remotive', datetime('now', '-1 hour'), 0, 'eligible_verified'),
      ('remotive', datetime('now', '-1 hour'), 1, 'ineligible');`);
  return db;
}

describe("SP-23 read-only production evidence SQL", () => {
  test("is one SELECT statement and measures eligible first-storage proxies without writes", () => {
    const uncommented = sql.replace(/--[^\n]*/g, "");
    expect(uncommented.trim()).toStartWith("WITH");
    expect(uncommented.match(/;/g)).toHaveLength(1);
    expect(uncommented).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|REPLACE|ALTER|CREATE|DROP|ATTACH|DETACH|VACUUM)\b/i);
    const db = fixture();
    try {
      const before = db.query("SELECT total_changes() AS n").get();
      db.exec("PRAGMA query_only = ON");
      const result = db.query(sql).get() as Record<string, unknown>;
      expect(result).toMatchObject({ migration_0039_rows: 1, transition_table_count: 1, registry_column_count: 2,
        named_trigger_count: 18, missing_triggers_json: "[]", registry_count: 0, provider_profile_count: 0,
        candidate_count: 0, transition_event_count: 0, shadow_observation_count: 0,
        eligible_active: 4, eligible_active_missing_source_id: 1, eligible_first_storage_1d: 1, eligible_first_storage_7d: 2 });
      expect(Number.isFinite(Date.parse(String(result.as_of)))).toBe(true);
      const rows = JSON.parse(String(result.per_source_supply_json)) as Array<Record<string, unknown>>;
      expect(rows.reduce((sum, row) => sum + Number(row.first_storage_7d), 0)).toBe(2);
      expect(rows.some(row => row.source_id === null)).toBe(true);
      expect(db.query("SELECT total_changes() AS n").get()).toEqual(before);
    } finally { db.close(); }
  });

  test("exposes a missing migration ledger entry and the exact missing guard", () => {
    const db = fixture();
    try {
      db.exec("DELETE FROM d1_migrations; DROP TRIGGER source_transition_events_append_only_delete;");
      const result = db.query(sql).get() as Record<string, unknown>;
      expect(result.migration_0039_rows).toBe(0);
      expect(result.named_trigger_count).toBe(17);
      expect(JSON.parse(String(result.missing_triggers_json))).toEqual(["source_transition_events_append_only_delete"]);
    } finally { db.close(); }
  });
});
