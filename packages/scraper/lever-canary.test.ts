import { describe, it, expect } from "bun:test";
import {
  buildLeverProviderProfile,
  buildLeverCandidateRow,
  LEVER_PROVIDER_ID,
  LEVER_EVIDENCE_LEASE_DAYS,
} from "./lever-canary";
import { decidePromotionToShadow } from "./source-promotion";
import { buildEvidencePacket, type EvidencePacketInput } from "./evidence-packet";
import type { CandidateShadowResult } from "./candidate-shadow";

describe("lever-canary — provider profile (SP-11 criterion: EU/global origin explicit)", () => {
  it("declares both global and EU origins in allowedHosts", () => {
    const profile = buildLeverProviderProfile();
    expect(profile.id).toBe(LEVER_PROVIDER_ID);
    expect(profile.allowedHosts).toContain("api.lever.co");
    expect(profile.allowedHosts).toContain("api.eu.lever.co");
    expect(profile.authClass).toBe("none");
    expect(profile.visibilityFilter).toBe("published");
    expect(profile.evidenceUrl).toBe("https://github.com/lever/postings-api");
    expect(profile.evidenceLeaseDays).toBe(180);
  });

  it("content scope is honestly labeled minimal_with_truncated_summary, not bare minimal", () => {
    const profile = buildLeverProviderProfile();
    expect(profile.contentScope).toBe("minimal_with_truncated_summary");
    expect(profile.notes).toContain("500-character-truncated");
  });
});

describe("lever-canary — candidate row (SP-11 criterion: exact token provenance)", () => {
  it("builds one curated board as conditional/candidate", () => {
    const row = buildLeverCandidateRow({ token: "lever", companyName: "Lever", nowIso: "2026-08-29T16:00:00.000Z" });
    expect(row.sourceId).toBe("lever:lever");
    expect(row.complianceState).toBe("conditional");
    expect(row.operationalState).toBe("candidate");
    expect(row.endpointUrl).toBe("https://api.lever.co/v0/postings/lever?mode=json");
  });

  it("14-day review deadline, 180-day evidence lease", () => {
    const row = buildLeverCandidateRow({ token: "lever", companyName: "Lever", nowIso: "2026-08-29T00:00:00.000Z" });
    expect(row.reviewDeadline).toBe("2026-09-12T00:00:00.000Z");
    expect(row.policyExpiry).toBe("2027-02-25T00:00:00.000Z");
    expect(LEVER_EVIDENCE_LEASE_DAYS).toBe(180);
  });
});

function shadowFixture(overrides: Partial<CandidateShadowResult> = {}): CandidateShadowResult {
  const base: CandidateShadowResult = {
    version: "1.0.0",
    timestamp: "2026-08-29T16:05:00.000Z",
    sourceId: "lever:lever",
    providerId: "lever",
    displayName: "Lever",
    endpoint: { url: "https://api.lever.co/v0/postings/lever?mode=json", isHttps: true, host: "api.lever.co", allowedHosts: "api.lever.co,api.eu.lever.co", hostValid: true },
    auth: { class: "none", supported: true },
    visibility: { filter: "published", isPublic: true, ambiguous: false },
    provenance: { discoveryProvenance: JSON.stringify({ provenance: "sp-11-curated-board" }), evidenceUrl: "https://github.com/lever/postings-api", providerFamily: "lever", mechanism: "ats_api" },
    cadence: { minMinutes: 60, maxMinutes: 1440, rateGuidance: "no documented limit" },
    robots: { checked: true, verdict: "allowed", wouldBlock: false, evidence: "no robots.txt disallow found", fromCache: false },
    fetch: { attempted: true, status: 200, latencyMs: 150, bytesReceived: 20, contentType: "application/json" },
    parse: { attempted: true, schemaHealth: "ok", itemCount: 0, error: undefined },
    sampleFunnel: { bytesReceived: 20, parsedItems: 0, plausibleItems: 0, truncated: false, budgetExceeded: false },
    diagnostic: { outcome: "HEALTHY_EMPTY", probes: [{ name: "fetch", passed: true, detail: "ok" }], requestCount: 2, bytesReceived: 20, durationMs: 200, mutations: 0, shadowMode: true },
    stopReason: undefined,
  };
  return { ...base, ...overrides } as CandidateShadowResult;
}

function packetFixture(overrides: Partial<EvidencePacketInput> = {}, shadow = shadowFixture()) {
  const input: EvidencePacketInput = {
    sourceId: "lever:lever",
    providerId: "lever",
    displayName: "Lever",
    endpointUrl: "https://api.lever.co/v0/postings/lever?mode=json",
    companyToken: "lever",
    discoveryProvenance: null,
    complianceState: "conditional",
    operationalState: "candidate",
    reviewDeadline: "2026-09-12T00:00:00.000Z",
    policyExpiry: "2027-02-25T00:00:00.000Z",
    provider: {
      id: "lever",
      providerFamily: "lever",
      mechanism: "ats_api",
      authClass: "none",
      allowedHosts: "api.lever.co,api.eu.lever.co",
      evidenceUrl: "https://github.com/lever/postings-api",
      evidenceLeaseDays: 180,
      visibilityFilter: "published",
      contentScope: "minimal_with_truncated_summary",
      cadenceMinMinutes: 60,
      cadenceMaxMinutes: 1440,
      rateGuidance: "no documented limit",
      removalSemantics: "deactivate within one cycle",
      robotsHandling: "observe",
    },
    shadow,
    nowIso: "2026-08-29T16:05:00.000Z",
    ...overrides,
  };
  return buildEvidencePacket(input);
}

describe("lever-canary — promotion decision uses the shared, provider-agnostic guard", () => {
  it("promotes on a HEALTHY_EMPTY probe (zero current postings is real, honest evidence, not a failure)", () => {
    const packet = packetFixture();
    const shadow = shadowFixture();
    const decision = decidePromotionToShadow({ compliance: "conditional", operational: "candidate", optOut: false }, packet, shadow);
    expect(decision.ok).toBe(true);
  });

  it("refuses when robots would block", () => {
    const blockedShadow = shadowFixture({ robots: { checked: true, verdict: "disallowed", wouldBlock: true, evidence: "Disallow: /v0/postings/", fromCache: false } as any });
    const packet = packetFixture({}, blockedShadow);
    const decision = decidePromotionToShadow({ compliance: "conditional", operational: "candidate", optOut: false }, packet, blockedShadow);
    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain("robots");
  });

  it("refuses when not currently candidate (lifecycle guard)", () => {
    const decision = decidePromotionToShadow({ compliance: "conditional", operational: "shadow", optOut: false }, packetFixture(), shadowFixture());
    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain("lifecycle guard");
  });
});
