import { describe, it, expect } from "bun:test";
import {
  buildWorkableProviderProfile,
  buildWorkableCandidateRow,
  WORKABLE_PROVIDER_ID,
  WORKABLE_SOURCE_ID,
  WORKABLE_EVIDENCE_LEASE_DAYS,
} from "./workable-canary";
import { decidePromotionToShadow } from "./source-promotion";
import { buildEvidencePacket, type EvidencePacketInput } from "./evidence-packet";
import type { CandidateShadowResult } from "./candidate-shadow";

describe("workable-canary — provider profile (global feed, syndication_feed mechanism)", () => {
  it("uses the bare apex host so hostOf()'s www-stripping matches (a real bug found and fixed this unit)", () => {
    const profile = buildWorkableProviderProfile();
    expect(profile.id).toBe(WORKABLE_PROVIDER_ID);
    expect(profile.mechanism).toBe("syndication_feed");
    expect(profile.authClass).toBe("none");
    // Not "www.workable.com" — hostOf() strips a leading "www." from the
    // endpoint's own host before comparing, so allowedHosts must be the
    // bare apex or the exact-host check falsely fails.
    expect(profile.allowedHosts).toBe("workable.com");
    expect(profile.contentScope).toBe("minimal");
    expect(profile.evidenceLeaseDays).toBe(180);
  });

  it("notes explicitly document the coarse pre-filter is not a substitute for geoGate", () => {
    const profile = buildWorkableProviderProfile();
    expect(profile.notes).toContain("never a substitute for this project's own geoGate");
  });
});

describe("workable-canary — candidate row (one global identity, not per-company)", () => {
  it("builds the single global feed identity as conditional/candidate", () => {
    const row = buildWorkableCandidateRow({ nowIso: "2026-08-30T12:00:00.000Z" });
    expect(row.sourceId).toBe(WORKABLE_SOURCE_ID);
    expect(row.sourceId).toBe("workable:global-feed");
    expect(row.complianceState).toBe("conditional");
    expect(row.operationalState).toBe("candidate");
    expect(row.companyToken).toBeNull();
  });

  it("14-day review deadline, 180-day evidence lease", () => {
    const row = buildWorkableCandidateRow({ nowIso: "2026-08-30T00:00:00.000Z" });
    expect(row.reviewDeadline).toBe("2026-09-13T00:00:00.000Z");
    expect(row.policyExpiry).toBe("2027-02-26T00:00:00.000Z");
    expect(WORKABLE_EVIDENCE_LEASE_DAYS).toBe(180);
  });
});

function shadowFixture(overrides: Partial<CandidateShadowResult> = {}): CandidateShadowResult {
  const base: CandidateShadowResult = {
    version: "1.0.0",
    timestamp: "2026-08-30T12:05:00.000Z",
    sourceId: "workable:global-feed",
    providerId: "workable",
    displayName: "Workable (global XML feed)",
    endpoint: { url: "https://www.workable.com/boards/workable.xml", isHttps: true, host: "workable.com", allowedHosts: "workable.com", hostValid: true },
    auth: { class: "none", supported: true },
    visibility: { filter: "public", isPublic: true, ambiguous: false },
    provenance: { discoveryProvenance: JSON.stringify({ provenance: "sp-10-global-feed" }), evidenceUrl: "https://help.workable.com/hc/en-us/articles/4420464031767-Utilizing-the-XML-Job-Feed", providerFamily: "workable", mechanism: "syndication_feed" },
    cadence: { minMinutes: 60, maxMinutes: 60, rateGuidance: "hourly" },
    robots: { checked: true, verdict: "allowed", wouldBlock: false, evidence: "no disallow on boards.xml", fromCache: false },
    fetch: { attempted: true, status: 200, latencyMs: 250, bytesReceived: 400000, contentType: "text/xml" },
    parse: { attempted: true, schemaHealth: "ok", itemCount: 120, error: undefined },
    sampleFunnel: { bytesReceived: 400000, parsedItems: 120, plausibleItems: 120, truncated: false, budgetExceeded: false },
    diagnostic: { outcome: "HEALTHY_WITH_RESULTS", probes: [{ name: "fetch", passed: true, detail: "ok" }], requestCount: 2, bytesReceived: 400000, durationMs: 350, mutations: 0, shadowMode: true },
    stopReason: undefined,
  };
  return { ...base, ...overrides } as CandidateShadowResult;
}

function packetFixture(overrides: Partial<EvidencePacketInput> = {}, shadow = shadowFixture()) {
  const input: EvidencePacketInput = {
    sourceId: "workable:global-feed",
    providerId: "workable",
    displayName: "Workable (global XML feed)",
    endpointUrl: "https://www.workable.com/boards/workable.xml",
    companyToken: null,
    discoveryProvenance: null,
    complianceState: "conditional",
    operationalState: "candidate",
    reviewDeadline: "2026-09-13T00:00:00.000Z",
    policyExpiry: "2027-02-26T00:00:00.000Z",
    provider: {
      id: "workable",
      providerFamily: "workable",
      mechanism: "syndication_feed",
      authClass: "none",
      allowedHosts: "workable.com",
      evidenceUrl: "https://help.workable.com/hc/en-us/articles/4420464031767-Utilizing-the-XML-Job-Feed",
      evidenceLeaseDays: 180,
      visibilityFilter: "public",
      contentScope: "minimal",
      cadenceMinMinutes: 60,
      cadenceMaxMinutes: 60,
      rateGuidance: "hourly",
      removalSemantics: "deactivate within one cycle",
      robotsHandling: "observe",
    },
    shadow,
    nowIso: "2026-08-30T12:05:00.000Z",
    ...overrides,
  };
  return buildEvidencePacket(input);
}

describe("workable-canary — promotion decision (this unit's actual live probe hit UNREACHABLE, not HEALTHY)", () => {
  it("would promote IF a preprocessed, budget-conformant sample were submitted as shadow evidence (decision-logic test, not today's real outcome — see evidence doc)", () => {
    const packet = packetFixture();
    const shadow = shadowFixture();
    expect(packet.status).toBe("review_ready");
    const decision = decidePromotionToShadow({ compliance: "conditional", operational: "candidate", optOut: false }, packet, shadow);
    expect(decision.ok).toBe(true);
  });

  it("the REAL raw feed's own byte count (14,657,375) fails the evidence packet's 512 KiB shadow-byte ceiling — this is structural, not a probe glitch", () => {
    const oversizedShadow = shadowFixture({
      fetch: { attempted: true, status: 200, latencyMs: 8000, bytesReceived: 14657375, contentType: "text/xml" } as any,
      sampleFunnel: { bytesReceived: 14657375, parsedItems: 654, plausibleItems: 654, truncated: true, budgetExceeded: true } as any,
      diagnostic: { outcome: "DEGRADED_ANOMALOUS", probes: [], requestCount: 2, bytesReceived: 14657375, durationMs: 8000, mutations: 0, shadowMode: true } as any,
    });
    const packet = packetFixture({}, oversizedShadow);
    expect(packet.status).toBe("candidate");
    expect(packet.missingEvidence.some((m) => m.includes("512 KiB budget"))).toBe(true);
  });

  it("refuses on the real live outcome: UNREACHABLE (standard prober times out on this feed's real size)", () => {
    const unreachableShadow = shadowFixture({
      fetch: { attempted: true, status: undefined, latencyMs: 8000, bytesReceived: 0, contentType: undefined } as any,
      parse: { attempted: false, schemaHealth: "not_attempted", itemCount: 0 } as any,
      diagnostic: { outcome: "UNREACHABLE", probes: [], requestCount: 2, bytesReceived: 0, durationMs: 8000, mutations: 0, shadowMode: true } as any,
    });
    const packet = packetFixture({}, unreachableShadow);
    const decision = decidePromotionToShadow({ compliance: "conditional", operational: "candidate", optOut: false }, packet, unreachableShadow);
    expect(decision.ok).toBe(false);
  });

  it("refuses when the source is opted out, even with an otherwise-healthy fixture", () => {
    const packet = packetFixture();
    const shadow = shadowFixture();
    const decision = decidePromotionToShadow({ compliance: "conditional", operational: "candidate", optOut: true }, packet, shadow);
    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain("opt-out");
  });
});
