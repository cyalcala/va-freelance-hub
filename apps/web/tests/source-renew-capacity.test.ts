import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createSourceRenewHandler } from "../src/pages/api/cron/source-renew";
import { fetchPrimaryEvidence } from "../src/lib/primary-evidence";
import { admitReviewedSourceToShadow } from "../../../packages/scraper/source-admission";
import { runCandidateShadowProbe } from "../../../packages/scraper/candidate-shadow";
import { liveAdmissionFixture } from "../../../packages/scraper/test-fixtures/admission";
import { renewProviderEvidence, MAX_RENEWAL_IDENTITIES, MAX_RENEWAL_PRIMARY_DOCUMENTS } from "../../../packages/scraper/source-evidence-renewal";
import type { AdmissionDatabase, AdmissionStatement } from "../../../packages/scraper/admission-evidence";

class CountedStatement implements AdmissionStatement {
  private values: unknown[] = [];
  constructor(readonly db: CountedDb, readonly sql: string) {}
  bind(...values: unknown[]) { this.values = values; return this; }
  async first<T>() {
    this.db.queries.push(this.sql);
    return (this.db.sqlite.query(this.sql).get(...this.values as any[]) ?? null) as T | null;
  }
  execute() {
    this.db.queries.push(this.sql);
    const results = this.db.sqlite.query(this.sql).all(...this.values as any[]);
    return { success: true, results };
  }
  async all() { return this.execute(); }
  async run() { return this.execute(); }
}
class CountedDb {
  queries: string[] = [];
  constructor(readonly sqlite: Database) {}
  prepare(sql: string) { return new CountedStatement(this, sql); }
  async batch(statements: AdmissionStatement[]) {
    // Count each executed SQL statement, not batch() as a single query.
    return this.sqlite.transaction(() => statements.map(statement => (statement as CountedStatement).execute()))();
  }
}

async function fixtureDb(count = MAX_RENEWAL_IDENTITIES, extraDocuments = MAX_RENEWAL_PRIMARY_DOCUMENTS - 1) {
  const sqlite = new Database(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const name of ["0036_registry_foundation.sql", "0037_source_lifecycle_opt_out.sql", "0038_shadow_observations.sql",
    "0039_canary_transition_plane.sql", "0040_current_evidence_admission.sql", "0041_publication_ledger.sql", "0042_d1_like_glob_limit.sql"]) {
    sqlite.exec(readFileSync(join(import.meta.dir, "../../../packages/db/migrations", name), "utf8"));
  }
  const db = new CountedDb(sqlite);
  const fixture = await liveAdmissionFixture();
  const references = Array.from({ length: extraDocuments }, (_, index) => ({
    url: `https://developers.greenhouse.io/reviewed-${index}`,
    contentSha256: "b".repeat(64), capturedAt: fixture.provider.evidenceCapturedAt!,
  }));
  for (let index = 0; index < count; index++) {
    const source = { ...fixture.source, sourceId: `greenhouse:test${index}`, companyToken: `test${index}`,
      endpointUrl: `https://boards-api.greenhouse.io/v1/boards/test${index}/jobs` };
    const result = await admitReviewedSourceToShadow(db, {
      now: new Date().toISOString(), source, provider: fixture.provider,
      probe: { ...fixture.packet.probe, sourceId: source.sourceId, endpoint: { ...fixture.packet.probe.endpoint, url: source.endpointUrl } },
      primaryEvidence: [fixture.packet.primaryEvidence[0], ...references], adjudicationRef: fixture.packet.adjudicationRef,
    });
    expect(result.ok).toBe(true);
  }
  db.queries = [];
  return db;
}
function requestContext(db: CountedDb, body: unknown) {
  return { request: new Request("https://example.com/api/cron/source-renew", {
    method: "POST", headers: { Authorization: "Bearer test", "Content-Type": "application/json" }, body: JSON.stringify(body),
  }), locals: { runtime: { env: { PROXY_SECRET: "test", DB: db } } } } as any;
}

test("six-source renewal uses the real loader, probes and atomic core within per-invocation query/request budgets", async () => {
  const db = await fixtureDb();
  const externalRequests: string[] = [];
  const fetchImpl = (async (input: RequestInfo | URL) => {
    const url = String(input);
    externalRequests.push(url);
    if (url.endsWith("/robots.txt")) return new Response("User-agent: *\nAllow: /", { headers: { "Content-Type": "text/plain" } });
    if (url.startsWith("https://boards-api.greenhouse.io/")) return Response.json({ jobs: [
      { id: 1, title: "Technical Writer", absolute_url: "https://boards.greenhouse.io/test/jobs/1" },
    ] });
    return new Response(`Fresh primary documentation for ${url}`);
  }) as typeof fetch;
  const handler = createSourceRenewHandler({
    capture: url => fetchPrimaryEvidence(url, fetchImpl),
    probe: input => runCandidateShadowProbe(input, { fetchImpl }),
  });
  try {
    const preview = await handler(requestContext(db, { providerId: "greenhouse", mode: "preview" }));
    expect(preview.status).toBe(200);
    const reviewed = await preview.json();
    expect(Object.keys(reviewed.expectedEvidenceIds)).toHaveLength(6);
    expect(db.queries.length).toBe(7);
    expect(externalRequests).toHaveLength(16);
    expect(db.sqlite.query("SELECT COUNT(*) AS n FROM source_admission_evidence").get()).toEqual({ n: 6 });
    const sourcesBefore = db.sqlite.query("SELECT * FROM source_registry ORDER BY source_id").all();
    db.queries = [];
    externalRequests.length = 0;
    const renewed = await handler(requestContext(db, { ...reviewed, mode: "renew" }));
    const result = await renewed.json();
    expect(result).toMatchObject({ ok: true, published: 0, observationWindowRestarted: true });
    expect(renewed.status).toBe(200);
    expect(Object.keys(result.evidenceIds)).toHaveLength(6);
    expect(db.queries.length).toBe(28);
    expect(db.queries.length).toBeLessThanOrEqual(50);
    expect(externalRequests).toHaveLength(28);
    expect(externalRequests.length).toBeLessThanOrEqual(50);
    expect(db.sqlite.query("SELECT * FROM source_registry ORDER BY source_id").all()).toEqual(sourcesBefore);
    expect(db.sqlite.query("SELECT COUNT(*) AS n FROM source_admission_evidence").get()).toEqual({ n: 12 });
    expect(db.sqlite.query("SELECT COUNT(*) AS n FROM source_publication_ledger").get()).toEqual({ n: 0 });
  } finally { db.sqlite.close(); }
});

test("seven identities are rejected by route and core before capture or mutations", async () => {
  const db = await fixtureDb(MAX_RENEWAL_IDENTITIES + 1, 0);
  let externalRequests = 0;
  const handler = createSourceRenewHandler({ capture: async () => { externalRequests++; throw new Error("Unexpected capture"); } });
  try {
    const response = await handler(requestContext(db, { providerId: "greenhouse", mode: "preview" }));
    expect(response.status).toBe(409);
    expect(externalRequests).toBe(0);
    expect(db.queries.length).toBe(1);
    const result = await renewProviderEvidence(db, {
      providerId: "greenhouse", expectedProviderRevision: 1, expectedEvidenceIds: {}, now: new Date().toISOString(),
      captures: [], probes: [], adjudication: { decision: "renew_existing_scope", reference: "fixture-review", reviewedContentHashes: {} },
    });
    expect(result).toMatchObject({ ok: false, reason: "Renewal requires the exact current provider group of 1–6 non-opted-out shadow identities" });
    expect(db.sqlite.query("SELECT COUNT(*) AS n FROM source_admission_evidence").get()).toEqual({ n: 7 });
  } finally { db.sqlite.close(); }
});

test("the distinct-document union is bounded before any capture", async () => {
  const fixture = await liveAdmissionFixture();
  let captures = 0;
  const db = await fixtureDb(2, 0);
  const handler = createSourceRenewHandler({
    load: (async (_db: AdmissionDatabase, sourceId: string) => ({ ...fixture, source: { ...fixture.source, sourceId, operationalState: "shadow" },
      packet: { ...fixture.packet, primaryEvidence: Array.from({ length: 16 }, (_, index) => ({
        ...fixture.packet.primaryEvidence[0], url: `https://example.com/${sourceId}/${index}`,
      })) } })) as any,
    capture: async () => { captures++; return "unexpected"; },
  });
  try {
    const response = await handler(requestContext(db, { providerId: "greenhouse", mode: "preview" }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: "Renewal route supports at most 16 distinct primary documents per provider" });
    expect(captures).toBe(0);
  } finally { db.sqlite.close(); }
});
