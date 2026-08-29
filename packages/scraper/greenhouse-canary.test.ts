import { describe, it, expect } from "bun:test";
import {
  buildGreenhouseProviderProfile,
  buildGreenhouseCandidateRow,
  decidePromotionToShadow,
  GREENHOUSE_PROVIDER_ID,
  GREENHOUSE_EVIDENCE_LEASE_DAYS,
} from "./greenhouse-canary";
import { buildEvidencePacket, type EvidencePacketInput } from "./evidence-packet";
import type { CandidateShadowResult } from "./candidate-shadow";

describe("greenhouse-canary — provider profile (minimal-index, public, no-auth)", () => {
  it("declares mechanism/auth/visibility/contentScope matching the strategy's operating posture", () => {
    const profile = buildGreenhouseProviderProfile();
    expect(profile.id).toBe(GREENHOUSE_PROVIDER_ID);
    expect(profile.mechanism).toBe("ats_api");
    expect(profile.authClass).toBe("none");
    expect(profile.visibilityFilter).toBe("published");
    expect(profile.contentScope).toBe("minimal");
    expect(profile.evidenceUrl).toBe("https://docs.greenhouse.io/job-board.html");
    expect(profile.evidenceLeaseDays).toBe(180);
    expect(profile.allowedHosts).toContain("boards-api.greenhouse.io");
  });
});

describe("greenhouse-canary — candidate row (SP-12 criterion 3: existing five-token pause not globally removed)", () => {
  it("builds one curated board as conditional/candidate, never active/canary directly", () => {
    const row = buildGreenhouseCandidateRow({ token: "grafanalabs", companyName: "Grafana Labs", nowIso: "2026-08-29T15:00:00.000Z" });
    expect(row.sourceId).toBe("greenhouse:grafanalabs");
    expect(row.complianceState).toBe("conditional");
    expect(row.operationalState).toBe("candidate");
    expect(row.endpointUrl).toBe("https://boards-api.greenhouse.io/v1/boards/grafanalabs/jobs");
  });

  it("14-day review deadline and 180-day evidence lease from the decision instant", () => {
    const row = buildGreenhouseCandidateRow({ token: "grafanalabs", companyName: "Grafana Labs", nowIso: "2026-08-29T00:00:00.000Z" });
    expect(row.reviewDeadline).toBe("2026-09-12T00:00:00.000Z");
    expect(row.policyExpiry).toBe("2027-02-25T00:00:00.000Z");
    expect(GREENHOUSE_EVIDENCE_LEASE_DAYS).toBe(180);
  });

  it("only the exact requested board is built — no other token is touched by calling this once", () => {
    const row = buildGreenhouseCandidateRow({ token: "grafanalabs", companyName: "Grafana Labs", nowIso: "2026-08-29T00:00:00.000Z" });
    expect(row.sourceId).not.toContain("nearform");
    expect(row.sourceId).not.toContain("gitlab");
  });
});

function shadowFixture(overrides: Partial<CandidateShadowResult> = {}): CandidateShadowResult {
  const base: CandidateShadowResult = {
    version: "1.0.0",
    timestamp: "2026-08-29T15:05:00.000Z",
    sourceId: "greenhouse:grafanalabs",
    providerId: "greenhouse",
    displayName: "Grafana Labs",
    endpoint: { url: "https://boards-api.greenhouse.io/v1/boards/grafanalabs/jobs", isHttps: true, host: "boards-api.greenhouse.io", allowedHosts: "boards-api.greenhouse.io,boards.greenhouse.io", hostValid: true },
    auth: { class: "none", supported: true },
    visibility: { filter: "published", isPublic: true, ambiguous: false },
    provenance: { discoveryProvenance: JSON.stringify({ provenance: "sp-12-curated-board" }), evidenceUrl: "https://docs.greenhouse.io/job-board.html", providerFamily: "greenhouse", mechanism: "ats_api" },
    cadence: { minMinutes: 60, maxMinutes: 1440, rateGuidance: "60 req/min" },
    robots: { checked: true, verdict: "allowed", wouldBlock: false, evidence: "no robots.txt disallow found", fromCache: false },
    fetch: { attempted: true, status: 200, latencyMs: 200, bytesReceived: 8000, contentType: "application/json" },
    parse: { attempted: true, schemaHealth: "ok", itemCount: 40, error: undefined },
    sampleFunnel: { bytesReceived: 8000, parsedItems: 40, plausibleItems: 38, truncated: false, budgetExceeded: false },
    diagnostic: { outcome: "HEALTHY_WITH_RESULTS", probes: [{ name: "fetch", passed: true, detail: "ok" }], requestCount: 2, bytesReceived: 8000, durationMs: 250, mutations: 0, shadowMode: true },
    stopReason: undefined,
  };
  return { ...base, ...overrides } as CandidateShadowResult;
}

function packetFixture(overrides: Partial<EvidencePacketInput> = {}, shadow = shadowFixture()) {
  const input: EvidencePacketInput = {
    sourceId: "greenhouse:grafanalabs",
    providerId: "greenhouse",
    displayName: "Grafana Labs",
    endpointUrl: "https://boards-api.greenhouse.io/v1/boards/grafanalabs/jobs",
    companyToken: "grafanalabs",
    discoveryProvenance: null,
    complianceState: "conditional",
    operationalState: "candidate",
    reviewDeadline: "2026-09-12T00:00:00.000Z",
    policyExpiry: "2027-02-25T00:00:00.000Z",
    provider: {
      id: "greenhouse",
      providerFamily: "greenhouse",
      mechanism: "ats_api",
      authClass: "none",
      allowedHosts: "boards-api.greenhouse.io,boards.greenhouse.io",
      evidenceUrl: "https://docs.greenhouse.io/job-board.html",
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
    nowIso: "2026-08-29T15:05:00.000Z",
    ...overrides,
  };
  return buildEvidencePacket(input);
}

describe("greenhouse-canary — promotion decision (SP-12 criterion 2: evidence-gated shadow entry)", () => {
  it("promotes when lifecycle guard, complete evidence packet, and healthy shadow all agree", () => {
    const packet = packetFixture();
    const shadow = shadowFixture();
    const decision = decidePromotionToShadow({ compliance: "conditional", operational: "candidate", optOut: false }, packet, shadow);
    expect(decision.ok).toBe(true);
  });

  it("refuses when the lifecycle guard fails (not currently candidate)", () => {
    const packet = packetFixture();
    const shadow = shadowFixture();
    const decision = decidePromotionToShadow({ compliance: "conditional", operational: "shadow", optOut: false }, packet, shadow);
    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain("lifecycle guard");
  });

  it("refuses when compliance is a hold (needs_review), even with healthy evidence", () => {
    const decision = decidePromotionToShadow({ compliance: "needs_review", operational: "candidate", optOut: false }, packetFixture(), shadowFixture());
    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain("lifecycle guard");
  });

  it("refuses when opted out, regardless of everything else", () => {
    const decision = decidePromotionToShadow({ compliance: "conditional", operational: "candidate", optOut: true }, packetFixture(), shadowFixture());
    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain("opt-out");
  });

  it("refuses when the evidence packet is incomplete even if lifecycle and shadow are fine", () => {
    const incompletePacket = packetFixture({ shadow: null });
    const decision = decidePromotionToShadow({ compliance: "conditional", operational: "candidate", optOut: false }, incompletePacket, shadowFixture());
    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain("evidence packet incomplete");
  });

  it("refuses when the shadow probe outcome is not healthy", () => {
    const badShadow = shadowFixture({ diagnostic: { outcome: "POLICY_BLOCKED", probes: [], requestCount: 1, bytesReceived: 0, durationMs: 5, mutations: 0, shadowMode: true } as any });
    const packet = packetFixture({}, badShadow);
    const decision = decidePromotionToShadow({ compliance: "conditional", operational: "candidate", optOut: false }, packet, badShadow);
    expect(decision.ok).toBe(false);
  });

  it("refuses when robots would block, even if the probe otherwise looks healthy", () => {
    const blockedShadow = shadowFixture({ robots: { checked: true, verdict: "disallowed", wouldBlock: true, evidence: "Disallow: /v1/boards/", fromCache: false } as any });
    const packet = packetFixture({}, blockedShadow);
    const decision = decidePromotionToShadow({ compliance: "conditional", operational: "candidate", optOut: false }, packet, blockedShadow);
    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain("robots");
  });
});
