import { describe, it, expect } from "bun:test";
import {
  buildTeamtailorProviderProfile,
  buildTeamtailorCandidateRow,
  TEAMTAILOR_PROVIDER_ID,
  TEAMTAILOR_EVIDENCE_LEASE_DAYS,
} from "./teamtailor-canary";
import { decidePromotionToShadow } from "./source-promotion";
import { buildEvidencePacket, type EvidencePacketInput } from "./evidence-packet";
import type { CandidateShadowResult } from "./candidate-shadow";

describe("teamtailor-canary — provider profile (per-career-domain, SP-14 criterion: exact-domain provenance)", () => {
  it("scopes allowedHosts to exactly the given career domain, not a shared platform host", () => {
    const profile = buildTeamtailorProviderProfile("career.teamtailor.com");
    expect(profile.id).toBe(TEAMTAILOR_PROVIDER_ID);
    expect(profile.mechanism).toBe("rss");
    expect(profile.authClass).toBe("none");
    expect(profile.allowedHosts).toBe("career.teamtailor.com");
    expect(profile.contentScope).toBe("minimal");
    expect(profile.evidenceLeaseDays).toBe(180);
  });
});

describe("teamtailor-canary — candidate row", () => {
  it("builds one curated career domain as conditional/candidate", () => {
    const row = buildTeamtailorCandidateRow({ careerDomain: "career.teamtailor.com", companyName: "Teamtailor", nowIso: "2026-08-30T05:00:00.000Z" });
    expect(row.sourceId).toBe("teamtailor:career.teamtailor.com");
    expect(row.complianceState).toBe("conditional");
    expect(row.operationalState).toBe("candidate");
    expect(row.endpointUrl).toBe("https://career.teamtailor.com/jobs.rss");
  });

  it("14-day review deadline, 180-day evidence lease", () => {
    const row = buildTeamtailorCandidateRow({ careerDomain: "career.teamtailor.com", companyName: "Teamtailor", nowIso: "2026-08-30T00:00:00.000Z" });
    expect(row.reviewDeadline).toBe("2026-09-13T00:00:00.000Z");
    expect(row.policyExpiry).toBe("2027-02-26T00:00:00.000Z");
    expect(TEAMTAILOR_EVIDENCE_LEASE_DAYS).toBe(180);
  });
});

function shadowFixture(overrides: Partial<CandidateShadowResult> = {}): CandidateShadowResult {
  const base: CandidateShadowResult = {
    version: "1.0.0",
    timestamp: "2026-08-30T05:05:00.000Z",
    sourceId: "teamtailor:career.teamtailor.com",
    providerId: "teamtailor",
    displayName: "Teamtailor",
    endpoint: { url: "https://career.teamtailor.com/jobs.rss", isHttps: true, host: "career.teamtailor.com", allowedHosts: "career.teamtailor.com", hostValid: true },
    auth: { class: "none", supported: true },
    visibility: { filter: "published", isPublic: true, ambiguous: false },
    provenance: { discoveryProvenance: JSON.stringify({ provenance: "sp-14-curated-career-domain" }), evidenceUrl: "https://support.teamtailor.com/en/articles/11171756-rss-feed-how-to-guide", providerFamily: "teamtailor", mechanism: "rss" },
    cadence: { minMinutes: 60, maxMinutes: 1440, rateGuidance: "no documented limit" },
    robots: { checked: true, verdict: "allowed", wouldBlock: false, evidence: "no matching disallow for /jobs.rss", fromCache: false },
    fetch: { attempted: true, status: 200, latencyMs: 200, bytesReceived: 84177, contentType: "application/rss+xml" },
    parse: { attempted: true, schemaHealth: "ok", itemCount: 13, error: undefined },
    sampleFunnel: { bytesReceived: 84177, parsedItems: 13, plausibleItems: 13, truncated: false, budgetExceeded: false },
    diagnostic: { outcome: "HEALTHY_WITH_RESULTS", probes: [{ name: "fetch", passed: true, detail: "ok" }], requestCount: 2, bytesReceived: 84177, durationMs: 300, mutations: 0, shadowMode: true },
    stopReason: undefined,
  };
  return { ...base, ...overrides } as CandidateShadowResult;
}

function packetFixture(overrides: Partial<EvidencePacketInput> = {}, shadow = shadowFixture()) {
  const input: EvidencePacketInput = {
    sourceId: "teamtailor:career.teamtailor.com",
    providerId: "teamtailor",
    displayName: "Teamtailor",
    endpointUrl: "https://career.teamtailor.com/jobs.rss",
    companyToken: "career.teamtailor.com",
    discoveryProvenance: null,
    complianceState: "conditional",
    operationalState: "candidate",
    reviewDeadline: "2026-09-13T00:00:00.000Z",
    policyExpiry: "2027-02-26T00:00:00.000Z",
    provider: {
      id: "teamtailor",
      providerFamily: "teamtailor",
      mechanism: "rss",
      authClass: "none",
      allowedHosts: "career.teamtailor.com",
      evidenceUrl: "https://support.teamtailor.com/en/articles/11171756-rss-feed-how-to-guide",
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
    nowIso: "2026-08-30T05:05:00.000Z",
    ...overrides,
  };
  return buildEvidencePacket(input);
}

describe("teamtailor-canary — promotion decision (shared guard, real positive-yield evidence)", () => {
  it("promotes on a HEALTHY_WITH_RESULTS probe with real positive yield (13 open postings)", () => {
    const packet = packetFixture();
    const shadow = shadowFixture();
    expect(packet.status).toBe("review_ready");
    const decision = decidePromotionToShadow({ compliance: "conditional", operational: "candidate", optOut: false }, packet, shadow);
    expect(decision.ok).toBe(true);
  });

  it("refuses when robots would block", () => {
    const blockedShadow = shadowFixture({ robots: { checked: true, verdict: "disallowed", wouldBlock: true, evidence: "Disallow: /jobs.rss", fromCache: false } as any });
    const packet = packetFixture({}, blockedShadow);
    const decision = decidePromotionToShadow({ compliance: "conditional", operational: "candidate", optOut: false }, packet, blockedShadow);
    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain("robots");
  });
});
