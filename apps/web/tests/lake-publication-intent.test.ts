import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { POST } from "../src/pages/api/ingest";
import { parseLakeStageRequest } from "../src/lib/lake-publication-contract";
import { stageLakePublicationIntent } from "../src/lib/lake-publication-intent";

const candidate = { lakeCandidateId: 1, lakeFingerprint: "fixture-1", title: "Support role",
  company: "Fixture", sourceUrl: "https://example.com/jobs/1", applicationUrl: null,
  sourcePlatform: "Fixture", locationType: "unknown", locationRaw: null, postedAt: null, evidenceText: null };
const body = (overrides: Record<string, unknown> = {}) => ({ operation: "lake-stage", version: 1,
  operationId: "fixture-intent-1", sourceId: "greenhouse:janes", candidates: [candidate], ...overrides });

function fixture() {
  const sqlite = new Database(":memory:");
  sqlite.exec(readFileSync(new URL("../../../packages/db/migrations/0055_lake_publication_operations.sql", import.meta.url), "utf8"));
  const queries: string[] = [];
  const binding: any = {
    prepare(sql: string) {
      return { sql, values: [] as any[], bind(...values: any[]) { return { ...this, values }; },
        async first() { queries.push(sql); return sqlite.query(sql).get(...this.values); },
        async run() { queries.push(sql); return { success: true, results: sqlite.query(sql).all(...this.values) }; },
        async all() { return this.run(); } };
    },
    async batch(statements: any[]) {
      return sqlite.transaction(() => statements.map(statement => {
        queries.push(statement.sql);
        return { success: true, results: sqlite.query(statement.sql).all(...statement.values) };
      }))();
    },
  };
  return { sqlite, queries, binding };
}

async function send(binding: any, value = body(), secret = "fixture-secret") {
  return POST({ request: new Request("https://example.com/api/ingest", { method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` }, body: JSON.stringify(value) }),
    locals: { runtime: { env: { DB: binding, PROXY_SECRET: "fixture-secret" } } } } as any);
}

const count = (sqlite: Database) => (sqlite.query("SELECT count(*) AS n FROM lake_publication_operations").get() as { n: number }).n;
async function intent(value = body()) {
  const parsed = await parseLakeStageRequest(value);
  if (!parsed.ok) throw new Error(parsed.message);
  return { operationId: parsed.request.operationId, sourceId: parsed.request.sourceId,
    manifestHash: parsed.manifestHash, candidateDescriptorsJson: parsed.candidateDescriptorsJson };
}

test("authenticated lake intent stores a private manifest with zero public effects", async () => {
  const db = fixture();
  try {
    const response = await send(db.binding);
    expect(response.status).toBe(200);
    const output = await response.json() as any;
    expect(output).toMatchObject({ state: "STAGED", publishedCount: 0, syncedCount: 0,
      publicationAuthorized: false, operationId: "fixture-intent-1" });
    expect(JSON.stringify(output)).not.toContain("opportunityId");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(count(db.sqlite)).toBe(1);
    const stored = db.sqlite.query("SELECT * FROM lake_publication_operations").get() as any;
    expect(stored.staged_at).toBe(output.stagedAt);
    expect(stored.revision).toBe(0);
    expect([stored.source_identity_hash, stored.publication_tick_key, stored.committed_receipt_key, stored.committed_outcomes_json]).toEqual([null, null, null, null]);
    expect(Object.keys(JSON.parse(stored.candidate_descriptors_json)[0])).toEqual(["lakeCandidateId", "lakeFingerprint", "sourceUrl", "materialSha256"]);
    expect(stored.candidate_descriptors_json).not.toContain("Support role");
    expect(db.queries.every(sql => !/\b(opportunities|source_publication_ledger|source_registry)\b/.test(sql))).toBe(true);
  } finally { db.sqlite.close(); }
});

test("unauthorized, unsupported or forged lake modes never access the database or fall through items", async () => {
  const db = fixture();
  try {
    expect((await send(db.binding, body(), "wrong-secret")).status).toBe(401);
    for (const value of [body({ operation: "lake-commit", items: [{ title: "Do not publish" }] }),
      body({ operation: null, items: [] }), body({ items: [] }), body({ publicationAuthorized: true }),
      body({ candidates: [{ ...candidate, isActive: true }] })]) {
      expect((await send(db.binding, value)).status).toBe(400);
    }
    expect(db.queries).toEqual([]);
    expect(count(db.sqlite)).toBe(0);
  } finally { db.sqlite.close(); }
});

test("staging preserves explicit unknown, onsite and future facts without clearance", async () => {
  const db = fixture();
  try {
    const response = await send(db.binding, body({ candidates: [
      { ...candidate, company: null, locationType: "onsite", postedAt: "2099-01-01T00:00:00.000Z", evidenceText: "Unverified client claim" },
    ] }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ publishedCount: 0, syncedCount: 0, publicationAuthorized: false });
    expect(count(db.sqlite)).toBe(1);
  } finally { db.sqlite.close(); }
});

test("reordered and concurrent exact retries retain one manifest and its original server clock", async () => {
  const db = fixture();
  try {
    const second = { ...candidate, lakeCandidateId: 2, lakeFingerprint: "fixture-2", sourceUrl: "https://example.com/jobs/2" };
    const outputs = await Promise.all([body({ candidates: [second, candidate] }), body({ candidates: [candidate, second] }),
      body({ candidates: [candidate, second] })].map(async value => {
      const response = await send(db.binding, value);
      expect(response.status).toBe(200);
      return response.json() as Promise<any>;
    }));
    expect(new Set(outputs.map(value => value.manifestHash)).size).toBe(1);
    expect(new Set(outputs.map(value => value.stagedAt)).size).toBe(1);
    expect(count(db.sqlite)).toBe(1);
    const replay = await send(db.binding, body({ candidates: [candidate, second] }));
    expect(await replay.json()).toMatchObject({ stagedAt: outputs[0].stagedAt, revision: 0, manifestHash: outputs[0].manifestHash });
  } finally { db.sqlite.close(); }
});

test("a stable key cannot be rebound to changed material or source", async () => {
  const db = fixture();
  try {
    const original = await (await send(db.binding)).json();
    for (const value of [body({ sourceId: "greenhouse:other" }), body({ candidates: [{ ...candidate, title: "Changed" }] }),
      body({ candidates: [{ ...candidate, lakeFingerprint: "changed" }] }), body({ candidates: [{ ...candidate, evidenceText: "New evidence" }] })]) {
      const response = await send(db.binding, value);
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ ok: false, code: "MANIFEST_CONFLICT" });
    }
    expect(count(db.sqlite)).toBe(1);
    expect(await (await send(db.binding)).json()).toEqual(original);
  } finally { db.sqlite.close(); }
});

test("missing native batch and oversized byte manifests stop before database access", async () => {
  let touched = false;
  const invalidBinding = { prepare() { touched = true; throw new Error("unexpected I/O"); } };
  const missing = await send(invalidBinding);
  expect(missing.status).toBe(503);
  expect(await missing.json()).toMatchObject({ code: "STAGING_BINDING_UNAVAILABLE" });
  expect(touched).toBe(false);
  const candidates = Array.from({ length: 200 }, (_, i) => ({ ...candidate, lakeCandidateId: i + 1,
    sourceUrl: `https://example.com/${i}/${"x".repeat(1500)}` }));
  const oversized = await send({ ...invalidBinding, async batch() { touched = true; throw new Error("unexpected I/O"); } }, body({ candidates }));
  expect(oversized.status).toBe(413);
  expect(await oversized.json()).toMatchObject({ code: "STAGING_MANIFEST_TOO_LARGE" });
  expect(touched).toBe(false);
  const utf8 = await stageLakePublicationIntent({ ...invalidBinding, async batch() { throw new Error("unexpected I/O"); } } as any,
    { ...await intent(), candidateDescriptorsJson: "é".repeat(131073) });
  expect(utf8).toMatchObject({ status: 413, code: "STAGING_MANIFEST_TOO_LARGE" });
});

test("lost or malformed acknowledgement recovers only the exact durable private record", async () => {
  for (const failure of ["throw", "malformed", "malformed-selected-row"] as const) {
    const db = fixture();
    try {
      const lossy = { ...db.binding, async batch(statements: any[]) {
        const results = await db.binding.batch(statements);
        if (failure === "throw") throw new Error("response lost after commit");
        if (failure === "malformed-selected-row") {
          results[2].results[0].revision = "0";
          return results;
        }
        return [{ success: false }];
      } };
      const response = await send(lossy);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ recoveredAcknowledgement: true, publishedCount: 0, syncedCount: 0, publicationAuthorized: false });
      expect(count(db.sqlite)).toBe(1);
      expect((await send(db.binding)).status).toBe(200);
      expect(count(db.sqlite)).toBe(1);
    } finally { db.sqlite.close(); }
  }
});

test("a statement failure rolls back private insert and returns UNKNOWN without inventing an outcome", async () => {
  const db = fixture();
  try {
    const broken = { ...db.binding, async batch(statements: any[]) {
      const failingGuard = db.binding.prepare("SELECT json('injected batch failure')");
      return db.binding.batch([statements[0], failingGuard, statements[2]]);
    } };
    const response = await send(broken);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, code: "STAGING_COMMIT_UNKNOWN" });
    expect(count(db.sqlite)).toBe(0);
    expect((await send(db.binding)).status).toBe(200);
    expect(count(db.sqlite)).toBe(1);
  } finally { db.sqlite.close(); }
});

test("ambiguous commit with unavailable readback stays UNKNOWN and later retries the same key", async () => {
  const db = fixture();
  try {
    const inaccessible = { ...db.binding,
      prepare(sql: string) { const statement = db.binding.prepare(sql); return { ...statement,
        bind(...values: any[]) { return { ...statement.bind(...values), async first() { throw new Error("readback unavailable"); } }; } }; },
      async batch(statements: any[]) { await db.binding.batch(statements); throw new Error("ack unavailable"); } };
    const response = await send(inaccessible);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "STAGING_COMMIT_UNKNOWN" });
    expect(count(db.sqlite)).toBe(1);
    expect((await send(db.binding)).status).toBe(200);
    expect(count(db.sqlite)).toBe(1);
  } finally { db.sqlite.close(); }
});

test("corrupt durable readback remains UNKNOWN rather than a confirmed conflict", async () => {
  const db = fixture();
  try {
    await send(db.binding);
    const row = await db.binding.prepare(`SELECT operation_key AS operationId,source_id AS sourceId,manifest_hash AS manifestHash,
      candidate_descriptors_json AS candidateDescriptorsJson,staged_at AS stagedAt,revision,
      source_identity_hash AS sourceIdentityHash,publication_tick_key AS publicationTickKey,
      committed_receipt_key AS committedReceiptKey,committed_outcomes_json AS committedOutcomesJson FROM lake_publication_operations`).first();
    for (const corrupt of [{ ...row, revision: "0" }, { ...row, stagedAt: "bad" }, { ...row, sourceIdentityHash: undefined },
      { ...row, operationId: "different-key" }, { ...row, candidateDescriptorsJson: "invalid JSON" },
      { ...row, committedReceiptKey: "receipt", committedOutcomesJson: null }]) {
      const binding = { prepare() { return { bind() { return { async first() { return corrupt; } }; } }; },
        async batch() { throw new Error("missing acknowledgement"); } };
      const result = await stageLakePublicationIntent(binding as any, await intent());
      expect(result).toMatchObject({ ok: false, status: 503, code: "STAGING_COMMIT_UNKNOWN" });
    }
  } finally { db.sqlite.close(); }
});

test("staging cannot report a later-revision record as a fresh stage or reset its controls", async () => {
  const db = fixture();
  try {
    expect((await send(db.binding)).status).toBe(200);
    db.sqlite.query("UPDATE lake_publication_operations SET revision=1, source_identity_hash=? WHERE operation_key=?")
      .run("a".repeat(64), "fixture-intent-1");
    const replay = await send(db.binding);
    expect(replay.status).toBe(409);
    expect(await replay.json()).toMatchObject({ code: "OPERATION_STATE_CONFLICT" });
    expect(db.sqlite.query("SELECT revision, source_identity_hash FROM lake_publication_operations").get())
      .toEqual({ revision: 1, source_identity_hash: "a".repeat(64) });
  } finally { db.sqlite.close(); }
});
