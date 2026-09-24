import { expect, test } from "bun:test";
import { assessShadowResponse } from "./shadow-response";

const healthy = { totalRegistryRows: 3, eligible: 3, dispatched: 3, skippedIneligible: 0,
  skippedInvalidProvider: 0, skippedInvalidEvidence: 0, skippedRunCap: 0,
  probeFailures: 0, rejectedProbeResults: 0, evidenceErrors: [], invalidProviderErrors: [],
  outcomes: { HEALTHY_WITH_RESULTS: 3 } };
test("accepts healthy runs and cadence skips", () => {
  expect(assessShadowResponse(JSON.stringify(healthy))).toContain("dispatched=3");
  expect(assessShadowResponse(JSON.stringify({ ...healthy, totalRegistryRows: 5, skippedRunCap: 2 }))).toContain("dispatched=3");
  expect(assessShadowResponse(JSON.stringify({ ...healthy, eligible: 0, dispatched: 0, skippedIneligible: 3, outcomes: {} }))).toContain("dispatched=0");
});
test("fails HTTP-200 malformed, unhealthy, and inconsistent summaries", () => {
  for (const body of [null, {}, { totalRegistryRows: 3 }, { ...healthy, probeFailures: 1 },
    { ...healthy, evidenceErrors: [{}] }, { ...healthy, outcomes: { SCHEMA_BROKEN: 3 } },
    { ...healthy, dispatched: 2 }, { ...healthy, eligible: 4 }]) {
    expect(() => assessShadowResponse(JSON.stringify(body))).toThrow();
  }
});

// ─── verdict-aware path (2026-09-24 adjudication) ────────────────────────────

const degraded = { ...healthy, totalRegistryRows: 12, eligible: 12, dispatched: 12,
  outcomes: { HEALTHY_WITH_RESULTS: 11, DEGRADED_ANOMALOUS: 1 },
  anomalies: [{ sourceId: "recruitee:myjewellery", providerId: "recruitee", outcome: "DEGRADED_ANOMALOUS",
    stopReason: "oversized payload 524312 bytes > budget 524288 — no alternate endpoint attempted",
    bytesReceived: 524312, itemCount: 0, plausibleItems: 0 }] };

const acceptedVerdict = {
  version: "1.0.0", status: "healthy_with_notes",
  reasons: ["1 anomaly(ies) deterministically adjudicated as chronic known-limit boundary conditions"],
  classifications: [{ sourceId: "recruitee:myjewellery", outcome: "DEGRADED_ANOMALOUS", classification: "known_limit_over_budget" }],
  notes: [{ sourceId: "recruitee:myjewellery", outcome: "DEGRADED_ANOMALOUS", classification: "known_limit_over_budget" }],
  consultationReason: "not_needed",
};

test("accepts a fully adjudicated degraded outcome as healthy_with_notes", () => {
  const message = assessShadowResponse(JSON.stringify({ ...degraded, verdict: acceptedVerdict }));
  expect(message).toContain("verdict=healthy_with_notes");
  expect(message).toContain("notes=1");
});

test("fails a failed verdict with its reasons", () => {
  const failed = { ...acceptedVerdict, status: "failed", notes: [], reasons: ["unresolved anomaly outcome on: x"] };
  expect(() => assessShadowResponse(JSON.stringify({ ...degraded, verdict: failed }))).toThrow(/unresolved anomaly outcome/);
});

test("strict contract is unchanged when no verdict is attached", () => {
  expect(() => assessShadowResponse(JSON.stringify(degraded))).toThrow(/unhealthy or unknown outcomes/);
});

test("malformed verdicts fail", () => {
  for (const verdict of [null, "healthy", { status: "bogus" }, { ...acceptedVerdict, notes: "x" },
    { ...acceptedVerdict, status: "healthy" },
    { ...acceptedVerdict, notes: [{ sourceId: "recruitee:myjewellery", classification: "unresolved" }] },
    { ...acceptedVerdict, classifications: "x" }, { ...acceptedVerdict, reasons: [] }]) {
    expect(() => assessShadowResponse(JSON.stringify({ ...degraded, verdict }))).toThrow();
  }
});

test("notes must exactly cover the anomalous outcomes", () => {
  const underCovered = { ...acceptedVerdict, notes: [] };
  expect(() => assessShadowResponse(JSON.stringify({ ...degraded, verdict: underCovered }))).toThrow();
  const twoAnomalies = { ...degraded, outcomes: { HEALTHY_WITH_RESULTS: 10, DEGRADED_ANOMALOUS: 1, RATE_LIMITED: 1 },
    anomalies: [...degraded.anomalies, { sourceId: "workable:pineapple-staffing", providerId: "workable", outcome: "RATE_LIMITED",
      stopReason: null, bytesReceived: 0, itemCount: 0, plausibleItems: 0 }] };
  expect(() => assessShadowResponse(JSON.stringify({ ...twoAnomalies, verdict: acceptedVerdict }))).toThrow();
  const covered = { ...acceptedVerdict,
    classifications: [...acceptedVerdict.classifications, { sourceId: "workable:pineapple-staffing", outcome: "RATE_LIMITED", classification: "transient_rate_limit" }],
    notes: [...acceptedVerdict.notes, { sourceId: "workable:pineapple-staffing", outcome: "RATE_LIMITED", classification: "transient_rate_limit" }],
    reasons: ["2 anomaly(ies) adjudicated"] };
  expect(assessShadowResponse(JSON.stringify({ ...twoAnomalies, verdict: covered }))).toContain("notes=2");
});

test("healthy_with_notes without anomalies is inconsistent", () => {
  expect(() => assessShadowResponse(JSON.stringify({ ...healthy, verdict: acceptedVerdict }))).toThrow();
});

test("decision records are validated when present", () => {
  const withDecision = { ...acceptedVerdict, decision: { provider: "jev-1.13-openrouter", model: "typesafe/jev-1.13",
    recommendation: "ACCEPT_NOTES", confidence: 0.93, enforced: "healthy_with_notes", ok: true } };
  expect(assessShadowResponse(JSON.stringify({ ...degraded, verdict: withDecision }))).toContain("notes=1");
  const badRecommendation = { ...acceptedVerdict, decision: { model: "x", recommendation: "INVENT", confidence: 1, enforced: "healthy_with_notes", ok: true } };
  expect(() => assessShadowResponse(JSON.stringify({ ...degraded, verdict: badRecommendation }))).toThrow();
  const badEnforced = { ...acceptedVerdict, decision: { model: "x", recommendation: "ACCEPT_NOTES", confidence: 1, enforced: "failed", ok: true } };
  expect(() => assessShadowResponse(JSON.stringify({ ...degraded, verdict: badEnforced }))).toThrow();
});
