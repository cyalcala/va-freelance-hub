import { describe, expect, test } from "bun:test";
import { sourceRegistry, sourceShadowObservations } from "@va-hub/db";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { createShadowDispatchHandler, classifyStorageError } from "../src/pages/api/cron/shadow-dispatch";
import { SHADOW_MAX_BYTES, SHADOW_VERSION, type CandidateShadowInput, type CandidateShadowResult } from "../../../packages/scraper/candidate-shadow";
import type { CurrentAdmissionEvidenceResult } from "../../../packages/scraper/admission-evidence";
import type { AnomalyHistory } from "@va-hub/scraper";

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

const OVERSIZE_BYTES = SHADOW_MAX_BYTES + 24;
const OVERSIZE_STOP = `oversized payload ${OVERSIZE_BYTES} bytes > budget ${SHADOW_MAX_BYTES} — no alternate endpoint attempted`;

function oversizeProbe(input: CandidateShadowInput): CandidateShadowResult {
  return {
    ...probe(input),
    fetch: { attempted: true, status: 200, bytesReceived: OVERSIZE_BYTES },
    parse: { attempted: false, schemaHealth: "not_attempted", itemCount: 0 },
    sampleFunnel: { bytesReceived: OVERSIZE_BYTES, parsedItems: 0, plausibleItems: 0, truncated: true, budgetExceeded: true },
    diagnostic: { outcome: "DEGRADED_ANOMALOUS", requestCount: 2, bytesReceived: OVERSIZE_BYTES, durationMs: 2, probes: [], mutations: 0, shadowMode: true },
    stopReason: OVERSIZE_STOP,
  };
}

function requestContext(binding: unknown, authorized = true, extraEnv: Record<string, unknown> = {}) {
  return { request: new Request("https://remotejobs.ph/api/cron/shadow-dispatch", {
    method: "POST", headers: authorized ? { Authorization: "Bearer test-secret" } : {},
  }), locals: { runtime: { env: { DB: binding, CRON_SECRET: "test-secret", ...extraEnv } } } } as any;
}

function database(options: { empty?: boolean; writeSuccess?: boolean; writeError?: boolean; historyError?: boolean; historyRows?: Array<Record<string, unknown>> } = {}) {
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
          return options.historyRows ?? [{ lastObservedAt: null }];
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

const chronicHistory = (sourceId = "test:source"): Map<string, AnomalyHistory> => new Map([[sourceId, {
  sourceId,
  rows: [
    ...Array.from({ length: 13 }, (_, i) => ({ observedAt: `2026-09-0${i + 1}T12:00:00.000Z`, outcome: "HEALTHY_WITH_RESULTS" as const, plausibleItems: 88, stopReason: null })),
    ...Array.from({ length: 3 }, (_, i) => ({ observedAt: `2026-09-2${i + 1}T12:00:00.000Z`, outcome: "DEGRADED_ANOMALOUS" as const, plausibleItems: 0, stopReason: OVERSIZE_STOP })),
  ],
}]]);

const jevAccepts = { ok: true as const, recommendation: "ACCEPT_NOTES" as const, confidence: 0.93, model: "typesafe/jev-1.13" };

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
      const body = await response.json();
      expect(body.error).toBe("Shadow dispatch evidence or observation storage unavailable");
      expect(typeof body.errorClass).toBe("string");
      expect(body.errorClass.length).toBeGreaterThan(0);
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

describe("shadow route verdict adjudication", () => {
  test("healthy runs carry a healthy verdict without history reads or Jev", async () => {
    const { db, writes } = database();
    let judgeCalled = 0;
    const handler = createShadowDispatchHandler({ getDb: () => db as any, now: () => new Date(NOW),
      loadAdmissionEvidence: async () => admission(), runProbe: async input => probe(input),
      judge: async () => { judgeCalled += 1; return jevAccepts; } });
    const response = await handler(requestContext({}));
    const body = await response.json();
    expect(body.verdict).toMatchObject({ status: "healthy", version: "1.1.0" });
    expect(body.verdict.notes).toEqual([]);
    expect(judgeCalled).toBe(0);
    expect(writes).toHaveLength(1);
  });

  test("chronic 24-byte oversize is deterministically adjudicated without Jev", async () => {
    const { db } = database();
    let judgeCalled = 0;
    let historySourceIds: string[] = [];
    const handler = createShadowDispatchHandler({ getDb: () => db as any, now: () => new Date(NOW),
      loadAdmissionEvidence: async () => admission(), runProbe: async input => oversizeProbe(input),
      loadAnomalyHistory: async (ids) => { historySourceIds = ids; return chronicHistory(); },
      judge: async () => { judgeCalled += 1; throw new Error("must not call Jev for a Tier-1 chronic known limit"); } });
    const response = await handler(requestContext({}));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(historySourceIds).toEqual(["test:source"]);
    expect(judgeCalled).toBe(0);
    expect(body.anomalies).toHaveLength(1);
    expect(body.verdict.status).toBe("healthy_with_notes");
    expect(body.verdict.notes).toEqual([{ sourceId: "test:source", outcome: "DEGRADED_ANOMALOUS", classification: "known_limit_over_budget" }]);
    expect(body.verdict.decision).toBeUndefined();
  });

  test("first-time oversize (Tier 2) with Jev unavailable fails conservatively over HTTP 200", async () => {
    const { db } = database();
    const handler = createShadowDispatchHandler({ getDb: () => db as any, now: () => new Date(NOW),
      loadAdmissionEvidence: async () => admission(), runProbe: async input => oversizeProbe(input),
      loadAnomalyHistory: async () => new Map() });
    const response = await handler(requestContext({}));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.verdict.status).toBe("failed");
    expect(body.verdict.consultationReason).toBe("unavailable");
  });

  test("Tier-2 anomaly with the kill switch fails conservatively", async () => {
    const { db } = database();
    const handler = createShadowDispatchHandler({ getDb: () => db as any, now: () => new Date(NOW),
      loadAdmissionEvidence: async () => admission(), runProbe: async input => oversizeProbe(input),
      loadAnomalyHistory: async () => new Map() });
    const response = await handler(requestContext({}, true, { JEV_ADJUDICATION_DISABLED: "1", OPENROUTER_API_KEY: "env-key" }));
    const body = await response.json();
    expect(body.verdict.status).toBe("failed");
    expect(body.verdict.consultationReason).toBe("disabled");
  });

  test("Jev ACCEPT_NOTES passes a Tier-2 anomaly with a recorded decision", async () => {
    const { db } = database();
    let judgedTask = "";
    const handler = createShadowDispatchHandler({ getDb: () => db as any, now: () => new Date(NOW),
      loadAdmissionEvidence: async () => admission(), runProbe: async input => oversizeProbe(input),
      loadAnomalyHistory: async () => new Map(),
      judge: async (packet: any) => { judgedTask = packet.task; return jevAccepts; } });
    const response = await handler(requestContext({}, true, { OPENROUTER_API_KEY: "env-key" }));
    const body = await response.json();
    expect(judgedTask).toContain("shadow");
    expect(body.verdict.status).toBe("healthy_with_notes");
    expect(body.verdict.notes).toEqual([{ sourceId: "test:source", outcome: "DEGRADED_ANOMALOUS", classification: "candidate_over_budget" }]);
    expect(body.verdict.decision).toMatchObject({ provider: "jev-1.13-openrouter", recommendation: "ACCEPT_NOTES", confidence: 0.93, enforced: "healthy_with_notes", ok: true });
  });

  test("Jev FAIL_CONSERVATIVE fails the verdict", async () => {
    const { db } = database();
    const handler = createShadowDispatchHandler({ getDb: () => db as any, now: () => new Date(NOW),
      loadAdmissionEvidence: async () => admission(), runProbe: async input => oversizeProbe(input),
      loadAnomalyHistory: async () => new Map(),
      judge: async () => ({ ok: true, recommendation: "FAIL_CONSERVATIVE", confidence: 0.9, model: "typesafe/jev-1.13" }) });
    const response = await handler(requestContext({}, true, { OPENROUTER_API_KEY: "env-key" }));
    const body = await response.json();
    expect(body.verdict.status).toBe("failed");
    expect(body.verdict.decision).toMatchObject({ recommendation: "FAIL_CONSERVATIVE", enforced: "failed" });
  });

  test("a recorded decision carries revision, usage, and later-outcome provenance (finding #4)", async () => {
    const { db } = database();
    const handler = createShadowDispatchHandler({ getDb: () => db as any, now: () => new Date(NOW),
      loadAdmissionEvidence: async () => admission(), runProbe: async input => oversizeProbe(input),
      loadAnomalyHistory: async () => new Map(),
      judge: async () => ({ ...jevAccepts, usage: { prompt_tokens: 937, completion_tokens: 88, total_tokens: 1025 } }) });
    const response = await handler(requestContext({}, true, { OPENROUTER_API_KEY: "env-key" }));
    const body = await response.json();
    expect(body.verdict.decision).toMatchObject({
      verdictVersion: "1.1.0",
      usage: { prompt_tokens: 937, completion_tokens: 88, total_tokens: 1025 },
      laterOutcome: null,
    });
  });

  test("an unresolvable anomaly fails without consulting Jev", async () => {
    const { db } = database();
    let judgeCalled = 0;
    const brokenProbe = (input: CandidateShadowInput): CandidateShadowResult => ({
      ...oversizeProbe(input),
      parse: { attempted: true, schemaHealth: "broken", itemCount: 0, error: "unexpected token" },
      diagnostic: { outcome: "SCHEMA_BROKEN", requestCount: 2, bytesReceived: OVERSIZE_BYTES, durationMs: 2, probes: [], mutations: 0, shadowMode: true },
      stopReason: undefined,
    });
    const handler = createShadowDispatchHandler({ getDb: () => db as any, now: () => new Date(NOW),
      loadAdmissionEvidence: async () => admission(), runProbe: async input => brokenProbe(input),
      loadAnomalyHistory: async () => new Map(),
      judge: async () => { judgeCalled += 1; return jevAccepts; } });
    const response = await handler(requestContext({}, true, { OPENROUTER_API_KEY: "env-key" }));
    const body = await response.json();
    expect(judgeCalled).toBe(0);
    expect(body.verdict.status).toBe("failed");
    expect(body.verdict.classifications[0].classification).toBe("unresolved");
  });

  test("history loader errors do not turn into 503 storage failures; verdict fails instead", async () => {
    const { db } = database();
    const handler = createShadowDispatchHandler({ getDb: () => db as any, now: () => new Date(NOW),
      loadAdmissionEvidence: async () => admission(), runProbe: async input => oversizeProbe(input),
      loadAnomalyHistory: async () => { throw new Error("history read failed"); } });
    const response = await handler(requestContext({}));
    expect(response.status).toBe(503);
    expect((await response.json()).errorClass).toBe("unclassified_storage_or_pipeline_error");
  });
});

describe("classifyStorageError", () => {
  test("maps known failure signatures to bounded classes", () => {
    expect(classifyStorageError(new Error("D1 rejected shadow observation persistence"))).toBe("d1_observation_write_rejected");
    expect(classifyStorageError(new Error("daily write quota exceeded (7500)"))).toBe("d1_quota_or_limit");
    expect(classifyStorageError(new Error("source evidence revision changed"))).toBe("evidence_or_revision_guard");
    expect(classifyStorageError(new Error("Cloudflare D1 binding is required"))).toBe("missing_d1_binding");
    expect(classifyStorageError(new Error("something else"))).toBe("unclassified_storage_or_pipeline_error");
  });
});
