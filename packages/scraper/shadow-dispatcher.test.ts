import { describe, expect, test } from "bun:test";
import {
  selectEligibleForDispatch,
  validateProviderProfileForDispatch,
  buildObservationRecord,
  dispatchShadowObservations,
  DEFAULT_MIN_REDISPATCH_MINUTES,
  MAX_DISPATCHES_PER_RUN,
  type DispatchProviderProfile,
  type DispatchRegistryRow,
} from "./shadow-dispatcher";
import type { CandidateShadowResult } from "./candidate-shadow";

const now = new Date("2026-09-03T00:00:00.000Z");

function provider(overrides: Partial<DispatchProviderProfile> = {}): DispatchProviderProfile {
  return {
    id: "greenhouse-ats",
    providerFamily: "greenhouse",
    mechanism: "ats_api",
    authClass: "none",
    allowedHosts: "boards-api.greenhouse.io",
    contentScope: "minimal",
    cadenceMinMinutes: null,
    ...overrides,
  };
}

function registryRow(overrides: Partial<DispatchRegistryRow> = {}): DispatchRegistryRow {
  return {
    sourceId: "greenhouse:grafanalabs",
    providerId: "greenhouse-ats",
    displayName: "Grafana Labs",
    endpointUrl: "https://boards-api.greenhouse.io/v1/boards/grafanalabs/jobs",
    complianceState: "allowed",
    operationalState: "shadow",
    optOut: false,
    ...overrides,
  };
}

describe("selectEligibleForDispatch", () => {
  test("is registry-driven: enumerates whatever rows are passed, not a hard-coded list", () => {
    const rows = [registryRow({ sourceId: "a" }), registryRow({ sourceId: "b" }), registryRow({ sourceId: "c" })];
    const providers = new Map([["greenhouse-ats", provider()]]);
    const decisions = selectEligibleForDispatch(rows, providers, new Map(), now);
    expect(decisions.map((d) => d.sourceId)).toEqual(["a", "b", "c"]);
    expect(decisions.every((d) => d.eligible)).toBe(true);
  });

  test("excludes a row whose operationalState is not shadow", () => {
    const rows = [registryRow({ operationalState: "candidate" })];
    const providers = new Map([["greenhouse-ats", provider()]]);
    const [decision] = selectEligibleForDispatch(rows, providers, new Map(), now);
    expect(decision).toMatchObject({ eligible: false, reason: expect.stringContaining("not \"shadow\"") });
  });

  test("defense-in-depth: excludes a shadow row with an invalid compliance state even though the DB CHECK should prevent it", () => {
    const rows = [registryRow({ complianceState: "needs_review" })];
    const providers = new Map([["greenhouse-ats", provider()]]);
    const [decision] = selectEligibleForDispatch(rows, providers, new Map(), now);
    expect(decision.eligible).toBe(false);
    expect(decision.reason).toContain("may not enter shadow");
  });

  test("excludes an opted-out source", () => {
    const rows = [registryRow({ optOut: true })];
    const providers = new Map([["greenhouse-ats", provider()]]);
    const [decision] = selectEligibleForDispatch(rows, providers, new Map(), now);
    expect(decision).toMatchObject({ eligible: false, reason: "source is opted out" });
  });

  test("excludes a row whose provider profile is missing", () => {
    const rows = [registryRow({ providerId: "unknown-provider" })];
    const [decision] = selectEligibleForDispatch(rows, new Map(), new Map(), now);
    expect(decision.eligible).toBe(false);
    expect(decision.reason).toContain("no provider profile found");
  });

  test("excludes a row observed more recently than the default 24h cadence floor", () => {
    const rows = [registryRow()];
    const providers = new Map([["greenhouse-ats", provider()]]);
    const lastObserved = new Map([["greenhouse:grafanalabs", "2026-09-02T23:00:00.000Z"]]); // 1h ago
    const [decision] = selectEligibleForDispatch(rows, providers, lastObserved, now);
    expect(decision.eligible).toBe(false);
    expect(decision.reason).toContain("cadence floor");
  });

  test("includes a row observed exactly at the cadence floor boundary", () => {
    const rows = [registryRow()];
    const providers = new Map([["greenhouse-ats", provider()]]);
    const lastObserved = new Map([["greenhouse:grafanalabs", "2026-09-02T00:00:00.000Z"]]); // exactly 24h ago
    const [decision] = selectEligibleForDispatch(rows, providers, lastObserved, now);
    expect(decision.eligible).toBe(true);
  });

  test("honors a tighter provider-specified cadence over the default", () => {
    const rows = [registryRow()];
    const providers = new Map([["greenhouse-ats", provider({ cadenceMinMinutes: 60 })]]);
    const lastObserved = new Map([["greenhouse:grafanalabs", "2026-09-02T23:30:00.000Z"]]); // 30min ago
    const [decision] = selectEligibleForDispatch(rows, providers, lastObserved, now);
    expect(decision.eligible).toBe(false);
    expect(decision.reason).toContain("60min cadence floor");
  });

  test("is eligible when never previously observed, regardless of cadence", () => {
    const rows = [registryRow()];
    const providers = new Map([["greenhouse-ats", provider()]]);
    const [decision] = selectEligibleForDispatch(rows, providers, new Map(), now);
    expect(decision.eligible).toBe(true);
  });

  test("default cadence floor is 24 hours", () => {
    expect(DEFAULT_MIN_REDISPATCH_MINUTES).toBe(24 * 60);
  });
});

describe("validateProviderProfileForDispatch", () => {
  test("accepts a well-formed provider profile", () => {
    expect(validateProviderProfileForDispatch(provider())).toMatchObject({ ok: true, errors: [] });
  });

  test("rejects the exact real-world mismatch the 2026-08-31 audit found: contentScope not in the DB CHECK enum", () => {
    const result = validateProviderProfileForDispatch(provider({ contentScope: "minimal_with_truncated_summary" }));
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("content_scope");
    expect(result.errors[0]).toContain("minimal_with_truncated_summary");
  });

  test("rejects an invalid mechanism", () => {
    const result = validateProviderProfileForDispatch(provider({ mechanism: "webhook" }));
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("mechanism"))).toBe(true);
  });

  test("rejects an invalid authClass", () => {
    const result = validateProviderProfileForDispatch(provider({ authClass: "basic" }));
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("authClass"))).toBe(true);
  });

  test("rejects an invalid visibilityFilter but tolerates a null one", () => {
    expect(validateProviderProfileForDispatch(provider({ visibilityFilter: "hidden" })).ok).toBe(false);
    expect(validateProviderProfileForDispatch(provider({ visibilityFilter: null })).ok).toBe(true);
  });

  test("reports every violation at once, not just the first", () => {
    const result = validateProviderProfileForDispatch(provider({ mechanism: "webhook", authClass: "basic" }));
    expect(result.errors).toHaveLength(2);
  });
});

function fakeResult(overrides: Partial<CandidateShadowResult["diagnostic"]> = {}): CandidateShadowResult {
  return {
    version: "1.0.0",
    timestamp: now.toISOString(),
    sourceId: "greenhouse:grafanalabs",
    providerId: "greenhouse-ats",
    displayName: "Grafana Labs",
    endpoint: { url: "https://boards-api.greenhouse.io/v1/boards/grafanalabs/jobs", isHttps: true, host: "boards-api.greenhouse.io", allowedHosts: "boards-api.greenhouse.io", hostValid: true },
    auth: { class: "none", supported: true },
    visibility: { filter: "published", isPublic: true, ambiguous: false },
    provenance: { discoveryProvenance: null, evidenceUrl: null, providerFamily: "greenhouse", mechanism: "ats_api" },
    cadence: { minMinutes: null, maxMinutes: null, rateGuidance: null },
    robots: { checked: true, verdict: "allowed", wouldBlock: false },
    fetch: { attempted: true, status: 200, latencyMs: 120, bytesReceived: 85014, contentType: "application/json" },
    parse: { attempted: true, schemaHealth: "ok", itemCount: 134 },
    sampleFunnel: { bytesReceived: 85014, parsedItems: 134, plausibleItems: 134, truncated: false, budgetExceeded: false },
    diagnostic: {
      outcome: "HEALTHY_WITH_RESULTS",
      probes: [],
      requestCount: 2,
      bytesReceived: 85014,
      durationMs: 340,
      mutations: 0,
      shadowMode: true,
      ...overrides,
    },
  };
}

describe("buildObservationRecord", () => {
  test("derives every field from the probe result and produces a stable evidence hash", async () => {
    const result = fakeResult();
    const record = await buildObservationRecord("greenhouse:grafanalabs", "greenhouse-ats", result, now.toISOString());
    expect(record).toMatchObject({
      sourceId: "greenhouse:grafanalabs",
      providerId: "greenhouse-ats",
      outcome: "HEALTHY_WITH_RESULTS",
      requestCount: 2,
      bytesReceived: 85014,
      itemCount: 134,
      plausibleItems: 134,
      stopReason: null,
    });
    expect(record.evidenceHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.parse(record.resultJson)).toEqual(result);
  });

  test("the evidence hash changes if the underlying result changes", async () => {
    const a = await buildObservationRecord("s", "p", fakeResult(), now.toISOString());
    const b = await buildObservationRecord("s", "p", fakeResult({ outcome: "HEALTHY_EMPTY" }), now.toISOString());
    expect(a.evidenceHash).not.toBe(b.evidenceHash);
  });
});

describe("dispatchShadowObservations", () => {
  test("dispatches every eligible row, persists an observation for each, and never touches anything but the injected persist function", async () => {
    const rows = [registryRow({ sourceId: "a" }), registryRow({ sourceId: "b", providerId: "greenhouse-ats" })];
    const persisted: string[] = [];
    const summary = await dispatchShadowObservations({
      loadRegistryRows: async () => rows,
      loadProviderProfiles: async () => new Map([["greenhouse-ats", provider()]]),
      loadLastObservedAt: async () => new Map(),
      runProbe: async (input) => ({ ...fakeResult(), sourceId: input.sourceId }),
      persistObservation: async (record) => { persisted.push(record.sourceId); },
      now: () => now,
    });
    expect(summary.dispatched).toBe(2);
    expect(summary.eligible).toBe(2);
    expect(summary.skippedIneligible).toBe(0);
    expect(persisted).toEqual(["a", "b"]);
  });

  test("rejects an invalid provider profile before dispatch and never calls runProbe for it", async () => {
    let probeCalls = 0;
    const summary = await dispatchShadowObservations({
      loadRegistryRows: async () => [registryRow()],
      loadProviderProfiles: async () => new Map([["greenhouse-ats", provider({ contentScope: "minimal_with_truncated_summary" })]]),
      loadLastObservedAt: async () => new Map(),
      runProbe: async () => { probeCalls += 1; return fakeResult(); },
      persistObservation: async () => {},
      now: () => now,
    });
    expect(probeCalls).toBe(0);
    expect(summary.dispatched).toBe(0);
    expect(summary.skippedInvalidProvider).toBe(1);
    expect(summary.invalidProviderErrors[0].sourceId).toBe("greenhouse:grafanalabs");
  });

  test("never dispatches an ineligible row", async () => {
    let probeCalls = 0;
    const summary = await dispatchShadowObservations({
      loadRegistryRows: async () => [registryRow({ operationalState: "candidate" })],
      loadProviderProfiles: async () => new Map([["greenhouse-ats", provider()]]),
      loadLastObservedAt: async () => new Map(),
      runProbe: async () => { probeCalls += 1; return fakeResult(); },
      persistObservation: async () => {},
      now: () => now,
    });
    expect(probeCalls).toBe(0);
    expect(summary.dispatched).toBe(0);
    expect(summary.skippedIneligible).toBe(1);
  });

  test("honors the per-run dispatch cap", async () => {
    const rows = Array.from({ length: 5 }, (_, i) => registryRow({ sourceId: `s${i}` }));
    const summary = await dispatchShadowObservations({
      loadRegistryRows: async () => rows,
      loadProviderProfiles: async () => new Map([["greenhouse-ats", provider()]]),
      loadLastObservedAt: async () => new Map(),
      runProbe: async () => fakeResult(),
      persistObservation: async () => {},
      now: () => now,
      maxDispatchesPerRun: 2,
    });
    expect(summary.dispatched).toBe(2);
    expect(summary.skippedRunCap).toBe(3);
  });

  test("an empty registry dispatches nothing and returns a clean zero-valued summary", async () => {
    const summary = await dispatchShadowObservations({
      loadRegistryRows: async () => [],
      loadProviderProfiles: async () => new Map(),
      loadLastObservedAt: async () => new Map(),
      runProbe: async () => fakeResult(),
      persistObservation: async () => {},
      now: () => now,
    });
    expect(summary).toMatchObject({ totalRegistryRows: 0, eligible: 0, dispatched: 0 });
  });

  test("tallies outcomes across multiple dispatched sources", async () => {
    const rows = [registryRow({ sourceId: "a" }), registryRow({ sourceId: "b" })];
    let call = 0;
    const summary = await dispatchShadowObservations({
      loadRegistryRows: async () => rows,
      loadProviderProfiles: async () => new Map([["greenhouse-ats", provider()]]),
      loadLastObservedAt: async () => new Map(),
      runProbe: async () => {
        call += 1;
        return fakeResult({ outcome: call === 1 ? "HEALTHY_WITH_RESULTS" : "HEALTHY_EMPTY" });
      },
      persistObservation: async () => {},
      now: () => now,
    });
    expect(summary.outcomes).toEqual({ HEALTHY_WITH_RESULTS: 1, HEALTHY_EMPTY: 1 });
  });

  test("default per-run cap is 20", () => {
    expect(MAX_DISPATCHES_PER_RUN).toBe(20);
  });
});
