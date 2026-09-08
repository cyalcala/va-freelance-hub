import { afterEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";
import { getDb } from "@va-hub/db";
import { createShadowDispatchHandler } from "../src/pages/api/cron/shadow-dispatch";
import { admitReviewedSourceToShadow } from "../../../packages/scraper/source-admission";
import { buildAdmissionEvidence, loadCurrentAdmissionEvidence, persistAdmissionEvidence } from "../../../packages/scraper/admission-evidence";
import { defaultRunProbe, MAX_DISPATCHES_PER_RUN } from "../../../packages/scraper/shadow-dispatcher";
import { SHADOW_MAX_REQUESTS } from "../../../packages/scraper/candidate-shadow";
import { liveAdmissionFixture } from "../../../packages/scraper/test-fixtures/admission";

// Use the real Drizzle D1 driver against migrated SQLite. Count executed
// prepared statements at the native-binding boundary, including loader reads,
// rather than counting high-level mocks that could hide extra D1 requests.
class CountingD1 {
  statements: Array<{ sql: string; parameters: unknown[] }> = [];
  constructor(readonly sqlite: Database) {}
  prepare(sql: string) {
    const binding = this;
    let parameters: unknown[] = [];
    const record = () => { binding.statements.push({ sql, parameters: [...parameters] }); };
    return {
      bind(...values: unknown[]) { parameters = values; return this; },
      async first<T>() {
        record();
        return (binding.sqlite.query(sql).get(...parameters as any[]) ?? null) as T | null;
      },
      async all() {
        record();
        return { success: true, results: binding.sqlite.query(sql).all(...parameters as any[]), meta: {} };
      },
      async raw() {
        record();
        return binding.sqlite.query(sql).values(...parameters as any[]);
      },
      async run() {
        record();
        const result = binding.sqlite.query(sql).run(...parameters as any[]);
        return { success: true, results: [], meta: { changes: result.changes, last_row_id: Number(result.lastInsertRowid) } };
      },
    };
  }
}

const databases: Database[] = [];
afterEach(() => { for (const database of databases.splice(0)) database.close(); });

async function setup(count: number) {
  const fixture = await liveAdmissionFixture();
  const clock = { iso: fixture.packet.capturedAt, windowIso: fixture.packet.capturedAt };
  const sqlite = new Database(":memory:");
  databases.push(sqlite);
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const file of ["0036_registry_foundation.sql", "0037_source_lifecycle_opt_out.sql", "0038_shadow_observations.sql",
    "0039_canary_transition_plane.sql", "0040_current_evidence_admission.sql", "0041_publication_ledger.sql", "0042_d1_like_glob_limit.sql"]) {
    sqlite.exec(readFileSync(join(import.meta.dir, "../../../packages/db/migrations", file), "utf8"));
  }
  const binding = new CountingD1(sqlite);
  const ids: string[] = [];
  for (let index = 0; index < count; index++) {
    const token = `capacity${String(index).padStart(3, "0")}`;
    const source = { ...fixture.source, sourceId: `greenhouse:${token}`, companyToken: token,
      endpointUrl: `https://boards-api.greenhouse.io/v1/boards/${token}/jobs` };
    const probe = { ...fixture.packet.probe, sourceId: source.sourceId,
      endpoint: { ...fixture.packet.probe.endpoint, url: source.endpointUrl } };
    const admitted = await admitReviewedSourceToShadow(binding, {
      source, provider: fixture.provider, probe, primaryEvidence: fixture.packet.primaryEvidence,
      adjudicationRef: "test-only-shadow-capacity", now: clock.iso,
    });
    if (!admitted.ok) throw new Error(`Fixture admission failed: ${admitted.reason}`);
    ids.push(source.sourceId);
  }
  const externalRequests: string[] = [];
  const probedSources: string[] = [];
  let nowCalls = 0;
  const handler = createShadowDispatchHandler({
    getDb, loadAdmissionEvidence: loadCurrentAdmissionEvidence,
    // Advance the enumeration hour independently of observation timestamps so
    // unmodified SQL wall-clock guards can run without sleeping for an hour.
    now: () => new Date(nowCalls++ === 0 ? clock.windowIso : clock.iso),
    runProbe: async input => {
      probedSources.push(input.sourceId);
      const result = await defaultRunProbe(input, {
        now: () => new Date(clock.iso),
        fetchImpl: (async (url: RequestInfo | URL) => {
          externalRequests.push(String(url));
          if (String(url).endsWith("/robots.txt")) return new Response("User-agent: *\nAllow: /");
          return Response.json({ jobs: [{ title: "Worldwide support specialist", absolute_url: "https://example.com/apply" }] });
        }) as typeof fetch,
      });
      // The probe's timestamp currently uses Date directly; align it with the
      // virtual route/SQL clock while preserving its real parsing and requests.
      return { ...result, timestamp: clock.iso };
    },
  });
  const run = async () => {
    nowCalls = 0;
    binding.statements.length = 0;
    externalRequests.length = 0;
    probedSources.length = 0;
    const response = await handler({ request: new Request("https://example.com/api/cron/shadow-dispatch", {
      method: "POST", headers: { Authorization: "Bearer capacity-test" },
    }), locals: { runtime: { env: { DB: binding, CRON_SECRET: "capacity-test" } } } } as any);
    expect(response.status).toBe(200);
    return await response.json();
  };
  return { sqlite, binding, ids, clock, externalRequests, probedSources, run };
}

test("12 due shadows consume exactly 37 real SQL statements and 24 mocked external requests", async () => {
  const state = await setup(12);
  expect(MAX_DISPATCHES_PER_RUN).toBe(12);
  expect(SHADOW_MAX_REQUESTS).toBe(2);
  const summary = await state.run();
  expect(summary).toMatchObject({ totalRegistryRows: 12, dispatched: 12, rejectedProbeResults: 0,
    probeFailures: 0, outcomes: { HEALTHY_WITH_RESULTS: 12 }, registryWindow: { limit: 12 } });
  expect(state.binding.statements).toHaveLength(37);
  expect(state.externalRequests).toHaveLength(24);
  expect(state.probedSources).toHaveLength(12);
  expect(state.sqlite.query("SELECT COUNT(*) AS n FROM source_shadow_observations").get()).toEqual({ n: 12 });
  expect(state.binding.statements.filter(entry => /^insert into "source_shadow_observations"/i.test(entry.sql))).toHaveLength(12);
});

test("invalid first window remains bounded and cannot starve the next hourly window", async () => {
  const state = await setup(24);
  const windowIndex = Math.floor(Date.parse(state.clock.iso) / 3_600_000) % 2;
  const invalidIds = state.ids.slice(windowIndex * 12, (windowIndex + 1) * 12);
  for (const id of invalidIds) {
    // Real governance revision bump invalidates the old immutable packet.
    state.sqlite.query("UPDATE source_registry SET display_name='New unreviewed identity' WHERE source_id=?").run(id);
  }
  const first = await state.run();
  expect(first).toMatchObject({ totalRegistryRows: 12, dispatched: 0, skippedInvalidEvidence: 12 });
  expect(first.evidenceErrors).toHaveLength(12);
  expect(state.binding.statements).toHaveLength(13);
  expect(state.externalRequests).toHaveLength(0);
  state.clock.windowIso = new Date(Date.parse(state.clock.iso) + 3_600_000).toISOString();
  const second = await state.run();
  expect(second).toMatchObject({ totalRegistryRows: 12, dispatched: 12, rejectedProbeResults: 0 });
  expect(state.binding.statements).toHaveLength(37);
  expect(state.externalRequests).toHaveLength(24);
  expect([...state.probedSources].sort()).toEqual(state.ids.filter(id => !invalidIds.includes(id)));
});

test("12 cadence-held shadows perform 25 statements and no external requests", async () => {
  const state = await setup(12);
  expect((await state.run()).dispatched).toBe(12);
  const held = await state.run();
  expect(held).toMatchObject({ totalRegistryRows: 12, dispatched: 0, skippedIneligible: 12 });
  expect(state.binding.statements).toHaveLength(25);
  expect(state.externalRequests).toHaveLength(0);
  expect(state.sqlite.query("SELECT COUNT(*) AS n FROM source_shadow_observations").get()).toEqual({ n: 12 });
});

test("the one-statement authority loader selects current evidence and cadence ignores the prior epoch", async () => {
  const state = await setup(1);
  expect((await state.run()).dispatched).toBe(1);
  state.binding.statements.length = 0;
  const prior = await loadCurrentAdmissionEvidence(state.binding, state.ids[0], state.clock.iso);
  expect(state.binding.statements).toHaveLength(1);
  if (!prior.ok) throw new Error(prior.reason);
  state.clock.iso = new Date(Date.parse(state.clock.iso) + 1000).toISOString();
  const built = await buildAdmissionEvidence({ source: prior.source, provider: prior.provider,
    probe: { ...prior.packet.probe, timestamp: state.clock.iso }, primaryEvidence: prior.packet.primaryEvidence,
    authorityActions: prior.packet.authorityActions, adjudicationRef: "test-only-fresh-observation-epoch",
    capturedAt: state.clock.iso, expiresAt: prior.packet.expiresAt });
  if (!built.ok) throw new Error(built.reason);
  const saved = await persistAdmissionEvidence(state.binding, prior.source, prior.provider, built, state.clock.iso);
  if (!saved.ok) throw new Error(saved.reason);
  state.binding.statements.length = 0;
  const current = await loadCurrentAdmissionEvidence(state.binding, state.ids[0], state.clock.iso);
  expect(state.binding.statements).toHaveLength(1);
  if (!current.ok) throw new Error(current.reason);
  expect(current.evidence.id).toBeGreaterThan(prior.evidence.id);
  expect((await state.run()).dispatched).toBe(1);
  expect(state.binding.statements).toHaveLength(4);
  expect(state.externalRequests).toHaveLength(2);
  expect(state.sqlite.query("SELECT COUNT(DISTINCT admission_evidence_id) AS epochs FROM source_shadow_observations").get()).toEqual({ epochs: 2 });
});
