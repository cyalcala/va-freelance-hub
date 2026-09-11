import { describe, expect, test } from "bun:test";
import { sourceRegistry, sourceShadowObservations } from "@va-hub/db";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { createShadowDispatchHandler } from "../src/pages/api/cron/shadow-dispatch";
import { SHADOW_VERSION, type CandidateShadowInput, type CandidateShadowResult } from "../../../packages/scraper/candidate-shadow";
import type { CurrentAdmissionEvidenceResult } from "../../../packages/scraper/admission-evidence";

const NOW = "2026-09-05T12:00:00.000Z";
const LEASE = "2026-10-05T12:00:00.000Z";
const source = { sourceId: "test:source", providerId: "test-provider", displayName: "Test company", endpointUrl: "https://jobs.example.com/api/jobs",
  companyToken: null, discoveryProvenance: null, complianceState: "allowed", operationalState: "shadow", reviewDeadline: LEASE,
  policyExpiry: LEASE, optOut: false, governanceRevision: 1, lastTransitionHash: "ENTRY1", canaryMaxNewItemsPerTick: 3 };
const provider = { id: "test-provider", providerFamily: "test", mechanism: "public_json_api", authClass: "none", endpointPattern: null,
  allowedHosts: "jobs.example.com", evidenceUrl: "https://jobs.example.com/api/docs", visibilityFilter: "public", contentScope: "minimal",
  cadenceMinMinutes: 60, cadenceMaxMinutes: 1440, rateGuidance: null, robotsHandling: "enforce", evidenceLeaseDays: 180 };

function admission(): CurrentAdmissionEvidenceResult {
  // The authority loader is independently tested against immutable packets;
  // this route fixture exercises how its validated result reaches dispatch.
  return { ok: true, source: { ...source }, provider: { ...provider },
    evidence: { id: 41, expiresAt: LEASE }, packet: {} } as CurrentAdmissionEvidenceResult;
}

function probe(input: CandidateShadowInput): CandidateShadowResult {
  return {
    version: SHADOW_VERSION, timestamp: NOW, sourceId: input.sourceId, providerId: input.providerId, displayName: input.displayName,
    endpoint: { url: input.endpointUrl, isHttps: true, host: "jobs.example.com", allowedHosts: input.provider.allowedHosts ?? null, hostValid: true },
    auth: { class: "none", supported: true }, visibility: { filter: "public", isPublic: true, ambiguous: false },
    provenance: { discoveryProvenance: null, evidenceUrl: input.provider.evidenceUrl ?? null, providerFamily: "test", mechanism: "public_json_api" },
    cadence: { minMinutes: 60, maxMinutes: 1440, rateGuidance: null }, robots: { checked: true, verdict: "allowed", wouldBlock: false },
    fetch: { attempted: true, status: 200, bytesReceived: 10 }, parse: { attempted: true, schemaHealth: "ok", itemCount: 1 },
    sampleFunnel: { bytesReceived: 10, parsedItems: 1, plausibleItems: 1, truncated: false, budgetExceeded: false },
    diagnostic: { outcome: "HEALTHY_WITH_RESULTS", requestCount: 2, bytesReceived: 10, durationMs: 2, probes: [], mutations: 0, shadowMode: true },
  };
}

function requestContext(binding: unknown, authorized = true) {
  return { request: new Request("https://remotejobs.ph/api/cron/shadow-dispatch", {
    method: "POST", headers: authorized ? { Authorization: "Bearer test-secret" } : {},
  }), locals: { runtime: { env: { DB: binding, CRON_SECRET: "test-secret" } } } } as any;
}

function database(options: { empty?: boolean; writeSuccess?: boolean; writeError?: boolean; historyError?: boolean } = {}) {
  const reads: string[] = [];
  const writes: Array<Record<string, unknown>> = [];
  const conditions: Array<{ sql: string; params: unknown[] }> = [];
  const db = {
    async all() { reads.push("registry"); return options.empty ? [] : [{ ...source }]; },
    select() {
      return { from(table: unknown) {
        if (table === sourceRegistry) { reads.push("registry"); return Promise.resolve(options.empty ? [] : [{ ...source }]); }
        if (table !== sourceShadowObservations) throw new Error("unexpected table read");
        reads.push("observations");
        return { async where(condition: any) {
          if (options.historyError) throw new Error("history unavailable");
          conditions.push(new SQLiteSyncDialect().sqlToQuery(condition));
          return [{ lastObservedAt: null }];
        } };
      } };
    },
    insert(table: unknown) {
      expect(table).toBe(sourceShadowObservations);
      return { async values(record: Record<string, unknown>) {
        if (options.writeError) throw new Error("source evidence revision changed");
        writes.push(record);
        return { success: options.writeSuccess ?? true };
      } };
    },
  };
  return { db, reads, writes, conditions };
}

describe("shadow route current-evidence boundary", () => {
  test("unauthorized requests do no database work", async () => {
    let reads = 0;
    const handler = createShadowDispatchHandler({ getDb: () => { reads++; throw new Error("must not read"); },
      loadAdmissionEvidence: async () => { throw new Error("must not authorize"); }, runProbe: async input => probe(input) });
    expect((await handler(requestContext({}, false))).status).toBe(401);
    expect(reads).toBe(0);
  });
  test("missing native D1 binding fails closed", async () => {
    const handler = createShadowDispatchHandler({ getDb: () => { throw new Error("must not construct"); },
      loadAdmissionEvidence: async () => admission(), runProbe: async input => probe(input) });
    const response = await handler(requestContext(undefined));
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  test("empty registry remains a measured zero-dispatch result", async () => {
    const { db, reads, writes } = database({ empty: true });
    const handler = createShadowDispatchHandler({ getDb: () => db as any,
      loadAdmissionEvidence: async () => { throw new Error("must not load evidence"); }, runProbe: async () => { throw new Error("must not fetch"); } });
    const response = await handler(requestContext({}));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ totalRegistryRows: 0, dispatched: 0 });
    expect(reads).toEqual(["registry"]); expect(writes).toEqual([]);
  });
  for (const reason of ["current durable opt-out blocks admission", "current immutable admission evidence is unavailable", "current admission evidence could not be read or validated"]) {
    test(`${reason} prevents probes and writes`, async () => {
      const { db, reads, writes } = database();
      let probes = 0;
      const handler = createShadowDispatchHandler({ getDb: () => db as any,
        loadAdmissionEvidence: async () => ({ ok: false, reason }), runProbe: async input => { probes++; return probe(input); } });
      const response = await handler(requestContext({}));
      expect(await response.json()).toMatchObject({ dispatched: 0, skippedInvalidEvidence: 1 });
      expect(probes).toBe(0); expect(reads).toEqual(["registry"]); expect(writes).toEqual([]);
    });
  }
  test("passes native binding to authority loader and scopes cadence to evidence plus entry", async () => {
    const { db, writes, conditions } = database();
    const nativeBinding = { prepare: () => { throw new Error("injected loader should receive this binding without executing it"); } };
    const handler = createShadowDispatchHandler({ getDb: () => db as any, now: () => new Date(NOW),
      loadAdmissionEvidence: async (binding, id, asOf) => {
        expect(binding).toBe(nativeBinding); expect(id).toBe(source.sourceId); expect(asOf).toBe(NOW); return admission();
      }, runProbe: async input => probe(input) });
    const response = await handler(requestContext(nativeBinding));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ dispatched: 1, outcomes: { HEALTHY_WITH_RESULTS: 1 } });
    expect(conditions[0].params).toEqual([source.sourceId, 41, "ENTRY1"]);
    expect(conditions[0].sql).toContain("admission_evidence_id");
    expect(conditions[0].sql).toContain("shadow_entry_hash");
    expect(writes[0]).toMatchObject({ admissionEvidenceId: 41, shadowEntryHash: "ENTRY1", observedAt: NOW });
  });
  for (const failure of [{ writeSuccess: false }, { writeError: true }, { historyError: true }]) {
    test(`storage failure ${JSON.stringify(failure)} cannot report a successful dispatch`, async () => {
      const { db } = database(failure);
      const handler = createShadowDispatchHandler({ getDb: () => db as any, now: () => new Date(NOW),
        loadAdmissionEvidence: async () => admission(), runProbe: async input => probe(input) });
      const response = await handler(requestContext({}));
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: "Shadow dispatch evidence or observation storage unavailable" });
    });
  }

  test("uses injected createRobotsStore when provided", async () => {
    const { db } = database();
    let robotsStoreCreated = 0;
    const mockStore = {
      get: async () => null,
      put: async () => {},
    };
    const handler = createShadowDispatchHandler({
      getDb: () => db as any,
      now: () => new Date(NOW),
      loadAdmissionEvidence: async () => admission(),
      runProbe: async (input, options: any) => {
        expect(options.robotsStore).toBe(mockStore);
        return probe(input);
      },
      createRobotsStore: (injectedDb) => {
        expect(injectedDb).toBe(db as any);
        robotsStoreCreated++;
        return mockStore;
      },
    });
    const response = await handler(requestContext({}));
    expect(response.status).toBe(200);
    expect(robotsStoreCreated).toBe(1);
  });
});

