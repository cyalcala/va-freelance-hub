import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";

function applyThrough(name: string): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  for (const migration of [
    "0036_registry_foundation.sql",
    "0037_source_lifecycle_opt_out.sql",
    "0038_shadow_observations.sql",
    "0039_canary_transition_plane.sql",
    ...(name === "0040_current_evidence_admission.sql" ? ["0040_current_evidence_admission.sql"] : []),
  ]) {
    db.exec(readFileSync(join(import.meta.dir, "./migrations", migration), "utf-8"));
  }
  return db;
}

function seed(db: Database): void {
  db.exec(`INSERT INTO provider_profiles (
    id, display_name, provider_family, mechanism, auth_class, allowed_hosts, evidence_url,
    evidence_hash, evidence_captured_at, visibility_filter, content_scope, cadence_min_minutes,
    cadence_max_minutes, robots_handling, removal_semantics, evidence_lease_days,
    default_compliance_state, default_operational_state
  ) VALUES (
    'greenhouse', 'Greenhouse', 'greenhouse', 'ats_api', 'none', 'boards-api.greenhouse.io',
    'https://developers.greenhouse.io/job-board.html', '${"a".repeat(64)}',
    strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'published', 'minimal', 1440, 2880, 'enforce',
    'remove on disappearance', 30, 'allowed', 'candidate'
  )`);
  db.exec(`INSERT INTO source_registry (
    source_id, provider_id, display_name, endpoint_url, compliance_state, operational_state,
    policy_expiry, canary_max_new_items_per_tick
  ) VALUES (
    'greenhouse:test', 'greenhouse', 'Test', 'https://boards-api.greenhouse.io/v1/boards/test/jobs',
    'conditional', 'candidate', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+30 days'), 3
  )`);
}

describe("0040 current-evidence admission", () => {
  test("preserves complete statements through installed Wrangler transport for LF and CRLF", async () => {
    const { unstable_splitSqlQuery } = await import("wrangler");
    const migration = readFileSync(join(import.meta.dir, "./migrations", "0040_current_evidence_admission.sql"), "utf-8");
    const executableSql = migration.replace(/--[^\n]*/g, "");
    expect(executableSql).not.toMatch(/(?<!\()\bCASE\b/);
    for (const newline of ["\n", "\r\n"]) {
      const statements = unstable_splitSqlQuery(migration.replace(/\r?\n/g, newline));
      expect(statements.length).toBeGreaterThan(20);
      const db = applyThrough("0039_canary_transition_plane.sql");
      try {
        for (const statement of statements) db.exec(statement);
        seed(db);
        expect((db.query("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name='source_admission_evidence'").get() as { n: number }).n).toBe(1);
        expect((db.query("SELECT governance_revision AS n FROM source_registry").get() as { n: number }).n).toBe(1);
      } finally {
        db.close();
      }
    }
  });

  test("material edits bump governance and restoring old values cannot reuse the previous revision", () => {
    const db = applyThrough("0040_current_evidence_admission.sql");
    try {
      seed(db);
      db.exec("UPDATE source_registry SET endpoint_url='https://boards-api.greenhouse.io/v1/boards/other/jobs'");
      expect((db.query("SELECT governance_revision AS n FROM source_registry").get() as { n: number }).n).toBe(2);
      db.exec("UPDATE source_registry SET endpoint_url='https://boards-api.greenhouse.io/v1/boards/test/jobs'");
      expect((db.query("SELECT governance_revision AS n FROM source_registry").get() as { n: number }).n).toBe(3);
      expect(() => db.exec("UPDATE source_registry SET governance_revision=1")).toThrow(/advance by one/i);
    } finally {
      db.close();
    }
  });

  test("rejects v1 admissions and unbound observations", () => {
    const db = applyThrough("0040_current_evidence_admission.sql");
    try {
      seed(db);
      const now = new Date().toISOString();
      expect(() => db.exec(`INSERT INTO source_transition_events (
        transition_plane_version, source_id, from_compliance, from_operational, to_compliance, to_operational,
        cause, decided_at, evidence_hash, input_json, input_hash, decision_hash
      ) VALUES ('sp23-v1', 'greenhouse:test', 'conditional', 'candidate', 'conditional', 'shadow',
        'requested_shadow_entry', '${now}', 'token', '{}', '00', '00')`)).toThrow(/sp23-v2|current evidence|canonical replay/i);
      expect(() => db.exec(`INSERT INTO source_shadow_observations (
        source_id, provider_id, dispatcher_version, outcome, evidence_hash, result_json
      ) VALUES ('greenhouse:test', 'greenhouse', 'sp22-v1', 'HEALTHY_EMPTY', '${"b".repeat(64)}', '{}')`)).toThrow(/admission context|unique dispatch/i);
    } finally {
      db.close();
    }
  });
});
