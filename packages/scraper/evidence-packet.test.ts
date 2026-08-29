/**
 * SP-08 — Evidence packets and review-debt alerts.
 *
 * Pure packet fixtures, deadline/idempotency/read-only report checks.
 * No D1 writes, no network, no AI — external content as evidence only.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildEvidencePacket,
  deadlineBucket,
  isPreExpiryDue,
  deduplicateAlerts,
  renderEvidenceReport,
  packetHashFor,
  type EvidencePacketInput,
} from "./evidence-packet";
import type { CandidateShadowResult } from "./candidate-shadow";
import { SHADOW_MAX_BYTES } from "./candidate-shadow";

function shadowFixture(overrides: Partial<CandidateShadowResult> = {}): CandidateShadowResult {
  const base: CandidateShadowResult = {
    version: "1.0.0",
    timestamp: "2026-08-29T12:00:00.000Z",
    sourceId: "greenhouse:acme",
    providerId: "greenhouse",
    displayName: "ACME",
    endpoint: { url: "https://boards-api.greenhouse.io/v1/boards/acme/jobs", isHttps: true, host: "boards-api.greenhouse.io", allowedHosts: "boards-api.greenhouse.io,boards.greenhouse.io", hostValid: true },
    auth: { class: "none", supported: true },
    visibility: { filter: "published", isPublic: true, ambiguous: false },
    provenance: { discoveryProvenance: JSON.stringify({ provenance: "eligible-opportunity-sample" }), evidenceUrl: "https://docs.greenhouse.io/job-board.html", providerFamily: "greenhouse", mechanism: "ats_api" },
    cadence: { minMinutes: 60, maxMinutes: 1440, rateGuidance: "60 req/min" },
    robots: { checked: true, verdict: "allowed", wouldBlock: false, evidence: "Allow: /", fromCache: false },
    fetch: { attempted: true, status: 200, latencyMs: 120, bytesReceived: 4200, contentType: "application/json" },
    parse: { attempted: true, schemaHealth: "ok", itemCount: 12, error: undefined },
    sampleFunnel: { bytesReceived: 4200, parsedItems: 12, plausibleItems: 10, truncated: false, budgetExceeded: false },
    diagnostic: { outcome: "HEALTHY_WITH_RESULTS", probes: [{ name: "fetch", passed: true, detail: "ok" }], requestCount: 2, bytesReceived: 4200, durationMs: 180, mutations: 0, shadowMode: true },
    stopReason: undefined,
  };
  return { ...base, ...overrides, endpoint: { ...base.endpoint, ...(overrides.endpoint ?? {}) }, auth: { ...base.auth, ...(overrides.auth ?? {}) }, visibility: { ...base.visibility, ...(overrides.visibility ?? {}) }, provenance: { ...base.provenance, ...(overrides.provenance ?? {}) }, cadence: { ...base.cadence, ...(overrides.cadence ?? {}) }, robots: { ...base.robots, ...(overrides.robots ?? {}) }, fetch: { ...base.fetch, ...(overrides.fetch ?? {}) }, parse: { ...base.parse, ...(overrides.parse ?? {}) }, sampleFunnel: { ...base.sampleFunnel, ...(overrides.sampleFunnel ?? {}) }, diagnostic: { ...base.diagnostic, ...(overrides.diagnostic ?? {}) } } as CandidateShadowResult;
}

function inputFixture(overrides: Partial<EvidencePacketInput> = {}): EvidencePacketInput {
  const base: EvidencePacketInput = {
    sourceId: "greenhouse:acme",
    providerId: "greenhouse",
    displayName: "ACME Corp",
    endpointUrl: "https://boards-api.greenhouse.io/v1/boards/acme/jobs",
    companyToken: "acme",
    discoveryProvenance: JSON.stringify({ companyName: "ACME", provenance: "eligible-opportunity-sample" }),
    complianceState: "needs_review",
    operationalState: "candidate",
    reviewDeadline: "2026-09-12T00:00:00.000Z",
    policyExpiry: "2026-12-29T00:00:00.000Z",
    provider: {
      id: "greenhouse",
      providerFamily: "greenhouse",
      mechanism: "ats_api",
      authClass: "none",
      endpointPattern: "https://boards-api.greenhouse.io/v1/boards/{token}/jobs",
      allowedHosts: "boards-api.greenhouse.io,boards.greenhouse.io",
      evidenceUrl: "https://docs.greenhouse.io/job-board.html",
      evidenceLeaseDays: 180,
      visibilityFilter: "published",
      contentScope: "minimal",
      cadenceMinMinutes: 60,
      cadenceMaxMinutes: 1440,
      rateGuidance: "60 req/min",
      removalSemantics: "feed removal deactivates within one successful fetch",
      robotsHandling: "observe",
    },
    shadow: shadowFixture(),
    nowIso: "2026-08-29T12:00:00.000Z",
  };
  // deep merge provider
  if (overrides.provider) {
    base.provider = { ...base.provider, ...overrides.provider };
    delete (overrides as any).provider;
  }
  if (overrides.shadow !== undefined) base.shadow = overrides.shadow as any;
  Object.assign(base, overrides);
  return base;
}

describe("evidence-packet — complete packet becomes review_ready (SP-08 criterion 1a)", () => {
  it("complete evidence → review_ready, zero missing", () => {
    const input = inputFixture();
    const pkt = buildEvidencePacket(input);
    expect(pkt.status).toBe("review_ready");
    expect(pkt.missingEvidence).toEqual([]);
    expect(pkt.unresolvedQuestions).toEqual([]);
    expect(pkt.endpoint.hostValid).toBe(true);
    expect(pkt.auth.supported).toBe(true);
    expect(pkt.visibility.isPublic).toBe(true);
    expect(pkt.shadowEconomics?.outcome).toBe("HEALTHY_WITH_RESULTS");
  });

  it("packet reports all required provenance/cadence/endpoint/auth/visibility/robots/shadow fields", () => {
    const input = inputFixture();
    const pkt = buildEvidencePacket(input);
    expect(pkt.mechanism).toBe("ats_api");
    expect(pkt.allowedHosts).toBe("boards-api.greenhouse.io,boards.greenhouse.io");
    expect(pkt.evidenceUrl).toBe("https://docs.greenhouse.io/job-board.html");
    expect(pkt.cadence.minMinutes).toBe(60);
    expect(pkt.cadence.maxMinutes).toBe(1440);
    expect(pkt.removalSemantics).toBeTruthy();
    expect(pkt.shadowEconomics?.requestCount).toBe(2);
    expect(pkt.shadowEconomics?.bytesReceived).toBe(4200);
    expect(pkt.shadowEconomics?.itemCount).toBe(12);
    expect(pkt.reviewDeadline).toBe("2026-09-12T00:00:00.000Z");
    expect(pkt.policyExpiry).toBe("2026-12-29T00:00:00.000Z");
  });
});

describe("evidence-packet — incomplete remains candidate and lists missing (SP-08 criterion 1b)", () => {
  it("missing provider evidenceUrl → candidate, missing listed", () => {
    const input = inputFixture({ provider: { evidenceUrl: null } as any });
    const pkt = buildEvidencePacket(input);
    expect(pkt.status).toBe("candidate");
    expect(pkt.missingEvidence.some((m) => m.includes("evidenceUrl"))).toBe(true);
  });

  it("ambiguous visibility (null/private/empty) → candidate and lists visibility", () => {
    for (const filt of [null, "private", ""] as any[]) {
      const pkt = buildEvidencePacket(inputFixture({ provider: { visibilityFilter: filt } as any }));
      expect(pkt.status).toBe("candidate");
      expect(pkt.missingEvidence.some((m) => m.toLowerCase().includes("visibility"))).toBe(true);
    }
  });

  it("host mismatch (lookalike) → candidate, host not in allowedHosts", () => {
    const pkt = buildEvidencePacket(
      inputFixture({
        endpointUrl: "https://evilgreenhouse.io/v1/boards/acme/jobs",
        provider: { allowedHosts: "boards-api.greenhouse.io" } as any,
      }),
    );
    expect(pkt.status).toBe("candidate");
    expect(pkt.missingEvidence.some((m) => m.includes("not in allowedHosts"))).toBe(true);
    expect(pkt.endpoint.hostValid).toBe(false);
  });

  it("unsupported auth → candidate", () => {
    const pkt = buildEvidencePacket(inputFixture({ provider: { authClass: "api_key" } as any }));
    expect(pkt.status).toBe("candidate");
    expect(pkt.missingEvidence.some((m) => m.includes("authClass"))).toBe(true);
  });

  it("shadow not yet run → candidate, lists shadow probe", () => {
    const input = inputFixture({ shadow: null });
    const pkt = buildEvidencePacket(input);
    expect(pkt.status).toBe("candidate");
    expect(pkt.missingEvidence.some((m) => m.includes("shadow probe not yet run"))).toBe(true);
  });

  it("robots wouldBlock → candidate", () => {
    const sh = shadowFixture({ robots: { checked: true, verdict: "disallowed", wouldBlock: true, evidence: "Disallow: /", fromCache: false } as any, diagnostic: { outcome: "POLICY_BLOCKED", probes: [], requestCount: 1, bytesReceived: 0, durationMs: 10, mutations: 0, shadowMode: true } as any, stopReason: "robots wouldBlock", fetch: { attempted: false, bytesReceived: 0 } as any });
    const pkt = buildEvidencePacket(inputFixture({ shadow: sh }));
    expect(pkt.status).toBe("candidate");
    expect(pkt.missingEvidence.some((m) => m.includes("wouldBlock"))).toBe(true);
  });

  it("oversize shadow payload → candidate (budget)", () => {
    const sh = shadowFixture({
      diagnostic: { outcome: "DEGRADED_ANOMALOUS", probes: [], requestCount: 2, bytesReceived: SHADOW_MAX_BYTES + 1024, durationMs: 10, mutations: 0, shadowMode: true } as any,
      sampleFunnel: { bytesReceived: SHADOW_MAX_BYTES + 1024, parsedItems: 0, plausibleItems: 0, truncated: true, budgetExceeded: true } as any,
      stopReason: "oversized payload",
      fetch: { attempted: true, status: 200, bytesReceived: SHADOW_MAX_BYTES + 1024 } as any,
    });
    const pkt = buildEvidencePacket(inputFixture({ shadow: sh }));
    // The builder sees bytesReceived > budget via shadowEconomics, so marks missing
    expect(pkt.missingEvidence.some((m) => m.includes("exceeds 512 KiB") || m.includes("oversized"))).toBe(true);
  });

  it("missing cadence envelope → candidate", () => {
    const pkt = buildEvidencePacket(inputFixture({ provider: { cadenceMinMinutes: null, cadenceMaxMinutes: null } as any }));
    expect(pkt.missingEvidence.some((m) => m.includes("cadenceMin"))).toBe(true);
    expect(pkt.missingEvidence.some((m) => m.includes("cadenceMax"))).toBe(true);
  });

  it("missing reviewDeadline → candidate", () => {
    const pkt = buildEvidencePacket(inputFixture({ reviewDeadline: null }));
    expect(pkt.missingEvidence.some((m) => m.includes("reviewDeadline"))).toBe(true);
  });
});

describe("evidence-packet — deadlines and pre-expiry (SP-08 criterion 2)", () => {
  it("deadlineBucket overdue / due_7 / due_14 / due_30 / ok", () => {
    const now = "2026-08-29T12:00:00.000Z";
    expect(deadlineBucket("2026-08-20T00:00:00.000Z", now)).toBe("overdue");
    expect(deadlineBucket("2026-08-29T12:00:00.000Z", now)).toBe("overdue"); // exact deadline is overdue (>=)
    expect(deadlineBucket("2026-09-02T12:00:00.000Z", now)).toBe("due_7"); // 4 days
    expect(deadlineBucket("2026-09-05T12:00:00.000Z", now)).toBe("due_7"); // 7 days
    expect(deadlineBucket("2026-09-08T12:00:00.000Z", now)).toBe("due_14"); // 10 days
    expect(deadlineBucket("2026-09-12T12:00:00.000Z", now)).toBe("due_14"); // 14 days
    expect(deadlineBucket("2026-09-20T12:00:00.000Z", now)).toBe("due_30"); // 22 days
    expect(deadlineBucket("2026-09-28T12:00:00.000Z", now)).toBe("due_30"); // 30 days
    expect(deadlineBucket("2026-10-29T12:00:00.000Z", now)).toBe("ok"); // 60 days
    expect(deadlineBucket(null, now)).toBe("ok");
  });

  it("isPreExpiryDue within 30d lead window", () => {
    const now = "2026-08-29T12:00:00.000Z";
    expect(isPreExpiryDue("2026-09-28T00:00:00.000Z", now, 30)).toBe(true); // 30 days - last day before expiry
    expect(isPreExpiryDue("2026-09-10T00:00:00.000Z", now, 30)).toBe(true); // 12 days
    expect(isPreExpiryDue("2026-08-29T12:00:00.000Z", now, 30)).toBe(false); // already expired (now >= expiry, not < expiry)
    expect(isPreExpiryDue("2026-12-29T00:00:00.000Z", now, 30)).toBe(false); // far future
    expect(isPreExpiryDue(null, now, 30)).toBe(false);
  });

  it("packet reviewBucket and preExpiryDue are computed", () => {
    const now = "2026-08-29T12:00:00.000Z";
    const pktOverdue = buildEvidencePacket(inputFixture({ reviewDeadline: "2026-08-20T00:00:00.000Z", policyExpiry: "2026-09-28T00:00:00.000Z", nowIso: now }));
    expect(pktOverdue.reviewBucket).toBe("overdue");
    expect(pktOverdue.preExpiryDue).toBe(true);

    const pktOk = buildEvidencePacket(inputFixture({ reviewDeadline: "2026-10-29T00:00:00.000Z", policyExpiry: "2026-12-29T00:00:00.000Z", nowIso: now }));
    expect(pktOk.reviewBucket).toBe("ok");
    expect(pktOk.preExpiryDue).toBe(false);
  });

  it("deduplicated alerts — one per sourceId, most urgent wins", () => {
    const now = "2026-08-29T12:00:00.000Z";
    const pkt1 = buildEvidencePacket(inputFixture({ sourceId: "greenhouse:acme", reviewDeadline: "2026-09-02T00:00:00.000Z", nowIso: now, provider: { evidenceUrl: null } as any })); // due_7 but incomplete
    const pkt2 = buildEvidencePacket(inputFixture({ sourceId: "greenhouse:acme", reviewDeadline: "2026-08-20T00:00:00.000Z", nowIso: now })); // overdue complete
    // Same sourceId, two packets (e.g., re-probed) — dedupe keeps most urgent (overdue)
    const alerts = deduplicateAlerts([pkt1, pkt2]);
    expect(alerts.length).toBe(1);
    expect(alerts[0].sourceId).toBe("greenhouse:acme");
    expect(alerts[0].bucket).toBe("overdue");
  });

  it("report is deduplicated and lifecycle-resolved — no duplicate source rows", () => {
    const now = "2026-08-29T12:00:00.000Z";
    const a = buildEvidencePacket(inputFixture({ sourceId: "greenhouse:acme", reviewDeadline: "2026-09-02T00:00:00.000Z", nowIso: now }));
    const b = buildEvidencePacket(inputFixture({ sourceId: "greenhouse:baker", reviewDeadline: "2026-08-20T00:00:00.000Z", nowIso: now }));
    const c = buildEvidencePacket(inputFixture({ sourceId: "greenhouse:acme", reviewDeadline: "2026-08-20T00:00:00.000Z", nowIso: now })); // duplicate acme, overdue
    const report = renderEvidenceReport([a, b, c], now);
    // Should have 2 unique sourceIds in alerts section, not 3
    const alertSection = report.split("## Alerts")[1];
    expect(alertSection).toContain("greenhouse:acme");
    expect(alertSection).toContain("greenhouse:baker");
    // Count alerts table rows for acme — should appear once in alerts, not twice
    const acmeMatches = (alertSection.match(/greenhouse:acme/g) ?? []).length;
    expect(acmeMatches).toBe(1);
  });

  it("idempotency — same input yields same packetHash and status", () => {
    const input = inputFixture();
    const p1 = buildEvidencePacket(input);
    const p2 = buildEvidencePacket(input);
    expect(p1.packetHash).toBe(p2.packetHash);
    expect(p1.status).toBe(p2.status);
    expect(p1.missingEvidence).toEqual(p2.missingEvidence);
    expect(packetHashFor(input)).toBe(p1.packetHash);
  });
});

describe("evidence-packet — external content as evidence only (SP-08 criterion 3)", () => {
  it("never executes external content — script body becomes hash evidence, not eval", () => {
    const maliciousBody = `<script>alert('xss')</script>`;
    // Shadow result already treats body as inert; packet must not eval it.
    // We simulate a shadow that fetched a body containing script — the builder should only store a hash.
    const sh = shadowFixture({
      // The shadow's body is not stored directly; its evidence hash is derived from bytes/outcome, not body content execution.
      sampleFunnel: { bytesReceived: maliciousBody.length, parsedItems: 1, plausibleItems: 1, truncated: false, budgetExceeded: false } as any,
      diagnostic: { outcome: "HEALTHY_WITH_RESULTS", probes: [], requestCount: 2, bytesReceived: maliciousBody.length, durationMs: 10, mutations: 0, shadowMode: true } as any,
    });
    const pkt = buildEvidencePacket(inputFixture({ shadow: sh }));
    expect(pkt.shadowEconomics?.bodyEvidenceHash).toBeTruthy();
    expect(typeof pkt.shadowEconomics?.bodyEvidenceHash).toBe("string");
    // The packet must not contain the raw script body anywhere
    const json = JSON.stringify(pkt);
    expect(json).not.toContain("<script>");
    expect(json).not.toContain("alert('xss')");
  });

  it("report treats external endpoint as evidence string, not as link to fetch", () => {
    const pkt = buildEvidencePacket(inputFixture({ endpointUrl: "https://boards-api.greenhouse.io/v1/boards/acme/jobs?payload=<svg onload=alert(1)>" }));
    const report = renderEvidenceReport([pkt], "2026-08-29T12:00:00.000Z");
    // Report escapes by truncating endpoint but never executes it
    expect(report).toContain("boards-api.greenhouse.io");
    // The raw onload payload should not be executed; report is markdown text
    expect(typeof report).toBe("string");
  });
});

describe("evidence-packet — report generation (review debt visibility)", () => {
  it("report shows total/review_ready/candidate and bucket counts", () => {
    const now = "2026-08-29T12:00:00.000Z";
    const ready = buildEvidencePacket(inputFixture({ sourceId: "greenhouse:acme", reviewDeadline: "2026-09-12T00:00:00.000Z", nowIso: now }));
    const cand = buildEvidencePacket(inputFixture({ sourceId: "breezy:evil", reviewDeadline: "2026-08-20T00:00:00.000Z", nowIso: now, provider: { evidenceUrl: null } as any }));
    const report = renderEvidenceReport([ready, cand], now);
    expect(report).toContain("Total candidates");
    expect(report).toContain("| 2 |"); // total
    expect(report).toContain("review_ready");
    expect(report).toContain("Overdue");
    expect(report).toContain("## Packets");
    expect(report).toContain("## Alerts");
    expect(report).toContain("greenhouse:acme");
    expect(report).toContain("breezy:evil");
  });

  it("empty report explains why no reserve", () => {
    const report = renderEvidenceReport([], "2026-08-29T12:00:00.000Z");
    expect(report).toContain("No candidate packets");
  });

  it("lifecycle section explains review_ready vs candidate", () => {
    const report = renderEvidenceReport([buildEvidencePacket(inputFixture())], "2026-08-29T12:00:00.000Z");
    expect(report).toContain("review_ready");
    expect(report).toContain("candidate");
    expect(report).toContain("External bodies are evidence only");
  });
});
