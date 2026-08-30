import { describe, it, expect } from "bun:test";
import { decidePromotionToShadow } from "./source-promotion";
import { buildEvidencePacket, type EvidencePacketInput } from "./evidence-packet";
import type { CandidateShadowResult } from "./candidate-shadow";

function shadowFixture(overrides: Partial<CandidateShadowResult> = {}): CandidateShadowResult {
  const base: CandidateShadowResult = {
    version: "1.0.0",
    timestamp: "2026-08-29T16:00:00.000Z",
    sourceId: "example:acme",
    providerId: "example",
    displayName: "Acme",
    endpoint: { url: "https://example.test/jobs", isHttps: true, host: "example.test", allowedHosts: "example.test", hostValid: true },
    auth: { class: "none", supported: true },
    visibility: { filter: "published", isPublic: true, ambiguous: false },
    provenance: { discoveryProvenance: null, evidenceUrl: "https://example.test/docs", providerFamily: "example", mechanism: "ats_api" },
    cadence: { minMinutes: 60, maxMinutes: 1440, rateGuidance: "n/a" },
    robots: { checked: true, verdict: "allowed", wouldBlock: false, evidence: "no disallow", fromCache: false },
    fetch: { attempted: true, status: 200, latencyMs: 100, bytesReceived: 100, contentType: "application/json" },
    parse: { attempted: true, schemaHealth: "ok", itemCount: 5, error: undefined },
    sampleFunnel: { bytesReceived: 100, parsedItems: 5, plausibleItems: 5, truncated: false, budgetExceeded: false },
    diagnostic: { outcome: "HEALTHY_WITH_RESULTS", probes: [], requestCount: 2, bytesReceived: 100, durationMs: 100, mutations: 0, shadowMode: true },
    stopReason: undefined,
  };
  return { ...base, ...overrides } as CandidateShadowResult;
}

function packetFixture(overrides: Partial<EvidencePacketInput> = {}, shadow = shadowFixture()) {
  const input: EvidencePacketInput = {
    sourceId: "example:acme",
    providerId: "example",
    displayName: "Acme",
    endpointUrl: "https://example.test/jobs",
    companyToken: "acme",
    discoveryProvenance: null,
    complianceState: "conditional",
    operationalState: "candidate",
    reviewDeadline: "2026-09-12T00:00:00.000Z",
    policyExpiry: "2027-02-25T00:00:00.000Z",
    provider: {
      id: "example", providerFamily: "example", mechanism: "ats_api", authClass: "none",
      allowedHosts: "example.test", evidenceUrl: "https://example.test/docs", evidenceLeaseDays: 180,
      visibilityFilter: "published", contentScope: "minimal", cadenceMinMinutes: 60, cadenceMaxMinutes: 1440,
      rateGuidance: "n/a", removalSemantics: "deactivate within one cycle", robotsHandling: "observe",
    },
    shadow,
    nowIso: "2026-08-29T16:00:00.000Z",
    ...overrides,
  };
  return buildEvidencePacket(input);
}

describe("source-promotion — decidePromotionToShadow (provider-agnostic, shared by SP-11/SP-12/...)", () => {
  it("promotes when lifecycle, evidence, and shadow health all agree", () => {
    const decision = decidePromotionToShadow({ compliance: "conditional", operational: "candidate", optOut: false }, packetFixture(), shadowFixture());
    expect(decision.ok).toBe(true);
  });

  it("also promotes when compliance is allowed (not just conditional)", () => {
    const decision = decidePromotionToShadow({ compliance: "allowed", operational: "candidate", optOut: false }, packetFixture({ complianceState: "allowed" as any }), shadowFixture());
    expect(decision.ok).toBe(true);
  });

  it("refuses when not currently candidate", () => {
    const decision = decidePromotionToShadow({ compliance: "conditional", operational: "shadow", optOut: false }, packetFixture(), shadowFixture());
    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain("lifecycle guard");
  });

  it("refuses when compliance is a hold (needs_review)", () => {
    const decision = decidePromotionToShadow({ compliance: "needs_review", operational: "candidate", optOut: false }, packetFixture(), shadowFixture());
    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain("lifecycle guard");
  });

  it("refuses when compliance is paused", () => {
    const decision = decidePromotionToShadow({ compliance: "paused", operational: "candidate", optOut: false }, packetFixture(), shadowFixture());
    expect(decision.ok).toBe(false);
  });

  it("refuses when opted out, regardless of everything else", () => {
    const decision = decidePromotionToShadow({ compliance: "conditional", operational: "candidate", optOut: true }, packetFixture(), shadowFixture());
    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain("opt-out");
  });

  it("refuses when the evidence packet has missing fields (e.g. no provider evidence URL)", () => {
    const incomplete = packetFixture({
      provider: {
        id: "example", providerFamily: "example", mechanism: "ats_api", authClass: "none",
        allowedHosts: "example.test", evidenceUrl: null as any, evidenceLeaseDays: 180,
        visibilityFilter: "published", contentScope: "minimal", cadenceMinMinutes: 60, cadenceMaxMinutes: 1440,
        rateGuidance: "n/a", removalSemantics: "deactivate within one cycle", robotsHandling: "observe",
      },
    });
    expect(incomplete.missingEvidence.length).toBeGreaterThan(0);
    const decision = decidePromotionToShadow({ compliance: "conditional", operational: "candidate", optOut: false }, incomplete, shadowFixture());
    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain("evidence packet incomplete");
  });

  it("refuses when the shadow outcome is not healthy (and isn't one of the packet's own missing-evidence triggers)", () => {
    // INTERNAL_PIPELINE_FAILURE isn't special-cased by evidence-packet's own
    // missingEvidenceFor (unlike SCHEMA_BROKEN/UNREACHABLE/RATE_LIMITED), so
    // this isolates decidePromotionToShadow's own shadow-health check.
    const badShadow = shadowFixture({ diagnostic: { outcome: "INTERNAL_PIPELINE_FAILURE", probes: [], requestCount: 1, bytesReceived: 0, durationMs: 5, mutations: 0, shadowMode: true } as any });
    const packet = packetFixture({}, badShadow);
    expect(packet.missingEvidence).toEqual([]);
    const decision = decidePromotionToShadow({ compliance: "conditional", operational: "candidate", optOut: false }, packet, badShadow);
    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain("not healthy");
  });

  it("accepts HEALTHY_EMPTY as a valid outcome (zero current items is honest evidence)", () => {
    const emptyShadow = shadowFixture({ diagnostic: { outcome: "HEALTHY_EMPTY", probes: [], requestCount: 2, bytesReceived: 10, durationMs: 100, mutations: 0, shadowMode: true } as any, parse: { attempted: true, schemaHealth: "empty", itemCount: 0, error: undefined } });
    const decision = decidePromotionToShadow({ compliance: "conditional", operational: "candidate", optOut: false }, packetFixture({}, emptyShadow), emptyShadow);
    expect(decision.ok).toBe(true);
  });

  it("refuses when robots would block, even with an otherwise-healthy probe", () => {
    const blocked = shadowFixture({ robots: { checked: true, verdict: "disallowed", wouldBlock: true, evidence: "Disallow: /", fromCache: false } as any });
    const decision = decidePromotionToShadow({ compliance: "conditional", operational: "candidate", optOut: false }, packetFixture({}, blocked), blocked);
    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain("robots");
  });
});
