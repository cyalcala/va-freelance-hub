import { describe, it, expect } from "bun:test";
import {
  buildRecruiteeProviderProfile,
  buildRecruiteeCandidateRow,
  RECRUITEE_PROVIDER_ID,
  RECRUITEE_EVIDENCE_LEASE_DAYS,
} from "./recruitee-canary";
import { decidePromotionToShadow } from "./source-promotion";
import { buildEvidencePacket, type EvidencePacketInput } from "./evidence-packet";
import type { CandidateShadowResult } from "./candidate-shadow";

describe("recruitee-canary — provider profile (per-company, XML feed not the tokened Careers API)", () => {
  it("scopes allowedHosts to exactly the given company subdomain", () => {
    const profile = buildRecruiteeProviderProfile("myjewellery");
    expect(profile.id).toBe(RECRUITEE_PROVIDER_ID);
    expect(profile.mechanism).toBe("xml_feed");
    expect(profile.authClass).toBe("none");
    expect(profile.allowedHosts).toBe("myjewellery.recruitee.com");
    expect(profile.contentScope).toBe("minimal");
    expect(profile.evidenceLeaseDays).toBe(180);
    expect(profile.evidenceUrl).toBe("https://docs.recruitee.com/docs/feed");
  });

  it("notes explicitly document targeting the XML feed, not the token-gated Careers Site API", () => {
    const profile = buildRecruiteeProviderProfile("myjewellery");
    expect(profile.notes).toContain("not Recruitee's separate token-gated Careers Site API");
  });
});

describe("recruitee-canary — candidate row", () => {
  it("builds one curated company as conditional/candidate", () => {
    const row = buildRecruiteeCandidateRow({ companySubdomain: "myjewellery", companyName: "My Jewellery", nowIso: "2026-08-30T06:00:00.000Z" });
    expect(row.sourceId).toBe("recruitee:myjewellery");
    expect(row.complianceState).toBe("conditional");
    expect(row.operationalState).toBe("candidate");
    expect(row.endpointUrl).toBe("https://myjewellery.recruitee.com/api/feeds/offers.xml");
  });

  it("14-day review deadline, 180-day evidence lease", () => {
    const row = buildRecruiteeCandidateRow({ companySubdomain: "myjewellery", companyName: "My Jewellery", nowIso: "2026-08-30T00:00:00.000Z" });
    expect(row.reviewDeadline).toBe("2026-09-13T00:00:00.000Z");
    expect(row.policyExpiry).toBe("2027-02-26T00:00:00.000Z");
    expect(RECRUITEE_EVIDENCE_LEASE_DAYS).toBe(180);
  });
});

function shadowFixture(overrides: Partial<CandidateShadowResult> = {}): CandidateShadowResult {
  const base: CandidateShadowResult = {
    version: "1.0.0",
    timestamp: "2026-08-30T06:05:00.000Z",
    sourceId: "recruitee:myjewellery",
    providerId: "recruitee",
    displayName: "My Jewellery",
    endpoint: { url: "https://myjewellery.recruitee.com/api/feeds/offers.xml", isHttps: true, host: "myjewellery.recruitee.com", allowedHosts: "myjewellery.recruitee.com", hostValid: true },
    auth: { class: "none", supported: true },
    visibility: { filter: "published", isPublic: true, ambiguous: false },
    provenance: { discoveryProvenance: JSON.stringify({ provenance: "sp-15-curated-company" }), evidenceUrl: "https://docs.recruitee.com/docs/feed", providerFamily: "recruitee", mechanism: "xml_feed" },
    cadence: { minMinutes: 60, maxMinutes: 1440, rateGuidance: "no documented limit" },
    robots: { checked: true, verdict: "allowed", wouldBlock: false, evidence: "only /v/ disallowed", fromCache: false },
    fetch: { attempted: true, status: 200, latencyMs: 250, bytesReceived: 400000, contentType: "application/xml" },
    parse: { attempted: true, schemaHealth: "ok", itemCount: 91, error: undefined },
    sampleFunnel: { bytesReceived: 400000, parsedItems: 91, plausibleItems: 91, truncated: false, budgetExceeded: false },
    diagnostic: { outcome: "HEALTHY_WITH_RESULTS", probes: [{ name: "fetch", passed: true, detail: "ok" }], requestCount: 2, bytesReceived: 400000, durationMs: 350, mutations: 0, shadowMode: true },
    stopReason: undefined,
  };
  return { ...base, ...overrides } as CandidateShadowResult;
}

function packetFixture(overrides: Partial<EvidencePacketInput> = {}, shadow = shadowFixture()) {
  const input: EvidencePacketInput = {
    sourceId: "recruitee:myjewellery",
    providerId: "recruitee",
    displayName: "My Jewellery",
    endpointUrl: "https://myjewellery.recruitee.com/api/feeds/offers.xml",
    companyToken: "myjewellery",
    discoveryProvenance: null,
    complianceState: "conditional",
    operationalState: "candidate",
    reviewDeadline: "2026-09-13T00:00:00.000Z",
    policyExpiry: "2027-02-26T00:00:00.000Z",
    provider: {
      id: "recruitee",
      providerFamily: "recruitee",
      mechanism: "xml_feed",
      authClass: "none",
      allowedHosts: "myjewellery.recruitee.com",
      evidenceUrl: "https://docs.recruitee.com/docs/feed",
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
    nowIso: "2026-08-30T06:05:00.000Z",
    ...overrides,
  };
  return buildEvidencePacket(input);
}

describe("recruitee-canary — promotion decision (shared guard, real positive-yield evidence)", () => {
  it("promotes on a HEALTHY_WITH_RESULTS probe with real positive yield (91 open postings)", () => {
    const packet = packetFixture();
    const shadow = shadowFixture();
    expect(packet.status).toBe("review_ready");
    const decision = decidePromotionToShadow({ compliance: "conditional", operational: "candidate", optOut: false }, packet, shadow);
    expect(decision.ok).toBe(true);
  });

  it("refuses when robots would block", () => {
    const blockedShadow = shadowFixture({ robots: { checked: true, verdict: "disallowed", wouldBlock: true, evidence: "Disallow: /api/", fromCache: false } as any });
    const packet = packetFixture({}, blockedShadow);
    const decision = decidePromotionToShadow({ compliance: "conditional", operational: "candidate", optOut: false }, packet, blockedShadow);
    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain("robots");
  });

  // SP-15's plan explicitly calls out opt-out/do-not-reingest verification
  // "before shadow, canary, and each reconciliation" as its own acceptance
  // criterion — this is the shared decidePromotionToShadow's existing
  // optOut gate (already exercised implicitly by every other adapter this
  // session), demonstrated explicitly here for this unit.
  it("refuses promotion when the source is opted out, even with otherwise-perfect evidence", () => {
    const packet = packetFixture();
    const shadow = shadowFixture();
    expect(packet.status).toBe("review_ready");
    const decision = decidePromotionToShadow({ compliance: "conditional", operational: "candidate", optOut: true }, packet, shadow);
    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain("opt-out");
  });

  it("opt-out blocks promotion regardless of compliance state (allowed, not just conditional)", () => {
    const packet = packetFixture({ complianceState: "allowed" as any });
    const shadow = shadowFixture();
    const decision = decidePromotionToShadow({ compliance: "allowed", operational: "candidate", optOut: true }, packet, shadow);
    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain("opt-out");
  });
});
