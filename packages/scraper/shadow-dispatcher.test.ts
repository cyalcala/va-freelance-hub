import { describe, expect, test } from "bun:test";
import {
  selectEligibleForDispatch, validateProviderProfileForDispatch, buildObservationRecord,
  dispatchShadowObservations, DEFAULT_MIN_REDISPATCH_MINUTES, MAX_DISPATCHES_PER_RUN,
  type DispatchProviderProfile, type DispatchRegistryRow, type ShadowDispatchDeps,
  type ShadowObservationContext, type ShadowObservationRecord,
} from "./shadow-dispatcher";
import { SHADOW_VERSION, type CandidateShadowInput, type CandidateShadowResult } from "./candidate-shadow";
import type { AdmissionProviderSnapshot, AdmissionSourceSnapshot, CurrentAdmissionEvidenceResult, AdmissionEvidencePacket } from "./admission-evidence";

const NOW = "2026-09-05T12:00:00.000Z";
const now = new Date(NOW);
const EXPIRY = "2026-10-05T12:00:00.000Z";
type Context = Extract<CurrentAdmissionEvidenceResult, { ok: true }>;

function provider(overrides: Partial<AdmissionProviderSnapshot> = {}): AdmissionProviderSnapshot {
  return {
    id: "greenhouse-ats", providerFamily: "greenhouse", mechanism: "ats_api", authClass: "none",
    endpointPattern: null, allowedHosts: "boards-api.greenhouse.io", evidenceUrl: "https://developers.greenhouse.io/job-board.html",
    evidenceHash: "a".repeat(64), evidenceCapturedAt: "2026-09-04T00:00:00.000Z", evidenceLeaseDays: 180,
    visibilityFilter: "published", contentScope: "minimal", cadenceMinMinutes: 60, cadenceMaxMinutes: 1440,
    rateGuidance: "one probe per hour", robotsHandling: "enforce", removalSemantics: "reconcile complete feed", governanceRevision: 1,
    ...overrides,
  };
}

function registryRow(overrides: Partial<AdmissionSourceSnapshot> = {}): AdmissionSourceSnapshot {
  return {
    sourceId: "greenhouse:grafanalabs", providerId: "greenhouse-ats", displayName: "Grafana Labs",
    endpointUrl: "https://boards-api.greenhouse.io/v1/boards/grafanalabs/jobs", companyToken: "grafanalabs",
    discoveryProvenance: null, complianceState: "allowed", operationalState: "shadow", optOut: false,
    reviewDeadline: EXPIRY, policyExpiry: EXPIRY, governanceRevision: 1, canaryMaxNewItemsPerTick: 5, lastTransitionHash: "ABC123",
    ...overrides,
  };
}

function inputFor(source = registryRow(), profile = provider()): CandidateShadowInput {
  return { ...source, provider: profile };
}

function fakeResult(input = inputFor(), timestamp = NOW): CandidateShadowResult {
  return {
    version: SHADOW_VERSION, timestamp, sourceId: input.sourceId, providerId: input.providerId, displayName: input.displayName,
    endpoint: { url: input.endpointUrl, isHttps: true, host: new URL(input.endpointUrl).hostname, allowedHosts: input.provider.allowedHosts ?? null, hostValid: true },
    auth: { class: input.provider.authClass, supported: true },
    visibility: { filter: input.provider.visibilityFilter ?? null, isPublic: true, ambiguous: false },
    provenance: { discoveryProvenance: input.discoveryProvenance ?? null, evidenceUrl: input.provider.evidenceUrl ?? null,
      providerFamily: input.provider.providerFamily, mechanism: input.provider.mechanism },
    cadence: { minMinutes: input.provider.cadenceMinMinutes ?? null, maxMinutes: input.provider.cadenceMaxMinutes ?? null, rateGuidance: input.provider.rateGuidance ?? null },
    robots: { checked: true, verdict: "allowed", wouldBlock: false },
    fetch: { attempted: true, status: 200, latencyMs: 120, bytesReceived: 100, contentType: "application/json" },
    parse: { attempted: true, schemaHealth: "ok", itemCount: 3 },
    sampleFunnel: { bytesReceived: 100, parsedItems: 3, plausibleItems: 2, truncated: false, budgetExceeded: false },
    diagnostic: { outcome: "HEALTHY_WITH_RESULTS", probes: [], requestCount: 2, bytesReceived: 100, durationMs: 340, mutations: 0, shadowMode: true },
  };
}

function context(source = registryRow(), profile = provider()): Context {
  const packet: AdmissionEvidencePacket = {
    version: "sp23-evidence-v1", source, provider: profile, primaryEvidence: [{ url: profile.evidenceUrl!, contentSha256: "a".repeat(64), capturedAt: "2026-09-04T00:00:00.000Z" }],
    authorityActions: ["recurrent_private_shadow", "public_minimal_metadata_canary"], probe: fakeResult(inputFor(source, profile)),
    adjudicationRef: "sp23-test", capturedAt: "2026-09-04T00:00:00.000Z", expiresAt: EXPIRY, policyVersion: "sp23-shadow-7d-v1",
  };
  return { ok: true, source, provider: profile, packet, evidence: { id: 1, sourceId: source.sourceId,
    providerId: profile.id, sourceGovernanceRevision: source.governanceRevision, providerGovernanceRevision: profile.governanceRevision,
    endpointUrl: source.endpointUrl, policyVersion: packet.policyVersion, capturedAt: packet.capturedAt, expiresAt: packet.expiresAt,
    adjudicationRef: packet.adjudicationRef, packetJson: JSON.stringify(packet), packetSha256: "b".repeat(64) } };
}

function deps(overrides: Partial<ShadowDispatchDeps> = {}): ShadowDispatchDeps {
  return {
    loadRegistryRows: async () => [registryRow()], loadAdmissionContext: async () => context(),
    loadLastObservedAt: async () => null, runProbe: async input => fakeResult(input), persistObservation: async () => {},
    now: () => now, ...overrides,
  };
}

function binding(overrides: Partial<ShadowObservationContext> = {}): ShadowObservationContext {
  return { input: inputFor(), admissionEvidenceId: 1, shadowEntryHash: "ABC123", dispatchKey: "dispatch-1", startedAt: NOW, completedAt: NOW, ...overrides };
}

describe("selectEligibleForDispatch", () => {
  test("enumerates supplied registry identities", () => {
    const decisions = selectEligibleForDispatch([registryRow({ sourceId: "a" }), registryRow({ sourceId: "b" })], new Map([["greenhouse-ats", provider()]]), new Map(), now);
    expect(decisions.map(row => row.sourceId)).toEqual(["a", "b"]);
    expect(decisions.every(row => row.eligible)).toBe(true);
  });
  for (const [name, row] of [
    ["candidate", registryRow({ operationalState: "candidate" })], ["compliance hold", registryRow({ complianceState: "needs_review" })],
    ["opt-out", registryRow({ optOut: true })], ["missing lease", registryRow({ policyExpiry: null })],
    ["expired lease", registryRow({ policyExpiry: NOW })], ["invalid lease", registryRow({ policyExpiry: "later" })],
  ] as const) {
    test(`rejects ${name}`, () => {
      expect(selectEligibleForDispatch([row], new Map([["greenhouse-ats", provider()]]), new Map(), now)[0].eligible).toBe(false);
    });
  }
  test("requires provider identity", () => {
    expect(selectEligibleForDispatch([registryRow()], new Map(), new Map(), now)[0].eligible).toBe(false);
  });
  test("honors provider cadence and includes exact boundary", () => {
    const profiles = new Map([["greenhouse-ats", provider()]]);
    expect(selectEligibleForDispatch([registryRow()], profiles, new Map([["greenhouse:grafanalabs", "2026-09-05T11:30:00.000Z"]]), now)[0].eligible).toBe(false);
    expect(selectEligibleForDispatch([registryRow()], profiles, new Map([["greenhouse:grafanalabs", "2026-09-05T11:00:00.000Z"]]), now)[0].eligible).toBe(true);
  });
  test("default cadence is 24h and malformed last-observation dates fail closed", () => {
    expect(DEFAULT_MIN_REDISPATCH_MINUTES).toBe(1440);
    expect(selectEligibleForDispatch([registryRow()], new Map([["greenhouse-ats", provider({ cadenceMinMinutes: null })]]), new Map([["greenhouse:grafanalabs", "2026-09-04T13:00:00.000Z"]]), now)[0].eligible).toBe(false);
    expect(selectEligibleForDispatch([registryRow()], new Map([["greenhouse-ats", provider()]]), new Map([["greenhouse:grafanalabs", "invalid"]]), now)[0].eligible).toBe(false);
  });
});

describe("validateProviderProfileForDispatch", () => {
  test("accepts current enum values and rejects real legacy contentScope mismatch", () => {
    expect(validateProviderProfileForDispatch(provider()).ok).toBe(true);
    expect(validateProviderProfileForDispatch(provider({ contentScope: "minimal_with_truncated_summary" })).ok).toBe(false);
  });
  test("reports independent invalid mechanism/auth/visibility fields", () => {
    expect(validateProviderProfileForDispatch(provider({ mechanism: "webhook", authClass: "basic", visibilityFilter: "hidden" })).errors).toHaveLength(3);
  });
});

describe("bound observation records", () => {
  test("hashes full result plus immutable admission/entry/dispatch binding", async () => {
    const first = await buildObservationRecord(fakeResult(), binding());
    const repeat = await buildObservationRecord(fakeResult(), binding());
    const otherDispatch = await buildObservationRecord(fakeResult(), binding({ dispatchKey: "dispatch-2" }));
    const otherEvidence = await buildObservationRecord(fakeResult(), binding({ admissionEvidenceId: 2 }));
    expect(first).toMatchObject({ sourceId: "greenhouse:grafanalabs", admissionEvidenceId: 1, shadowEntryHash: "ABC123", dispatchKey: "dispatch-1", observedAt: NOW });
    expect(JSON.parse(first.resultJson).admissionBinding).toEqual({ evidenceId: 1, shadowEntryHash: "ABC123", dispatchKey: "dispatch-1" });
    expect(first.evidenceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.evidenceHash).toBe(repeat.evidenceHash);
    expect(first.evidenceHash).not.toBe(otherDispatch.evidenceHash);
    expect(first.evidenceHash).not.toBe(otherEvidence.evidenceHash);
  });
  test("rejects a replayed or future probe timestamp", async () => {
    await expect(buildObservationRecord(fakeResult(inputFor(), "2026-09-04T12:00:00.000Z"), binding())).rejects.toThrow();
    await expect(buildObservationRecord(fakeResult(inputFor(), "2026-09-06T12:00:00.000Z"), binding())).rejects.toThrow();
  });
  test("requires a durable evidence identity", async () => {
    await expect(buildObservationRecord(fakeResult(), binding({ admissionEvidenceId: 0 }))).rejects.toThrow();
  });
});

describe("current-evidence shadow dispatcher", () => {
  test("empty registry does no authority lookup, fetch or write", async () => {
    const forbidden = async (): Promise<never> => { throw new Error("unexpected I/O"); };
    const result = await dispatchShadowObservations(deps({ loadRegistryRows: async () => [], loadAdmissionContext: forbidden, runProbe: forbidden, persistObservation: forbidden }));
    expect(result).toMatchObject({ totalRegistryRows: 0, dispatched: 0 });
  });
  test("missing/invalid evidence stops before any probe or history read", async () => {
    let probes = 0;
    const result = await dispatchShadowObservations(deps({ loadAdmissionContext: async () => ({ ok: false, reason: "source revision no longer matches evidence" }),
      loadLastObservedAt: async () => { throw new Error("history must not load"); }, runProbe: async input => { probes++; return fakeResult(input); } }));
    expect(result.skippedInvalidEvidence).toBe(1);
    expect(probes).toBe(0);
  });
  test("authority storage failures propagate and never fetch", async () => {
    await expect(dispatchShadowObservations(deps({ loadAdmissionContext: async () => { throw new Error("D1 unavailable"); },
      runProbe: async () => { throw new Error("must not fetch"); } }))).rejects.toThrow("D1 unavailable");
  });
  test("current opt-out overlay and changed source state prevent probes", async () => {
    for (const row of [registryRow({ optOut: true }), registryRow({ operationalState: "paused" }), registryRow({ lastTransitionHash: null })]) {
      let probes = 0;
      const result = await dispatchShadowObservations(deps({ loadAdmissionContext: async () => context(row), runProbe: async input => { probes++; return fakeResult(input); } }));
      expect(result.dispatched).toBe(0);
      expect(probes).toBe(0);
    }
  });
  test("uses the current evidence endpoint rather than a stale enumeration snapshot", async () => {
    const current = registryRow({ endpointUrl: "https://boards-api.greenhouse.io/v1/boards/new/jobs" });
    const seen: string[] = [];
    const records: ShadowObservationRecord[] = [];
    const result = await dispatchShadowObservations(deps({ loadAdmissionContext: async () => context(current),
      runProbe: async input => { seen.push(input.endpointUrl); return fakeResult(input); }, persistObservation: async record => { records.push(record); } }));
    expect(result.dispatched).toBe(1);
    expect(seen).toEqual([current.endpointUrl]);
    expect(JSON.parse(records[0].resultJson).endpoint.url).toBe(current.endpointUrl);
  });
  test("an evidence lease expiring while history loads prevents the probe", async () => {
    let clock = new Date(NOW);
    let probes = 0;
    const current = context();
    current.evidence.expiresAt = "2026-09-05T12:00:01.000Z";
    await dispatchShadowObservations(deps({ now: () => clock, loadAdmissionContext: async () => current,
      loadLastObservedAt: async () => { clock = new Date("2026-09-05T12:00:02.000Z"); return null; },
      runProbe: async input => { probes++; return fakeResult(input); } }));
    expect(probes).toBe(0);
  });
  test("a malformed provider cannot reach the probe", async () => {
    const result = await dispatchShadowObservations(deps({ loadAdmissionContext: async () => context(registryRow(), provider({ contentScope: "minimal_with_truncated_summary" })) }));
    expect(result.skippedInvalidProvider).toBe(1);
    expect(result.dispatched).toBe(0);
  });
  test("cadence reads the current evidence and shadow-entry context", async () => {
    const result = await dispatchShadowObservations(deps({ loadLastObservedAt: async current => {
      expect(current.evidence.id).toBe(1); expect(current.source.lastTransitionHash).toBe("ABC123"); return "2026-09-05T11:30:00.000Z";
    } }));
    expect(result.dispatched).toBe(0);
    expect(result.skippedIneligible).toBe(1);
  });
  test("records faithful failed probes with unique keys even on the same UTC day", async () => {
    const records: ShadowObservationRecord[] = [];
    let key = 0;
    const taskDeps = deps({ createDispatchKey: () => `dispatch-${++key}`, runProbe: async input => {
      const result = fakeResult(input); result.diagnostic.outcome = "RATE_LIMITED"; result.fetch.status = 429; return result;
    }, persistObservation: async record => { records.push(record); } });
    await dispatchShadowObservations(taskDeps);
    await dispatchShadowObservations(taskDeps);
    expect(records.map(record => record.outcome)).toEqual(["RATE_LIMITED", "RATE_LIMITED"]);
    expect(records[0].dispatchKey).not.toBe(records[1].dispatchKey);
    expect(records[0].observedAt).toBe(records[1].observedAt);
  });
  test("a thrown probe becomes disqualifying pipeline failure evidence", async () => {
    const records: ShadowObservationRecord[] = [];
    const result = await dispatchShadowObservations(deps({ runProbe: async () => { throw new Error("unexpected probe crash"); }, persistObservation: async record => { records.push(record); } }));
    expect(result.probeFailures).toBe(1);
    expect(records[0].outcome).toBe("INTERNAL_PIPELINE_FAILURE");
    expect(records[0].admissionEvidenceId).toBe(1);
    expect(records[0].stopReason).toContain("counts are unknown");
  });
  const corruptions: Array<[string, (result: CandidateShadowResult) => void]> = [
    ["source", result => { result.sourceId = "other"; }], ["provider", result => { result.providerId = "other"; }],
    ["endpoint", result => { result.endpoint.url = "https://other.example/jobs"; }],
    ["evidence facts", result => { result.provenance.evidenceUrl = "https://other.example/policy"; }],
    ["count projections", result => { result.diagnostic.bytesReceived++; }],
    ["old result", result => { result.timestamp = "2026-09-04T12:00:00.000Z"; }],
    ["fabricated healthy outcome", result => { result.robots.wouldBlock = true; }],
  ];
  for (const [name, corrupt] of corruptions) {
    test(`rejects ${name} and stores a pipeline failure instead of fabricated success`, async () => {
      const records: ShadowObservationRecord[] = [];
      const result = await dispatchShadowObservations(deps({ runProbe: async input => { const result = fakeResult(input); corrupt(result); return result; }, persistObservation: async record => { records.push(record); } }));
      expect(result.rejectedProbeResults).toBe(1);
      expect(records[0].outcome).toBe("INTERNAL_PIPELINE_FAILURE");
      expect(JSON.parse(records[0].resultJson).sourceId).toBe("greenhouse:grafanalabs");
    });
  }
  test("a stale-context storage rejection never reports successful dispatch", async () => {
    await expect(dispatchShadowObservations(deps({ persistObservation: async () => { throw new Error("0040 current evidence guard rejected insert"); } }))).rejects.toThrow("current evidence guard");
  });
  test("each actual probe receives its own timestamp and unique dispatch key", async () => {
    let clock = new Date(NOW);
    const records: ShadowObservationRecord[] = [];
    const result = await dispatchShadowObservations(deps({ now: () => clock,
      loadRegistryRows: async () => [registryRow({ sourceId: "a" }), registryRow({ sourceId: "b" })],
      loadAdmissionContext: async sourceId => context(registryRow({ sourceId })),
      runProbe: async input => { const result = fakeResult(input, clock.toISOString()); clock = new Date(clock.getTime() + 1000); return result; },
      persistObservation: async record => { records.push(record); } }));
    expect(result.dispatched).toBe(2);
    expect(records.map(record => record.observedAt)).toEqual([NOW, "2026-09-05T12:00:01.000Z"]);
    expect(records[0].dispatchKey).not.toBe(records[1].dispatchKey);
  });
  test("enforces the bounded per-run cap", async () => {
    const result = await dispatchShadowObservations(deps({ loadRegistryRows: async () => Array.from({ length: 5 }, (_, i) => registryRow({ sourceId: `s${i}` })),
      loadAdmissionContext: async sourceId => context(registryRow({ sourceId })), maxDispatchesPerRun: 2 }));
    expect(result.dispatched).toBe(2); expect(result.skippedRunCap).toBe(3); expect(MAX_DISPATCHES_PER_RUN).toBe(20);
    await expect(dispatchShadowObservations(deps({ maxDispatchesPerRun: 21 }))).rejects.toThrow("run cap");
  });
});
