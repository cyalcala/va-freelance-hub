import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";
import { admitReviewedSourceToShadow } from "./source-admission";
import type { AdmissionDatabase } from "./admission-evidence";
import type { TransitionGatewayDatabase, TransitionGatewayRunResult, TransitionGatewayStatement } from "./transition-gateway";
import { liveAdmissionFixture } from "./test-fixtures/admission";

class BunStatement implements TransitionGatewayStatement {
  private values: unknown[] = [];
  constructor(private readonly db: Database, private readonly query: string) {}
  bind(...values: unknown[]): TransitionGatewayStatement {
    this.values = values;
    return this;
  }
  async first<T>(): Promise<T | null> {
    return (this.db.query(this.query).get(...this.values) as T | null) ?? null;
  }
  async run(): Promise<TransitionGatewayRunResult> {
    this.db.query(this.query).run(...this.values);
    return { success: true, meta: { last_row_id: Number(this.db.query("SELECT last_insert_rowid() AS id").get()?.id) } };
  }
}

class BunGatewayDatabase implements TransitionGatewayDatabase {
  constructor(private readonly db: Database) {}
  prepare(query: string): TransitionGatewayStatement {
    return new BunStatement(this.db, query);
  }
}

function freshDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  for (const migration of [
    "0036_registry_foundation.sql",
    "0037_source_lifecycle_opt_out.sql",
    "0038_shadow_observations.sql",
    "0039_canary_transition_plane.sql",
    "0040_current_evidence_admission.sql",
    "0041_publication_ledger.sql",
    "0042_d1_like_glob_limit.sql",
  ]) {
    db.exec(readFileSync(join(import.meta.dir, "../db/migrations", migration), "utf-8"));
  }
  return db;
}

test("admits a reviewed candidate to shadow and does not publish opportunities", async () => {
  const sqlite = freshDb();
  const db = new BunGatewayDatabase(sqlite) as TransitionGatewayDatabase & AdmissionDatabase;
  const fixture = await liveAdmissionFixture();
  const result = await admitReviewedSourceToShadow(db, {
    now: new Date().toISOString(),
    source: fixture.source,
    provider: fixture.provider,
    probe: fixture.packet.probe,
    primaryEvidence: fixture.packet.primaryEvidence,
    adjudicationRef: fixture.packet.adjudicationRef,
  });
  expect(result).toEqual({ ok: true, sourceId: fixture.source.sourceId });
  const row = sqlite.query(`SELECT operational_state, compliance_state FROM source_registry WHERE source_id=?`)
    .get(fixture.source.sourceId) as { operational_state: string; compliance_state: string };
  expect(row).toEqual({ operational_state: "shadow", compliance_state: fixture.source.complianceState });
  expect(sqlite.query(`SELECT COUNT(*) AS n FROM source_publication_ledger`).get() as { n: number }).toEqual({ n: 0 });
});

test("rejects an unhealthy probe before writing registry state", async () => {
  const sqlite = freshDb();
  const db = new BunGatewayDatabase(sqlite) as TransitionGatewayDatabase & AdmissionDatabase;
  const fixture = await liveAdmissionFixture();
  const result = await admitReviewedSourceToShadow(db, {
    now: new Date().toISOString(),
    source: fixture.source,
    provider: fixture.provider,
    probe: { ...fixture.packet.probe, diagnostic: { ...fixture.packet.probe.diagnostic, outcome: "SCHEMA_BROKEN" } },
    primaryEvidence: fixture.packet.primaryEvidence,
    adjudicationRef: fixture.packet.adjudicationRef,
  });
  expect(result.ok).toBe(false);
  expect(sqlite.query(`SELECT COUNT(*) AS n FROM source_registry`).get() as { n: number }).toEqual({ n: 0 });
});

test("retries admission when a leftover provider profile exists without evidence", async () => {
  const sqlite = freshDb();
  sqlite.exec(`INSERT INTO provider_profiles (
    id, display_name, provider_family, mechanism, auth_class, allowed_hosts, evidence_url,
    evidence_hash, evidence_captured_at, visibility_filter, content_scope, cadence_min_minutes,
    cadence_max_minutes, robots_handling, removal_semantics, evidence_lease_days,
    default_compliance_state, default_operational_state
  ) VALUES (
    'greenhouse', 'Greenhouse', 'greenhouse', 'ats_api', 'none', 'boards-api.greenhouse.io',
    'https://developers.greenhouse.io/job-board.html', '${"b".repeat(64)}',
    strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'published', 'minimal', 1440, 2880, 'enforce',
    'remove on disappearance', 30, 'needs_review', 'candidate'
  )`);
  const db = new BunGatewayDatabase(sqlite) as TransitionGatewayDatabase & AdmissionDatabase;
  const fixture = await liveAdmissionFixture();
  const result = await admitReviewedSourceToShadow(db, {
    now: new Date().toISOString(),
    source: fixture.source,
    provider: fixture.provider,
    probe: fixture.packet.probe,
    primaryEvidence: fixture.packet.primaryEvidence,
    adjudicationRef: fixture.packet.adjudicationRef,
  });
  expect(result).toEqual({ ok: true, sourceId: fixture.source.sourceId });
  const row = sqlite.query(`SELECT operational_state FROM source_registry WHERE source_id=?`)
    .get(fixture.source.sourceId) as { operational_state: string };
  expect(row.operational_state).toBe("shadow");
});

test("refuses to start admission from a non-candidate operational state", async () => {
  const sqlite = freshDb();
  const db = new BunGatewayDatabase(sqlite) as TransitionGatewayDatabase & AdmissionDatabase;
  const fixture = await liveAdmissionFixture();
  const result = await admitReviewedSourceToShadow(db, {
    now: new Date().toISOString(),
    source: { ...fixture.source, operationalState: "active" },
    provider: fixture.provider,
    probe: fixture.packet.probe,
    primaryEvidence: fixture.packet.primaryEvidence,
    adjudicationRef: fixture.packet.adjudicationRef,
  });
  expect(result).toEqual({ ok: false, reason: "admission starts from candidate, not a live operational state" });
});

test("shared provider mismatch requires renewal without orphaning a candidate or changing existing evidence", async () => {
  const sqlite = freshDb();
  const db = new BunGatewayDatabase(sqlite) as TransitionGatewayDatabase & AdmissionDatabase;
  const fixture = await liveAdmissionFixture();
  const input = {
    now: new Date().toISOString(), source: fixture.source, provider: fixture.provider,
    probe: fixture.packet.probe, primaryEvidence: fixture.packet.primaryEvidence,
    adjudicationRef: fixture.packet.adjudicationRef,
  };
  expect((await admitReviewedSourceToShadow(db, input)).ok).toBe(true);
  const before = {
    providers: sqlite.query("SELECT * FROM provider_profiles").all(),
    sources: sqlite.query("SELECT * FROM source_registry").all(),
    evidence: sqlite.query("SELECT * FROM source_admission_evidence").all(),
  };
  const source = { ...fixture.source, sourceId: "greenhouse:second", companyToken: "second",
    endpointUrl: "https://boards-api.greenhouse.io/v1/boards/second/jobs" };
  const probe = { ...input.probe, sourceId: source.sourceId,
    endpoint: { ...input.probe.endpoint, url: source.endpointUrl } };
  for (const proposal of [
    { ...fixture.provider, evidenceHash: "b".repeat(64) },
    { ...fixture.provider, evidenceCapturedAt: new Date(Date.parse(fixture.provider.evidenceCapturedAt!) - 1000).toISOString() },
    { ...fixture.provider, removalSemantics: "Different reviewed removal policy" },
  ]) {
    const result = await admitReviewedSourceToShadow(db, { ...input, source, probe, provider: proposal });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("Shared provider evidence renewal required");
    expect(sqlite.query("SELECT * FROM provider_profiles").all()).toEqual(before.providers);
    expect(sqlite.query("SELECT * FROM source_registry").all()).toEqual(before.sources);
    expect(sqlite.query("SELECT * FROM source_admission_evidence").all()).toEqual(before.evidence);
  }
  // The rejection left no duplicate identity behind; matching reviewed evidence
  // still permits a second company on this provider without invalidating the first.
  expect(await admitReviewedSourceToShadow(db, { ...input, source, probe })).toEqual({ ok: true, sourceId: source.sourceId });
  expect(sqlite.query("SELECT * FROM provider_profiles").all()).toEqual(before.providers);
  expect(sqlite.query("SELECT * FROM source_admission_evidence WHERE source_id=?").all(fixture.source.sourceId)).toEqual(before.evidence);
});
