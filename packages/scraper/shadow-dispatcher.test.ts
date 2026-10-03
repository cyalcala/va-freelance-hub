import { describe, expect, test } from "bun:test";
import {
  selectEligibleForDispatch, validateProviderProfileForDispatch, buildObservationRecord,
  dispatchShadowObservations, DEFAULT_MIN_REDISPATCH_MINUTES, MAX_DISPATCHES_PER_RUN,
  isStaleAdmissionContextError, isTransientD1QuotaError,
  type DispatchProviderProfile, type DispatchRegistryRow, type ShadowDispatchDeps,
  type ShadowObservationContext, type ShadowObservationRecord,
} from "./shadow-dispatcher";
import { SHADOW_VERSION, type CandidateShadowInput, type CandidateShadowResult } from "./candidate-shadow";
import type { AdmissionProviderSnapshot, AdmissionSourceSnapshot, CurrentAdmissionEvidenceResult, AdmissionEvidencePacket } from "./admission-evidence";
import type { ShadowHostBackoff } from "./shadow-host-backoff";

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

describe("durable host cooldown", () => {
  test("holds siblings across runs without writing observations or moving the expiry", async () => {
    let stored: ShadowHostBackoff | null = null;
    let writes = 0;
    let current = new Date(NOW);
    const records: ShadowObservationRecord[] = [];
    const options = deps({ now: () => current,
      loadHostBackoff: async () => stored,
      persistHostBackoff: async value => { stored = value; writes++; },
      persistObservation: async value => { records.push(value); },
      runProbe: async input => ({ ...fakeResult(input, current.toISOString()),
        fetch: { attempted: true, status: 429, bytesReceived: 0 },
        diagnostic: { ...fakeResult(input).diagnostic, bytesReceived: 0, outcome: "RATE_LIMITED" },
        sampleFunnel: { ...fakeResult(input).sampleFunnel, bytesReceived: 0 },
        rateLimit: { receivedAt: current.toISOString(), retryAfter: "172800" } }),
    });
    const first = await dispatchShadowObservations(options);
    expect(first.dispatched).toBe(1);
    expect(first.hostBackoffs[0]).toMatchObject({ nextEligibleAt: "2026-09-07T12:00:00.000Z", reason: "retry_after" });
    current = new Date("2026-09-06T12:00:00.000Z");
    const second = await dispatchShadowObservations(options);
    expect(second.dispatched).toBe(0);
    expect(second.skippedHostLimits).toEqual([{ sourceId: registryRow().sourceId, host: "boards-api.greenhouse.io", nextEligibleAt: "2026-09-07T12:00:00.000Z" }]);
    expect(records).toHaveLength(1);
    expect(writes).toBe(1);
    // Expiration alone restores normal authority/cadence checks; no manual reset.
    current = new Date("2026-09-07T12:00:00.000Z");
    options.runProbe = async input => fakeResult(input, current.toISOString());
    expect((await dispatchShadowObservations(options)).dispatched).toBe(1);
    expect(writes).toBe(1);
  });
  test.each([null, "0", "bad header"])("reuses daily default for Retry-After %s", async retryAfter => {
    let stored: ShadowHostBackoff | null = null;
    await dispatchShadowObservations(deps({
      loadHostBackoff: async () => null, persistHostBackoff: async value => { stored = value; },
      runProbe: async input => ({ ...fakeResult(input),
        diagnostic: { ...fakeResult(input).diagnostic, outcome: "RATE_LIMITED" },
        rateLimit: { receivedAt: NOW, retryAfter } }),
    }));
    expect(stored).toMatchObject({ nextEligibleAt: "2026-09-06T12:00:00.000Z", reason: "default_cadence" });
  });
  test("checks the current host after admission evidence changes the enumeration endpoint", async () => {
    const heldHost = "current.example.com";
    let probes = 0;
    let reads = 0;
    const result = await dispatchShadowObservations(deps({
      loadAdmissionContext: async () => context(registryRow({ endpointUrl: `https://${heldHost}/jobs` }), provider({ allowedHosts: heldHost })),
      loadHostBackoff: async host => { reads++; return host === heldHost ? { host, sourceId: "prior:source", limitedAt: NOW, nextEligibleAt: EXPIRY, reason: "retry_after" } : null; },
      persistHostBackoff: async () => {},
      runProbe: async input => { probes++; return fakeResult(input); },
    }));
    expect(probes).toBe(0);
    expect(reads).toBe(2);
    expect(result.skippedHostLimits[0].host).toBe(heldHost);
  });
  test("storage errors fail closed before another host probe and do not fabricate observations", async () => {
    let probes = 0;
    let observations = 0;
    const options = deps({ loadHostBackoff: async () => null,
      persistHostBackoff: async () => { throw new Error("hold store unavailable"); },
      persistObservation: async () => { observations++; },
      runProbe: async input => { probes++; return { ...fakeResult(input), diagnostic: { ...fakeResult(input).diagnostic, outcome: "RATE_LIMITED" } }; },
    });
    await expect(dispatchShadowObservations(options)).rejects.toThrow("hold store unavailable");
    expect(probes).toBe(1); expect(observations).toBe(0);
    options.loadHostBackoff = async () => { throw new Error("hold read unavailable"); };
    await expect(dispatchShadowObservations(options)).rejects.toThrow("hold read unavailable");
    expect(probes).toBe(1);
  });
});

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
  test("source-local concurrency: stale admission context skips source without head-of-line blocking other sources", async () => {
    const writtenRecords: ShadowObservationRecord[] = [];
    const result = await dispatchShadowObservations(deps({
      loadRegistryRows: async () => [registryRow({ sourceId: "source-a" }), registryRow({ sourceId: "source-b" })],
      loadAdmissionContext: async sourceId => context(registryRow({ sourceId })),
      persistObservation: async record => {
        if (record.sourceId === "source-a") {
          // Source A changed concurrently before persistence; trigger raises abort
          throw new Error("D1_ERROR: observation admission context changed or expired");
        }
        writtenRecords.push(record);
      },
    }));

    // Source A was skipped safely due to stale context
    expect(result.skippedStaleContext).toBe(1);
    expect(result.staleContextErrors).toHaveLength(1);
    expect(result.staleContextErrors[0].sourceId).toBe("source-a");
    expect(result.staleContextErrors[0].reason).toContain("admission context changed or expired");

    // Source B was still probed and its observation was written
    expect(result.dispatched).toBe(1);
    expect(writtenRecords).toHaveLength(1);
    expect(writtenRecords[0].sourceId).toBe("source-b");
  });
  test("systemic storage failures still fail closed and abort dispatch", async () => {
    // Database locked is systemic -> aborts
    await expect(dispatchShadowObservations(deps({
      persistObservation: async () => { throw new Error("D1_ERROR: database is locked [code: 7500]"); }
    }))).rejects.toThrow("database is locked");

    // Probe contract violation is systemic -> aborts
    await expect(dispatchShadowObservations(deps({
      persistObservation: async () => { throw new Error("D1_ERROR: healthy observation requires the current probe contract and successful safety checks"); }
    }))).rejects.toThrow("probe contract");
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
    expect(result.dispatched).toBe(2); expect(result.skippedRunCap).toBe(3); expect(MAX_DISPATCHES_PER_RUN).toBe(12);
    await expect(dispatchShadowObservations(deps({ maxDispatchesPerRun: 13 }))).rejects.toThrow("run cap");
  });
  test("invalid evidence consumes the authority-read budget even when nothing dispatches", async () => {
    let reads = 0;
    const result = await dispatchShadowObservations(deps({
      loadRegistryRows: async () => Array.from({ length: 30 }, (_, i) => registryRow({ sourceId: `s${i}` })),
      loadAdmissionContext: async () => { reads++; return { ok: false, reason: "invalid current epoch" }; },
    }));
    expect(reads).toBe(12);
    expect(result.dispatched).toBe(0);
    expect(result.skippedInvalidEvidence).toBe(12);
    expect(result.skippedRunCap).toBe(18);
  });
  test("applies extended 3000ms delay for consecutive same-host probes and 1200ms for different hosts", async () => {
    const delays: number[] = [];
    const sleep = async (ms: number) => { delays.push(ms); };
    const rowA = registryRow({ sourceId: "a", endpointUrl: "https://apply.workable.com/api/v1/widget/accounts/a" });
    const rowB = registryRow({ sourceId: "b", endpointUrl: "https://apply.workable.com/api/v1/widget/accounts/b" });
    const rowC = registryRow({ sourceId: "c", endpointUrl: "https://boards-api.greenhouse.io/v1/boards/c/jobs" });

    const result = await dispatchShadowObservations(deps({
      loadRegistryRows: async () => [rowA, rowB, rowC],
      loadAdmissionContext: async (sourceId) => {
        if (sourceId === "a") return context(rowA);
        if (sourceId === "b") return context(rowB);
        return context(rowC);
      },
      sleep,
    }));
    expect(result.dispatched).toBe(3);
    // Dispatches:
    // Probe 1 (rowA) -> dispatched=0, no delay
    // Probe 2 (rowB) -> dispatched=1, same host (apply.workable.com) -> 3000ms
    // Probe 3 (rowC) -> dispatched=2, different host (boards-api.greenhouse.io) -> 1200ms
    expect(delays).toEqual([3000, 1200]);
  });
  test("skips subsequent same-host candidates when a probe returns RATE_LIMITED while allowing different hosts", async () => {
    const persisted: string[] = [];
    const probed: string[] = [];
    const rowW1 = registryRow({ sourceId: "workable:agency1", endpointUrl: "https://apply.workable.com/api/v1/widget/accounts/agency1" });
    const rowW2 = registryRow({ sourceId: "workable:agency2", endpointUrl: "https://apply.workable.com/api/v1/widget/accounts/agency2" });
    const rowGH = registryRow({ sourceId: "greenhouse:remotecom", endpointUrl: "https://boards-api.greenhouse.io/v1/boards/remotecom/jobs" });
    const rowW3 = registryRow({ sourceId: "workable:agency3", endpointUrl: "https://apply.workable.com/api/v1/widget/accounts/agency3" });

    const result = await dispatchShadowObservations(deps({
      loadRegistryRows: async () => [rowW1, rowW2, rowGH, rowW3],
      loadAdmissionContext: async (sourceId) => {
        if (sourceId === "workable:agency1") return context(rowW1);
        if (sourceId === "workable:agency2") return context(rowW2);
        if (sourceId === "greenhouse:remotecom") return context(rowGH);
        return context(rowW3);
      },
      runProbe: async (input) => {
        probed.push(input.sourceId);
        if (input.sourceId === "workable:agency1") {
          return {
            ...fakeResult(input),
            diagnostic: { ...fakeResult(input).diagnostic, outcome: "RATE_LIMITED" },
          };
        }
        return fakeResult(input);
      },
      persistObservation: async (record) => {
        persisted.push(record.sourceId);
      },
    }));

    // Only workable:agency1 and greenhouse:remotecom were probed; agency2 and agency3 were skipped
    expect(probed).toEqual(["workable:agency1", "greenhouse:remotecom"]);
    expect(persisted).toEqual(["workable:agency1", "greenhouse:remotecom"]);
    expect(result.dispatched).toBe(2);
    expect(result.skippedRateLimitedHost).toBe(2);
    expect(result.skippedHostLimits).toEqual([
      { sourceId: "workable:agency2", host: "apply.workable.com" },
      { sourceId: "workable:agency3", host: "apply.workable.com" },
    ]);
    expect(result.outcomes).toEqual({
      RATE_LIMITED: 1,
      HEALTHY_WITH_RESULTS: 1,
    });
    // Only agency1 is recorded in anomalies; agency2 and agency3 streaks are not poisoned
    expect(result.anomalies.map(a => a.sourceId)).toEqual(["workable:agency1"]);
  });
  test("resets rate-limited hosts across separate dispatch runs", async () => {
    const probed: string[] = [];
    const rowW1 = registryRow({ sourceId: "workable:agency1", endpointUrl: "https://apply.workable.com/api/v1/widget/accounts/agency1" });
    const rowW2 = registryRow({ sourceId: "workable:agency2", endpointUrl: "https://apply.workable.com/api/v1/widget/accounts/agency2" });

    // Run 1: agency1 gets RATE_LIMITED -> agency2 is skipped
    const run1 = await dispatchShadowObservations(deps({
      loadRegistryRows: async () => [rowW1, rowW2],
      loadAdmissionContext: async (sourceId) => context(sourceId === "workable:agency1" ? rowW1 : rowW2),
      runProbe: async (input) => {
        probed.push(input.sourceId);
        return {
          ...fakeResult(input),
          diagnostic: { ...fakeResult(input).diagnostic, outcome: "RATE_LIMITED" },
        };
      },
    }));
    expect(run1.dispatched).toBe(1);
    expect(run1.skippedRateLimitedHost).toBe(1);

    // Run 2: Next tick starts fresh, agency1 is probed again (not pre-skipped)
    probed.length = 0;
    const run2 = await dispatchShadowObservations(deps({
      loadRegistryRows: async () => [rowW1, rowW2],
      loadAdmissionContext: async (sourceId) => context(sourceId === "workable:agency1" ? rowW1 : rowW2),
      runProbe: async (input) => {
        probed.push(input.sourceId);
        return fakeResult(input); // Healthy this tick
      },
    }));
    expect(run2.dispatched).toBe(2);
    expect(run2.skippedRateLimitedHost).toBe(0);
    expect(probed).toEqual(["workable:agency1", "workable:agency2"]);
  });
});

describe("isStaleAdmissionContextError", () => {
  test("detects stale context error in D1 trigger message", () => {
    const err = new Error("D1_ERROR: observation admission context changed or expired");
    expect(isStaleAdmissionContextError(err)).toBe(true);
  });
  test("detects stale context error in error cause chain", () => {
    const cause = new Error("observation requires a unique dispatch and current admission context");
    const err = new Error("failed query: INSERT INTO ...");
    (err as any).cause = cause;
    expect(isStaleAdmissionContextError(err)).toBe(true);
  });
  test("ignores query wrapper messages with stale keywords", () => {
    const err = new Error("failed query: INSERT INTO source_shadow_observations (admission_evidence_id, ...) VALUES (?)");
    expect(isStaleAdmissionContextError(err)).toBe(false);
  });
  test("returns false for unrelated errors", () => {
    expect(isStaleAdmissionContextError(new Error("database is locked"))).toBe(false);
    expect(isStaleAdmissionContextError(new Error("quota exceeded"))).toBe(false);
    expect(isStaleAdmissionContextError(null)).toBe(false);
  });
});

describe("isTransientD1QuotaError", () => {
  test("detects quota exceeded error", () => {
    const err = new Error("D1_ERROR: quota exceeded");
    expect(isTransientD1QuotaError(err)).toBe(true);
  });
  test("detects limit exceeded error", () => {
    const err = new Error("D1_ERROR: limit exceeded");
    expect(isTransientD1QuotaError(err)).toBe(true);
  });
  test("detects rate limit error", () => {
    const err = new Error("D1_ERROR: rate limit exceeded");
    expect(isTransientD1QuotaError(err)).toBe(true);
  });
  test("detects too many requests error", () => {
    const err = new Error("D1_ERROR: too many requests");
    expect(isTransientD1QuotaError(err)).toBe(true);
  });
  test("detects quota error in cause chain", () => {
    const cause = new Error("quota exceeded");
    const err = new Error("failed query: INSERT INTO source_shadow_observations ...");
    (err as any).cause = cause;
    expect(isTransientD1QuotaError(err)).toBe(true);
  });
  test("ignores query wrapper messages with quota keywords", () => {
    const err = new Error("failed query: INSERT INTO source_shadow_observations (quota, limit) VALUES (?, ?)");
    expect(isTransientD1QuotaError(err)).toBe(false);
  });
  test("returns false for unrelated errors", () => {
    expect(isTransientD1QuotaError(new Error("database is locked"))).toBe(false);
    expect(isTransientD1QuotaError(new Error("observation admission context changed or expired"))).toBe(false);
    expect(isTransientD1QuotaError(new Error("probe contract violation"))).toBe(false);
    expect(isTransientD1QuotaError(null)).toBe(false);
  });
});

describe("transient D1 quota error handling in dispatcher", () => {
  test("transient quota error during persistObservation skips source without head-of-line blocking other sources", async () => {
    const writtenRecords: ShadowObservationRecord[] = [];
    const result = await dispatchShadowObservations(deps({
      loadRegistryRows: async () => [registryRow({ sourceId: "source-a" }), registryRow({ sourceId: "source-b" })],
      loadAdmissionContext: async sourceId => context(registryRow({ sourceId })),
      persistObservation: async record => {
        if (record.sourceId === "source-a") {
          // Source A hits transient D1 quota limit
          throw new Error("D1_ERROR: quota exceeded");
        }
        writtenRecords.push(record);
      },
    }));

    // Source A was skipped safely due to transient quota error
    expect(result.skippedQuotaError).toBe(1);
    expect(result.quotaErrors).toHaveLength(1);
    expect(result.quotaErrors[0].sourceId).toBe("source-a");
    expect(result.quotaErrors[0].reason).toContain("quota exceeded");

    // Source B was still probed and its observation was written
    expect(result.dispatched).toBe(1);
    expect(writtenRecords).toHaveLength(1);
    expect(writtenRecords[0].sourceId).toBe("source-b");
  });

  test("systemic storage failures still fail closed and abort dispatch", async () => {
    // Database locked is systemic -> aborts
    await expect(dispatchShadowObservations(deps({
      persistObservation: async () => { throw new Error("D1_ERROR: database is locked [code: 7500]"); }
    }))).rejects.toThrow("database is locked");

    // Probe contract violation is systemic -> aborts
    await expect(dispatchShadowObservations(deps({
      persistObservation: async () => { throw new Error("D1_ERROR: healthy observation requires the current probe contract and successful safety checks"); }
    }))).rejects.toThrow("probe contract");
  });

  test("stale context error during persistObservation is handled gracefully", async () => {
    const writtenRecords: ShadowObservationRecord[] = [];
    const result = await dispatchShadowObservations(deps({
      loadRegistryRows: async () => [registryRow({ sourceId: "source-a" }), registryRow({ sourceId: "source-b" })],
      loadAdmissionContext: async sourceId => context(registryRow({ sourceId })),
      persistObservation: async record => {
        if (record.sourceId === "source-a") {
          // Source A hits stale context error
          throw new Error("D1_ERROR: observation admission context changed or expired");
        }
        writtenRecords.push(record);
      },
    }));

    // Source A was skipped safely due to stale context
    expect(result.skippedStaleContext).toBe(1);
    expect(result.staleContextErrors).toHaveLength(1);
    expect(result.staleContextErrors[0].sourceId).toBe("source-a");

    // Source B was still probed and its observation was written
    expect(result.dispatched).toBe(1);
    expect(writtenRecords).toHaveLength(1);
    expect(writtenRecords[0].sourceId).toBe("source-b");
  });
});

describe("Ashby candidates — supply bottleneck: 4 high-yield candidates sharing api.ashbyhq.com", () => {
  function ashbyRegistryRow(overrides: Partial<AdmissionSourceSnapshot> = {}): AdmissionSourceSnapshot {
    return {
      sourceId: "ashby:supabase",
      providerId: "ashby-ats",
      displayName: "Supabase",
      endpointUrl: "https://api.ashbyhq.com/posting-api/job-board/supabase",
      companyToken: "supabase",
      discoveryProvenance: null,
      complianceState: "allowed",
      operationalState: "shadow",
      optOut: false,
      reviewDeadline: EXPIRY,
      policyExpiry: EXPIRY,
      governanceRevision: 1,
      canaryMaxNewItemsPerTick: 5,
      lastTransitionHash: "ASHBY123",
      ...overrides,
    };
  }

  function ashbyProvider(overrides: Partial<AdmissionProviderSnapshot> = {}): AdmissionProviderSnapshot {
    return {
      id: "ashby-ats",
      providerFamily: "ashby",
      mechanism: "ats_api",
      authClass: "none",
      endpointPattern: null,
      allowedHosts: "api.ashbyhq.com",
      evidenceUrl: "https://developers.ashbyhq.com/docs/public-job-posting-api.md",
      evidenceHash: "a".repeat(64),
      evidenceCapturedAt: "2026-09-04T00:00:00.000Z",
      evidenceLeaseDays: 180,
      visibilityFilter: "published",
      contentScope: "minimal",
      cadenceMinMinutes: 60,
      cadenceMaxMinutes: 1440,
      rateGuidance: "one probe per hour",
      robotsHandling: "enforce",
      removalSemantics: "reconcile complete feed",
      governanceRevision: 1,
      ...overrides,
    };
  }

  function ashbyContext(source = ashbyRegistryRow(), profile = ashbyProvider()): Context {
    const packet: AdmissionEvidencePacket = {
      version: "sp23-evidence-v1",
      source,
      provider: profile,
      primaryEvidence: [{ url: profile.evidenceUrl!, contentSha256: "a".repeat(64), capturedAt: "2026-09-04T00:00:00.000Z" }],
      authorityActions: ["recurrent_private_shadow", "public_minimal_metadata_canary"],
      probe: fakeResult(inputFor(source, profile)),
      adjudicationRef: "sp23-test",
      capturedAt: "2026-09-04T00:00:00.000Z",
      expiresAt: EXPIRY,
      policyVersion: "sp23-shadow-7d-v1",
    };
    return {
      ok: true,
      source,
      provider: profile,
      packet,
      evidence: {
        id: 1,
        sourceId: source.sourceId,
        providerId: profile.id,
        sourceGovernanceRevision: source.governanceRevision,
        providerGovernanceRevision: profile.governanceRevision,
        endpointUrl: source.endpointUrl,
        policyVersion: packet.policyVersion,
        capturedAt: packet.capturedAt,
        expiresAt: packet.expiresAt,
        adjudicationRef: packet.adjudicationRef,
        packetJson: JSON.stringify(packet),
        packetSha256: "b".repeat(64),
      },
    };
  }

  test("dispatches 4 Ashby candidates with extended 3000ms delay for same-host probes", async () => {
    const delays: number[] = [];
    const sleep = async (ms: number) => { delays.push(ms); };

    const ashbyCandidates = [
      ashbyRegistryRow({ sourceId: "ashby:amplify", endpointUrl: "https://api.ashbyhq.com/posting-api/job-board/amplify", displayName: "Amplify", companyToken: "amplify" }),
      ashbyRegistryRow({ sourceId: "ashby:camunda", endpointUrl: "https://api.ashbyhq.com/posting-api/job-board/camunda", displayName: "Camunda", companyToken: "camunda" }),
      ashbyRegistryRow({ sourceId: "ashby:supabase", endpointUrl: "https://api.ashbyhq.com/posting-api/job-board/supabase", displayName: "Supabase", companyToken: "supabase" }),
      ashbyRegistryRow({ sourceId: "ashby:tremendous", endpointUrl: "https://api.ashbyhq.com/posting-api/job-board/tremendous", displayName: "Tremendous", companyToken: "tremendous" }),
    ];

    const probed: string[] = [];
    const result = await dispatchShadowObservations(deps({
      loadRegistryRows: async () => ashbyCandidates,
      loadAdmissionContext: async (sourceId) => {
        const row = ashbyCandidates.find(r => r.sourceId === sourceId);
        if (!row) throw new Error(`no row for ${sourceId}`);
        return ashbyContext(row);
      },
      runProbe: async (input) => {
        probed.push(input.sourceId);
        return fakeResult(input);
      },
      sleep,
    }));

    expect(result.dispatched).toBe(4);
    expect(probed).toEqual(["ashby:amplify", "ashby:camunda", "ashby:supabase", "ashby:tremendous"]);
    // All 4 share api.ashbyhq.com -> 3000ms delay between each consecutive probe
    // Dispatches: 1st (amplify) no delay, 2nd (camunda) 3000ms, 3rd (supabase) 3000ms, 4th (tremendous) 3000ms
    expect(delays).toEqual([3000, 3000, 3000]);
    expect(result.outcomes).toEqual({ HEALTHY_WITH_RESULTS: 4 });
  });

  test("handles mixed outcomes across Ashby candidates and tracks anomalies per source", async () => {
    const probed: string[] = [];
    const persisted: string[] = [];

    const ashbyCandidates = [
      ashbyRegistryRow({ sourceId: "ashby:amplify", endpointUrl: "https://api.ashbyhq.com/posting-api/job-board/amplify", displayName: "Amplify", companyToken: "amplify" }),
      ashbyRegistryRow({ sourceId: "ashby:camunda", endpointUrl: "https://api.ashbyhq.com/posting-api/job-board/camunda", displayName: "Camunda", companyToken: "camunda" }),
      ashbyRegistryRow({ sourceId: "ashby:supabase", endpointUrl: "https://api.ashbyhq.com/posting-api/job-board/supabase", displayName: "Supabase", companyToken: "supabase" }),
      ashbyRegistryRow({ sourceId: "ashby:tremendous", endpointUrl: "https://api.ashbyhq.com/posting-api/job-board/tremendous", displayName: "Tremendous", companyToken: "tremendous" }),
    ];

    function resultFor(input: CandidateShadowInput, outcome: DoctorOutcome): CandidateShadowResult {
      const base = fakeResult(input);
      if (outcome === "HEALTHY_EMPTY") {
        return {
          ...base,
          parse: { ...base.parse, schemaHealth: "empty", itemCount: 0 },
          sampleFunnel: { ...base.sampleFunnel, parsedItems: 0, plausibleItems: 0 },
          diagnostic: { ...base.diagnostic, outcome: "HEALTHY_EMPTY" },
        };
      }
      if (outcome === "SCHEMA_BROKEN") {
        return {
          ...base,
          parse: { ...base.parse, schemaHealth: "broken", itemCount: 0, error: "unrecognized JSON envelope" },
          sampleFunnel: { ...base.sampleFunnel, parsedItems: 0, plausibleItems: 0 },
          diagnostic: { ...base.diagnostic, outcome: "SCHEMA_BROKEN" },
        };
      }
      return base; // HEALTHY_WITH_RESULTS
    }

    const result = await dispatchShadowObservations(deps({
      loadRegistryRows: async () => ashbyCandidates,
      loadAdmissionContext: async (sourceId) => {
        const row = ashbyCandidates.find(r => r.sourceId === sourceId);
        if (!row) throw new Error(`no row for ${sourceId}`);
        return ashbyContext(row);
      },
      runProbe: async (input) => {
        probed.push(input.sourceId);
        if (input.sourceId === "ashby:camunda") return resultFor(input, "SCHEMA_BROKEN");
        if (input.sourceId === "ashby:tremendous") return resultFor(input, "HEALTHY_EMPTY");
        return resultFor(input, "HEALTHY_WITH_RESULTS"); // amplify and supabase
      },
      persistObservation: async (record) => {
        persisted.push(record.sourceId);
      },
    }));

    expect(result.dispatched).toBe(4);
    expect(probed).toEqual(["ashby:amplify", "ashby:camunda", "ashby:supabase", "ashby:tremendous"]);
    expect(persisted).toEqual(["ashby:amplify", "ashby:camunda", "ashby:supabase", "ashby:tremendous"]);
    expect(result.outcomes).toEqual({
      HEALTHY_WITH_RESULTS: 2,
      SCHEMA_BROKEN: 1,
      HEALTHY_EMPTY: 1,
    });
    // Only non-healthy outcomes (not HEALTHY_WITH_RESULTS or HEALTHY_EMPTY) are recorded in anomalies
    expect(result.anomalies.map(a => a.sourceId)).toEqual(["ashby:camunda"]);
    expect(result.anomalies.find(a => a.sourceId === "ashby:camunda")?.outcome).toBe("SCHEMA_BROKEN");
  });

  test("rate limit on one Ashby candidate triggers host backoff and skips remaining same-host candidates", async () => {
    const probed: string[] = [];
    const persisted: string[] = [];

    const ashbyCandidates = [
      ashbyRegistryRow({ sourceId: "ashby:amplify", endpointUrl: "https://api.ashbyhq.com/posting-api/job-board/amplify", displayName: "Amplify", companyToken: "amplify" }),
      ashbyRegistryRow({ sourceId: "ashby:camunda", endpointUrl: "https://api.ashbyhq.com/posting-api/job-board/camunda", displayName: "Camunda", companyToken: "camunda" }),
      ashbyRegistryRow({ sourceId: "ashby:supabase", endpointUrl: "https://api.ashbyhq.com/posting-api/job-board/supabase", displayName: "Supabase", companyToken: "supabase" }),
      ashbyRegistryRow({ sourceId: "ashby:tremendous", endpointUrl: "https://api.ashbyhq.com/posting-api/job-board/tremendous", displayName: "Tremendous", companyToken: "tremendous" }),
    ];

    const result = await dispatchShadowObservations(deps({
      loadRegistryRows: async () => ashbyCandidates,
      loadAdmissionContext: async (sourceId) => {
        const row = ashbyCandidates.find(r => r.sourceId === sourceId);
        if (!row) throw new Error(`no row for ${sourceId}`);
        return ashbyContext(row);
      },
      runProbe: async (input) => {
        probed.push(input.sourceId);
        if (input.sourceId === "ashby:amplify") {
          return {
            ...fakeResult(input),
            diagnostic: { ...fakeResult(input).diagnostic, outcome: "RATE_LIMITED" },
            fetch: { ...fakeResult(input).fetch, status: 429 },
            rateLimit: { receivedAt: NOW, retryAfter: "3600" },
          };
        }
        return fakeResult(input);
      },
      persistObservation: async (record) => {
        persisted.push(record.sourceId);
      },
      loadHostBackoff: async () => null,
      persistHostBackoff: async () => {},
    }));

    // Only amplify probed (gets RATE_LIMITED); camunda, supabase, tremendous skipped due to host backoff
    expect(probed).toEqual(["ashby:amplify"]);
    expect(persisted).toEqual(["ashby:amplify"]);
    expect(result.dispatched).toBe(1);
    expect(result.skippedRateLimitedHost).toBe(3);
    expect(result.skippedHostLimits.map(s => s.sourceId)).toEqual(["ashby:camunda", "ashby:supabase", "ashby:tremendous"]);
    expect(result.hostBackoffs).toHaveLength(1);
    expect(result.hostBackoffs[0].host).toBe("api.ashbyhq.com");
  });
});
