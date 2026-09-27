import { describe, it, expect } from "bun:test";
import {
  buildAshbyProviderProfile,
  buildAshbyCandidateRow,
  decidePromotionToShadow,
  ASHBY_PROVIDER_ID,
  ASHBY_EVIDENCE_URL,
  ASHBY_EVIDENCE_LEASE_DAYS,
  ASHBY_ALLOWED_HOSTS,
} from "./ashby-canary";
import { buildEvidencePacket } from "./evidence-packet";
import type { CandidateShadowResult } from "./candidate-shadow";

describe("ashby-canary — provider profile", () => {
  it("declares mechanism/auth/visibility/contentScope matching Tier A ATS posture", () => {
    const profile = buildAshbyProviderProfile();
    expect(profile.id).toBe(ASHBY_PROVIDER_ID);
    expect(profile.providerFamily).toBe("ashby");
    expect(profile.mechanism).toBe("ats_api");
    expect(profile.authClass).toBe("none");
    expect(profile.visibilityFilter).toBe("published");
    expect(profile.contentScope).toBe("minimal");
    expect(profile.evidenceUrl).toBe(ASHBY_EVIDENCE_URL);
    expect(profile.evidenceLeaseDays).toBe(ASHBY_EVIDENCE_LEASE_DAYS);
    expect(profile.allowedHosts).toBe(ASHBY_ALLOWED_HOSTS);
    expect(profile.cadenceMinMinutes).toBe(60);
  });
});

describe("ashby-canary — candidate row generation", () => {
  it("builds MultiplyMii candidate row with valid metadata and provenance", () => {
    const row = buildAshbyCandidateRow({
      token: "multiplymii",
      companyName: "MultiplyMii",
      nowIso: "2026-09-27T12:00:00.000Z",
    });
    expect(row.sourceId).toBe("ashby:multiplymii");
    expect(row.providerId).toBe(ASHBY_PROVIDER_ID);
    expect(row.companyToken).toBe("multiplymii");
    expect(row.displayName).toBe("MultiplyMii");
    expect(row.endpointUrl).toBe("https://api.ashbyhq.com/posting-api/job-board/multiplymii");
    expect(row.complianceState).toBe("conditional");
    expect(row.operationalState).toBe("candidate");
    expect(row.canaryMaxNewItemsPerTick).toBe(2);
    expect(row.reviewDeadline).toBe("2026-10-11T12:00:00.000Z");
    expect(row.policyExpiry).toBe("2027-03-26T12:00:00.000Z");
  });
});

describe("ashby-canary — shadow promotion decision", () => {
  function shadowFixture(overrides: Partial<CandidateShadowResult> = {}): CandidateShadowResult {
    return {
      version: "1.1.0",
      timestamp: "2026-09-27T12:05:00.000Z",
      sourceId: "ashby:multiplymii",
      providerId: "ashby",
      displayName: "MultiplyMii",
      endpoint: {
        url: "https://api.ashbyhq.com/posting-api/job-board/multiplymii",
        isHttps: true,
        host: "api.ashbyhq.com",
        allowedHosts: "api.ashbyhq.com",
        hostValid: true,
      },
      auth: { class: "none", supported: true },
      visibility: { filter: "published", isPublic: true, ambiguous: false },
      provenance: {
        discoveryProvenance: JSON.stringify({ provenance: "ashby-ph-agency" }),
        evidenceUrl: ASHBY_EVIDENCE_URL,
        providerFamily: "ashby",
        mechanism: "ats_api",
      },
      cadence: { minMinutes: 60, maxMinutes: 1440, rateGuidance: "60 req/min" },
      robots: {
        checked: true,
        verdict: "allowed",
        wouldBlock: false,
        evidence: "No matching rule for /multiplymii; default allow",
        fromCache: false,
      },
      fetch: {
        attempted: true,
        status: 200,
        latencyMs: 150,
        bytesReceived: 14000,
        contentType: "application/json",
      },
      parse: { attempted: true, schemaHealth: "ok", itemCount: 54, error: undefined },
      sampleFunnel: {
        bytesReceived: 14000,
        parsedItems: 54,
        plausibleItems: 54,
        truncated: false,
        budgetExceeded: false,
      },
      diagnostic: {
        outcome: "HEALTHY_WITH_RESULTS",
        probes: [],
        requestCount: 2,
        bytesReceived: 14000,
        durationMs: 250,
        mutations: 0,
        shadowMode: true,
      },
      ...overrides,
    };
  }

  function packetFixture(overrides: Partial<any> = {}, shadow = shadowFixture()) {
    const candidate = buildAshbyCandidateRow({
      token: "multiplymii",
      companyName: "MultiplyMii",
      nowIso: "2026-09-27T12:00:00.000Z",
    });
    const provider = buildAshbyProviderProfile();
    return buildEvidencePacket({
      sourceId: candidate.sourceId,
      providerId: candidate.providerId,
      displayName: candidate.displayName,
      endpointUrl: candidate.endpointUrl,
      companyToken: candidate.companyToken,
      discoveryProvenance: candidate.discoveryProvenance,
      complianceState: candidate.complianceState,
      operationalState: candidate.operationalState,
      reviewDeadline: candidate.reviewDeadline,
      policyExpiry: candidate.policyExpiry,
      provider: {
        id: provider.id,
        providerFamily: provider.providerFamily,
        mechanism: provider.mechanism,
        authClass: provider.authClass,
        allowedHosts: provider.allowedHosts,
        evidenceUrl: provider.evidenceUrl,
        evidenceLeaseDays: provider.evidenceLeaseDays,
        visibilityFilter: provider.visibilityFilter,
        contentScope: provider.contentScope,
        cadenceMinMinutes: provider.cadenceMinMinutes,
        cadenceMaxMinutes: provider.cadenceMaxMinutes,
        rateGuidance: provider.rateGuidance,
        removalSemantics: provider.removalSemantics,
        robotsHandling: provider.robotsHandling,
      },
      shadow,
      nowIso: "2026-09-27T12:05:00.000Z",
      ...overrides,
    });
  }

  it("permits promotion to shadow for a clean probe with valid evidence packet", () => {
    const probe = shadowFixture();
    const packet = packetFixture({}, probe);

    const decision = decidePromotionToShadow(
      {
        compliance: "conditional",
        operational: "candidate",
        optOut: false,
      },
      packet,
      probe,
    );

    expect(decision.ok).toBe(true);
    expect(decision.reason).toContain("shadow probe healthy");
  });
});
