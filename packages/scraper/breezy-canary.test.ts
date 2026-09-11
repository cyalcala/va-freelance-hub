import { describe, it, expect } from "bun:test";
import {
  buildBreezyProviderProfile,
  buildBreezyCandidateRow,
  decidePromotionToShadow,
  BREEZY_PROVIDER_ID,
  BREEZY_EVIDENCE_LEASE_DAYS,
} from "./breezy-canary";
import { buildEvidencePacket, type EvidencePacketInput } from "./evidence-packet";
import type { CandidateShadowResult } from "./candidate-shadow";

describe("breezy-canary — provider profile (minimal-index, public, no-auth)", () => {
  it("declares mechanism/auth/visibility/contentScope matching the strategy's operating posture", () => {
    const profile = buildBreezyProviderProfile("20four7va");
    expect(profile.id).toBe(BREEZY_PROVIDER_ID);
    expect(profile.mechanism).toBe("ats_api");
    expect(profile.authClass).toBe("none");
    expect(profile.visibilityFilter).toBe("published");
    expect(profile.contentScope).toBe("minimal");
    expect(profile.evidenceUrl).toBe("https://breezy.hr");
    expect(profile.evidenceLeaseDays).toBe(180);
    expect(profile.allowedHosts).toContain("20four7va.breezy.hr");
    expect(profile.allowedHosts).toContain("breezy.hr");
  });
});

describe("breezy-canary — candidate row for PH agencies", () => {
  it("builds 20Four7VA candidate row as conditional/candidate", () => {
    const row = buildBreezyCandidateRow({
      token: "20four7va",
      companyName: "20Four7VA",
      nowIso: "2026-09-11T12:00:00.000Z",
    });
    expect(row.sourceId).toBe("breezy:20four7va");
    expect(row.complianceState).toBe("conditional");
    expect(row.operationalState).toBe("candidate");
    expect(row.endpointUrl).toBe("https://20four7va.breezy.hr/json");
    expect(row.companyToken).toBe("20four7va");
    expect(row.displayName).toBe("20Four7VA");
    expect(row.reviewDeadline).toBe("2026-09-25T12:00:00.000Z");
  });

  it("builds Sourcefit candidate row with exact provenance", () => {
    const row = buildBreezyCandidateRow({
      token: "sourcefit",
      companyName: "Sourcefit",
      nowIso: "2026-09-11T12:00:00.000Z",
    });
    expect(row.sourceId).toBe("breezy:sourcefit");
    expect(row.complianceState).toBe("conditional");
    expect(row.operationalState).toBe("candidate");
    expect(row.endpointUrl).toBe("https://sourcefit.breezy.hr/json");
  });
});

function shadowFixture(overrides: Partial<CandidateShadowResult> = {}): CandidateShadowResult {
  const base: CandidateShadowResult = {
    version: "1.1.0",
    timestamp: "2026-09-11T12:05:00.000Z",
    sourceId: "breezy:20four7va",
    providerId: "breezy",
    displayName: "20Four7VA",
    endpoint: {
      url: "https://20four7va.breezy.hr/json",
      isHttps: true,
      host: "20four7va.breezy.hr",
      allowedHosts: "20four7va.breezy.hr,breezy.hr",
      hostValid: true,
    },
    auth: { class: "none", supported: true },
    visibility: { filter: "published", isPublic: true, ambiguous: false },
    provenance: {
      discoveryProvenance: JSON.stringify({ provenance: "breezy-ph-agency" }),
      evidenceUrl: "https://breezy.hr",
      providerFamily: "breezy",
      mechanism: "ats_api",
    },
    cadence: { minMinutes: 60, maxMinutes: 1440, rateGuidance: "60 req/min" },
    robots: {
      checked: true,
      verdict: "allowed",
      wouldBlock: false,
      evidence: "no robots.txt disallow found",
      fromCache: false,
    },
    fetch: {
      attempted: true,
      status: 200,
      latencyMs: 150,
      bytesReceived: 12000,
      contentType: "application/json",
    },
    parse: { attempted: true, schemaHealth: "ok", itemCount: 60, error: undefined },
    sampleFunnel: {
      bytesReceived: 12000,
      parsedItems: 60,
      plausibleItems: 58,
      truncated: false,
      budgetExceeded: false,
    },
    diagnostic: {
      outcome: "HEALTHY_WITH_RESULTS",
      probes: [{ name: "fetch", passed: true, detail: "ok" }],
      requestCount: 2,
      bytesReceived: 12000,
      durationMs: 200,
      mutations: 0,
      shadowMode: true,
    },
    stopReason: undefined,
  };
  return { ...base, ...overrides } as CandidateShadowResult;
}

function packetFixture(overrides: Partial<EvidencePacketInput> = {}, shadow = shadowFixture()) {
  const input: EvidencePacketInput = {
    sourceId: "breezy:20four7va",
    providerId: "breezy",
    displayName: "20Four7VA",
    endpointUrl: "https://20four7va.breezy.hr/json",
    companyToken: "20four7va",
    discoveryProvenance: null,
    complianceState: "conditional",
    operationalState: "candidate",
    reviewDeadline: "2026-09-25T12:00:00.000Z",
    policyExpiry: "2027-03-10T12:00:00.000Z",
    provider: {
      id: "breezy",
      providerFamily: "breezy",
      mechanism: "ats_api",
      authClass: "none",
      allowedHosts: "20four7va.breezy.hr,breezy.hr",
      evidenceUrl: "https://breezy.hr",
      evidenceLeaseDays: 180,
      visibilityFilter: "published",
      contentScope: "minimal",
      cadenceMinMinutes: 60,
      cadenceMaxMinutes: 1440,
      rateGuidance: "60 req/min",
      removalSemantics: "deactivate within one cycle",
      robotsHandling: "observe",
    },
    shadow,
    nowIso: "2026-09-11T12:05:00.000Z",
    ...overrides,
  };
  return buildEvidencePacket(input);
}

describe("breezy-canary — promotion decision (candidate -> shadow)", () => {
  it("allows promotion when lifecycle, packet, and probe are all green", () => {
    const shadow = shadowFixture();
    const packet = packetFixture({}, shadow);
    const decision = decidePromotionToShadow(
      { compliance: "conditional", operational: "candidate", optOut: false },
      packet,
      shadow,
    );
    expect(decision.ok).toBe(true);
    expect(decision.reason).toContain("lifecycle guard passed");
  });

  it("refuses promotion if candidate is opted out", () => {
    const shadow = shadowFixture();
    const packet = packetFixture({}, shadow);
    const decision = decidePromotionToShadow(
      { compliance: "conditional", operational: "candidate", optOut: true },
      packet,
      shadow,
    );
    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain("opt-out");
  });

  it("refuses promotion if robots would block", () => {
    const shadow = shadowFixture({
      robots: { checked: true, verdict: "blocked", wouldBlock: true, evidence: "disallow /json", fromCache: false },
    });
    const packet = packetFixture({}, shadow);
    const decision = decidePromotionToShadow(
      { compliance: "conditional", operational: "candidate", optOut: false },
      packet,
      shadow,
    );
    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain("robots");
  });
});
