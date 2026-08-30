import { describe, it, expect } from "bun:test";
import {
  buildSmartRecruitersProviderProfile,
  buildSmartRecruitersCandidateRow,
  SMARTRECRUITERS_PROVIDER_ID,
  SMARTRECRUITERS_EVIDENCE_LEASE_DAYS,
} from "./smartrecruiters-canary";
import { decidePromotionToShadow } from "./source-promotion";
import { buildEvidencePacket, type EvidencePacketInput } from "./evidence-packet";
import type { CandidateShadowResult } from "./candidate-shadow";

describe("smartrecruiters-canary — provider profile", () => {
  it("declares mechanism/auth/visibility/contentScope matching a genuinely minimal API shape", () => {
    const profile = buildSmartRecruitersProviderProfile();
    expect(profile.id).toBe(SMARTRECRUITERS_PROVIDER_ID);
    expect(profile.mechanism).toBe("ats_api");
    expect(profile.authClass).toBe("none");
    expect(profile.visibilityFilter).toBe("published");
    expect(profile.contentScope).toBe("minimal");
    expect(profile.evidenceUrl).toBe("https://developers.smartrecruiters.com/docs/posting-api");
    expect(profile.evidenceLeaseDays).toBe(180);
    expect(profile.allowedHosts).toContain("api.smartrecruiters.com");
  });
});

describe("smartrecruiters-canary — candidate row", () => {
  it("builds one curated company as conditional/candidate", () => {
    const row = buildSmartRecruitersCandidateRow({ companyIdentifier: "smartrecruiters", companyName: "SmartRecruiters Inc", nowIso: "2026-08-30T04:00:00.000Z" });
    expect(row.sourceId).toBe("smartrecruiters:smartrecruiters");
    expect(row.complianceState).toBe("conditional");
    expect(row.operationalState).toBe("candidate");
    expect(row.endpointUrl).toBe("https://api.smartrecruiters.com/v1/companies/smartrecruiters/postings?offset=0&limit=100");
  });

  it("14-day review deadline, 180-day evidence lease", () => {
    const row = buildSmartRecruitersCandidateRow({ companyIdentifier: "smartrecruiters", companyName: "SmartRecruiters Inc", nowIso: "2026-08-30T00:00:00.000Z" });
    expect(row.reviewDeadline).toBe("2026-09-13T00:00:00.000Z");
    expect(row.policyExpiry).toBe("2027-02-26T00:00:00.000Z");
    expect(SMARTRECRUITERS_EVIDENCE_LEASE_DAYS).toBe(180);
  });
});

function shadowFixture(overrides: Partial<CandidateShadowResult> = {}): CandidateShadowResult {
  const base: CandidateShadowResult = {
    version: "1.0.0",
    timestamp: "2026-08-30T04:05:00.000Z",
    sourceId: "smartrecruiters:smartrecruiters",
    providerId: "smartrecruiters",
    displayName: "SmartRecruiters Inc",
    endpoint: { url: "https://api.smartrecruiters.com/v1/companies/smartrecruiters/postings?offset=0&limit=100", isHttps: true, host: "api.smartrecruiters.com", allowedHosts: "api.smartrecruiters.com", hostValid: true },
    auth: { class: "none", supported: true },
    visibility: { filter: "published", isPublic: true, ambiguous: false },
    provenance: { discoveryProvenance: JSON.stringify({ provenance: "sp-13-curated-company" }), evidenceUrl: "https://developers.smartrecruiters.com/docs/posting-api", providerFamily: "smartrecruiters", mechanism: "ats_api" },
    cadence: { minMinutes: 60, maxMinutes: 1440, rateGuidance: "no documented limit" },
    robots: { checked: true, verdict: "allowed", wouldBlock: false, evidence: "no robots.txt disallow found", fromCache: false },
    fetch: { attempted: true, status: 200, latencyMs: 180, bytesReceived: 2200, contentType: "application/json" },
    parse: { attempted: true, schemaHealth: "ok", itemCount: 2, error: undefined },
    sampleFunnel: { bytesReceived: 2200, parsedItems: 2, plausibleItems: 2, truncated: false, budgetExceeded: false },
    diagnostic: { outcome: "HEALTHY_WITH_RESULTS", probes: [{ name: "fetch", passed: true, detail: "ok" }], requestCount: 2, bytesReceived: 2200, durationMs: 220, mutations: 0, shadowMode: true },
    stopReason: undefined,
  };
  return { ...base, ...overrides } as CandidateShadowResult;
}

function packetFixture(overrides: Partial<EvidencePacketInput> = {}, shadow = shadowFixture()) {
  const input: EvidencePacketInput = {
    sourceId: "smartrecruiters:smartrecruiters",
    providerId: "smartrecruiters",
    displayName: "SmartRecruiters Inc",
    endpointUrl: "https://api.smartrecruiters.com/v1/companies/smartrecruiters/postings?offset=0&limit=100",
    companyToken: "smartrecruiters",
    discoveryProvenance: null,
    complianceState: "conditional",
    operationalState: "candidate",
    reviewDeadline: "2026-09-13T00:00:00.000Z",
    policyExpiry: "2027-02-26T00:00:00.000Z",
    provider: {
      id: "smartrecruiters",
      providerFamily: "smartrecruiters",
      mechanism: "ats_api",
      authClass: "none",
      allowedHosts: "api.smartrecruiters.com",
      evidenceUrl: "https://developers.smartrecruiters.com/docs/posting-api",
      evidenceLeaseDays: 180,
      visibilityFilter: "published",
      contentScope: "minimal",
      cadenceMinMinutes: 60,
      cadenceMaxMinutes: 1440,
      rateGuidance: "no documented limit",
      removalSemantics: "deactivate within one cycle",
      robotsHandling: "observe",
    },
    shadow,
    nowIso: "2026-08-30T04:05:00.000Z",
    ...overrides,
  };
  return buildEvidencePacket(input);
}

describe("smartrecruiters-canary — promotion decision (shared guard, real positive-yield evidence)", () => {
  it("promotes on a HEALTHY_WITH_RESULTS probe with real positive yield (2 open postings)", () => {
    const packet = packetFixture();
    const shadow = shadowFixture();
    expect(packet.status).toBe("review_ready");
    const decision = decidePromotionToShadow({ compliance: "conditional", operational: "candidate", optOut: false }, packet, shadow);
    expect(decision.ok).toBe(true);
  });

  it("refuses when robots would block", () => {
    const blockedShadow = shadowFixture({ robots: { checked: true, verdict: "disallowed", wouldBlock: true, evidence: "Disallow: /v1/companies/", fromCache: false } as any });
    const packet = packetFixture({}, blockedShadow);
    const decision = decidePromotionToShadow({ compliance: "conditional", operational: "candidate", optOut: false }, packet, blockedShadow);
    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain("robots");
  });
});
