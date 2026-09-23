import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";

const MIGRATIONS = [
  "0036_registry_foundation.sql",
  "0037_source_lifecycle_opt_out.sql",
  "0038_shadow_observations.sql",
  "0039_canary_transition_plane.sql",
  "0040_current_evidence_admission.sql",
  "0041_publication_ledger.sql",
  "0042_d1_like_glob_limit.sql",
  "0043_canary_promotion_trigger_alignment.sql",
  "0044_canary_to_active_graduation.sql",
];

function setupDatabase(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  for (const migration of MIGRATIONS) {
    const sql = readFileSync(join(import.meta.dir, "./migrations", migration), "utf-8");
    db.exec(sql);
  }
  return db;
}

describe("0044 canary to active graduation migration", () => {
  test("preserves complete statements through installed Wrangler transport for LF and CRLF", async () => {
    const { unstable_splitSqlQuery } = await import("wrangler");
    const migration = readFileSync(
      join(import.meta.dir, "./migrations", "0044_canary_to_active_graduation.sql"),
      "utf-8",
    );
    const executableSql = migration.replace(/--[^\n]*/g, "");
    expect(executableSql).not.toMatch(/(?<!\()\bCASE\b/);

    for (const newline of ["\n", "\r\n"]) {
      const statements = unstable_splitSqlQuery(migration.replace(/\r?\n/g, newline));
      expect(statements.length).toBe(2);
      const db = setupDatabase();
      db.close();
    }
  });

  test("trigger enforces that active graduation requires prior canary operational state", () => {
    const db = setupDatabase();
    try {
      // Seed provider and source in shadow state
      db.exec(`INSERT INTO provider_profiles (
        id, display_name, provider_family, mechanism, auth_class, allowed_hosts, evidence_url,
        evidence_hash, evidence_captured_at, visibility_filter, content_scope, cadence_min_minutes,
        cadence_max_minutes, robots_handling, removal_semantics, evidence_lease_days,
        default_compliance_state, default_operational_state
      ) VALUES (
        'breezy', 'Breezy HR', 'breezy', 'ats_api', 'none', 'app.breezy.hr',
        'https://app.breezy.hr', '${"a".repeat(64)}',
        strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'published', 'minimal', 1440, 2880, 'enforce',
        'remove on disappearance', 180, 'conditional', 'candidate'
      )`);

      db.exec(`INSERT INTO source_registry (
        source_id, provider_id, display_name, endpoint_url, compliance_state, operational_state,
        policy_expiry, canary_max_new_items_per_tick
      ) VALUES (
        'breezy:test', 'breezy', 'Test', 'https://app.breezy.hr/json',
        'conditional', 'candidate', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+30 days'), 2
      )`);

      const now = new Date().toISOString();
      const inputJson = JSON.stringify({
        version: "sp23-v2",
        sourceId: "breezy:test",
        fromCompliance: "conditional",
        fromOperational: "shadow",
        toCompliance: "conditional",
        toOperational: "active",
        cause: "requested_promotion",
        now,
      });

      // Attempting shadow -> active directly must be aborted
      expect(() => {
        db.exec(`INSERT INTO source_transition_events (
          transition_plane_version, source_id, from_compliance, from_operational,
          to_compliance, to_operational, cause, decided_at, evidence_hash,
          input_json, input_hash, decision_hash
        ) VALUES (
          'sp23-v2', 'breezy:test', 'conditional', 'shadow',
          'conditional', 'active', 'requested_promotion', '${now}', '${"e".repeat(64)}',
          '${inputJson}', 'hash1', 'hash2'
        )`);
      }).toThrow(/active graduation requires prior canary operational state|requested_promotion must be/i);
    } finally {
      db.close();
    }
  });
});
