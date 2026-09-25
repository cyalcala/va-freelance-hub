import { describe, expect, test } from "bun:test";
import {
  ANOMALY_HISTORY_WINDOW_DAYS,
  JEV_MIN_CONFIDENCE,
  KNOWN_LIMIT_MIN_HEALTHY_HISTORY,
  buildJevAdjudicationPacket,
  classifyAnomalies,
  classifyAnomaly,
  decideVerdict,
  type AnomalyHistory,
  type DispatchAnomaly,
  type JevAnswer,
} from "./shadow-verdict";

const OVERSIZE_STOP = "oversized payload 524312 bytes > budget 524288 — no alternate endpoint attempted";
const SOURCE = "recruitee:myjewellery";

function oversizeAnomaly(overrides: Partial<DispatchAnomaly> = {}): DispatchAnomaly {
  return {
    sourceId: SOURCE, providerId: "recruitee", outcome: "DEGRADED_ANOMALOUS",
    stopReason: OVERSIZE_STOP, bytesReceived: 524312, itemCount: 0, plausibleItems: 0,
    ...overrides,
  };
}

function healthyHistory(count: number): AnomalyHistory {
  return {
    sourceId: SOURCE,
    rows: Array.from({ length: count }, (_, i) => ({
      observedAt: `2026-09-2${i % 10}T12:00:00.000Z`,
      outcome: "HEALTHY_WITH_RESULTS" as const,
      plausibleItems: 88,
      stopReason: null,
    })),
  };
}

describe("classifyAnomaly — Tier 1 deterministic chronic known-limit", () => {
  test("production myjewellery case (24-byte overage, 13 healthy + 14 chronic oversize) is a known limit", () => {
    const history: AnomalyHistory = {
      sourceId: SOURCE,
      rows: [
        ...healthyHistory(13).rows,
        ...Array.from({ length: 14 }, (_, i) => ({
          observedAt: `2026-09-2${i % 10}T20:00:00.000Z`,
          outcome: "DEGRADED_ANOMALOUS" as const,
          plausibleItems: 0,
          stopReason: OVERSIZE_STOP,
        })),
      ],
    };
    const result = classifyAnomaly(oversizeAnomaly(), history);
    expect(result.classification).toBe("known_limit_over_budget");
    expect(result.evidence.overBudgetMargin).toBeCloseTo(24 / 524288, 10);
    expect(result.evidence.chronicIdenticalOversize).toBe(true);
  });

  test("a first-time oversize with healthy history is NOT a known limit (no vacuous chronicity)", () => {
    const result = classifyAnomaly(oversizeAnomaly(), healthyHistory(10));
    expect(result.classification).toBe("candidate_over_budget");
  });

  test("an oversize far above the margin is not a known limit", () => {
    const far = "oversized payload 1048576 bytes > budget 524288 — no alternate endpoint attempted";
    const history: AnomalyHistory = {
      sourceId: SOURCE,
      rows: [...healthyHistory(10).rows, { observedAt: "2026-09-20T20:00:00.000Z", outcome: "DEGRADED_ANOMALOUS", plausibleItems: 0, stopReason: far }],
    };
    const result = classifyAnomaly(oversizeAnomaly({ stopReason: far, bytesReceived: 1048576 }), history);
    expect(result.classification).toBe("candidate_over_budget");
  });

  test("drifting oversize sizes across history defeat chronicity", () => {
    const history: AnomalyHistory = {
      sourceId: SOURCE,
      rows: [
        ...healthyHistory(5).rows,
        { observedAt: "2026-09-20T20:00:00.000Z", outcome: "DEGRADED_ANOMALOUS", plausibleItems: 0, stopReason: "oversized payload 624288 bytes > budget 524288 — no alternate endpoint attempted" },
      ],
    };
    const result = classifyAnomaly(oversizeAnomaly(), history);
    expect(result.classification).toBe("candidate_over_budget");
  });

  test("policy or schema failures in history defeat chronicity", () => {
    const history: AnomalyHistory = {
      sourceId: SOURCE,
      rows: [
        ...healthyHistory(5).rows,
        { observedAt: "2026-09-20T20:00:00.000Z", outcome: "POLICY_BLOCKED", plausibleItems: 0, stopReason: "robots wouldBlock" },
        { observedAt: "2026-09-21T20:00:00.000Z", outcome: "DEGRADED_ANOMALOUS", plausibleItems: 0, stopReason: OVERSIZE_STOP },
      ],
    };
    const result = classifyAnomaly(oversizeAnomaly(), history);
    expect(result.classification).toBe("candidate_over_budget");
  });

  test("too little healthy parsed history is only a Tier-2 candidate", () => {
    const history: AnomalyHistory = {
      sourceId: SOURCE,
      rows: [
        { observedAt: "2026-09-20T12:00:00.000Z", outcome: "HEALTHY_WITH_RESULTS", plausibleItems: 88, stopReason: null },
        { observedAt: "2026-09-21T20:00:00.000Z", outcome: "DEGRADED_ANOMALOUS", plausibleItems: 0, stopReason: OVERSIZE_STOP },
      ],
    };
    const result = classifyAnomaly(oversizeAnomaly(), history);
    expect(result.classification).toBe("candidate_over_budget");
  });
});

describe("classifyAnomaly — other outcome classes", () => {
  test("rate limited is a transient Tier-2 candidate", () => {
    const result = classifyAnomaly(oversizeAnomaly({ sourceId: "workable:pineapple-staffing", providerId: "workable", outcome: "RATE_LIMITED", stopReason: null, bytesReceived: 0 }), healthyHistory(20));
    expect(result.classification).toBe("transient_rate_limit");
  });

  test("schema breakage, policy blocks, and unreachability are unresolved", () => {
    for (const outcome of ["SCHEMA_BROKEN", "POLICY_BLOCKED", "UNREACHABLE", "INTERNAL_PIPELINE_FAILURE", "UNKNOWN"] as const) {
      const result = classifyAnomaly(oversizeAnomaly({ outcome, stopReason: outcome === "SCHEMA_BROKEN" ? "parse failed" : null }), undefined);
      expect(result.classification).toBe("unresolved");
    }
  });

  test("missing history is treated as no history", () => {
    const result = classifyAnomaly(oversizeAnomaly(), undefined);
    expect(result.classification).toBe("candidate_over_budget");
    expect(result.evidence.healthyParsedLast14d).toBe(0);
  });
});

describe("decideVerdict — enforcement", () => {
  test("no anomalies is healthy without consultation", async () => {
    const result = await decideVerdict({ anomalies: [], classifications: [], jev: null, available: false });
    expect(result.status).toBe("healthy");
    expect(result.consultation.consulted).toBe(false);
  });

  test("unresolved anomalies fail fast without any Jev call", async () => {
    let called = 0;
    const classifications = classifyAnomalies(
      [oversizeAnomaly({ outcome: "SCHEMA_BROKEN", stopReason: "parse failed" })],
      new Map(),
    );
    const result = await decideVerdict({
      anomalies: [oversizeAnomaly({ outcome: "SCHEMA_BROKEN", stopReason: "parse failed" })],
      classifications,
      jev: () => { called += 1; return Promise.resolve({ ok: true, recommendation: "ACCEPT_NOTES", confidence: 1, model: "m", okFlag: true } as unknown as JevAnswer); },
      available: true,
    });
    expect(called).toBe(0);
    expect(result.status).toBe("failed");
    expect(result.reasons[0]).toContain("unresolved");
  });

  test("Tier-1-only anomalies pass deterministically without consulting Jev", async () => {
    const history: AnomalyHistory = {
      sourceId: SOURCE,
      rows: [
        ...healthyHistory(13).rows,
        ...Array.from({ length: 3 }, (_, i) => ({
          observedAt: `2026-09-2${i}T20:00:00.000Z`, outcome: "DEGRADED_ANOMALOUS" as const, plausibleItems: 0, stopReason: OVERSIZE_STOP,
        })),
      ],
    };
    const anomalies = [oversizeAnomaly()];
    const classifications = classifyAnomalies(anomalies, new Map([[SOURCE, history]]));
    let called = 0;
    const result = await decideVerdict({ anomalies, classifications, jev: () => { called += 1; throw new Error("must not be called"); }, available: true });
    expect(called).toBe(0);
    expect(result.status).toBe("healthy_with_notes");
    expect(result.acceptedNotes).toHaveLength(1);
  });

  test("Tier-2 anomalies with Jev unavailable fail conservatively", async () => {
    const anomalies = [oversizeAnomaly({ sourceId: "workable:x", providerId: "workable", outcome: "RATE_LIMITED", stopReason: null, bytesReceived: 0 })];
    const classifications = classifyAnomalies(anomalies, new Map());
    const result = await decideVerdict({ anomalies, classifications, jev: null, available: false });
    expect(result.status).toBe("failed");
    expect(result.consultation).toEqual({ consulted: false, reason: "unavailable" });
  });

  test("Tier-2 anomalies with the kill switch fail conservatively", async () => {
    const anomalies = [oversizeAnomaly({ sourceId: "workable:x", providerId: "workable", outcome: "RATE_LIMITED", stopReason: null, bytesReceived: 0 })];
    const classifications = classifyAnomalies(anomalies, new Map());
    const result = await decideVerdict({ anomalies, classifications, jev: null, available: true, disabled: true });
    expect(result.status).toBe("failed");
    expect(result.consultation).toEqual({ consulted: false, reason: "disabled" });
  });

  test("Jev ACCEPT_NOTES passes Tier-2 anomalies", async () => {
    const anomalies = [oversizeAnomaly({ sourceId: "workable:x", providerId: "workable", outcome: "RATE_LIMITED", stopReason: null, bytesReceived: 0 })];
    const classifications = classifyAnomalies(anomalies, new Map());
    const result = await decideVerdict({
      anomalies, classifications, available: true,
      jev: () => Promise.resolve({ ok: true, recommendation: "ACCEPT_NOTES", confidence: 0.9, model: "typesafe/jev-1.13" }),
    });
    expect(result.status).toBe("healthy_with_notes");
    expect(result.consultation.consulted).toBe(true);
    expect(result.consultation.consulted && result.consultation.recommendation).toBe("ACCEPT_NOTES");
  });

  test("Jev FAIL_CONSERVATIVE, ABSTAIN, malformed, and low-confidence answers all fail", async () => {
    const anomalies = [oversizeAnomaly({ sourceId: "workable:x", providerId: "workable", outcome: "RATE_LIMITED", stopReason: null, bytesReceived: 0 })];
    const classifications = classifyAnomalies(anomalies, new Map());
    for (const answer of [
      { ok: true, recommendation: "FAIL_CONSERVATIVE", confidence: 0.9, model: "m" },
      { ok: true, recommendation: "ABSTAIN", confidence: 0.9, model: "m" },
      { ok: false, recommendation: "ACCEPT_NOTES", confidence: 0.9, model: "m", error: "down" },
      { ok: true, recommendation: "ACCEPT_NOTES", confidence: JEV_MIN_CONFIDENCE - 0.01, model: "m" },
      { ok: true, recommendation: "INVENTED", confidence: 1, model: "m" },
    ] as JevAnswer[]) {
      const result = await decideVerdict({ anomalies, classifications, available: true, jev: () => Promise.resolve(answer) });
      expect(result.status).toBe("failed");
    }
  });

  test("a thrown judge invocation fails conservatively without propagating", async () => {
    const anomalies = [oversizeAnomaly({ sourceId: "workable:x", providerId: "workable", outcome: "RATE_LIMITED", stopReason: null, bytesReceived: 0 })];
    const classifications = classifyAnomalies(anomalies, new Map());
    const result = await decideVerdict({ anomalies, classifications, available: true, jev: () => { throw new Error("boom"); } });
    expect(result.status).toBe("failed");
    expect(result.consultation.consulted).toBe(true);
    expect(result.consultation.consulted && result.consultation.ok).toBe(false);
  });

  test("mixed Tier-1 + Jev-accepted Tier-2 produces one passing verdict with all notes", async () => {
    const history: AnomalyHistory = {
      sourceId: SOURCE,
      rows: [
        ...healthyHistory(10).rows,
        { observedAt: "2026-09-21T20:00:00.000Z", outcome: "DEGRADED_ANOMALOUS", plausibleItems: 0, stopReason: OVERSIZE_STOP },
      ],
    };
    const anomalies = [oversizeAnomaly(), oversizeAnomaly({ sourceId: "workable:x", providerId: "workable", outcome: "RATE_LIMITED", stopReason: null, bytesReceived: 0 })];
    const classifications = classifyAnomalies(anomalies, new Map([[SOURCE, history]]));
    const result = await decideVerdict({
      anomalies, classifications, available: true,
      jev: () => Promise.resolve({ ok: true, recommendation: "ACCEPT_NOTES", confidence: 0.85, model: "typesafe/jev-1.13" }),
    });
    expect(result.status).toBe("healthy_with_notes");
    expect(result.acceptedNotes).toHaveLength(2);
  });
});

describe("buildJevAdjudicationPacket", () => {
  test("packet contains telemetry, policy constraints, and no source content", () => {
    const history: AnomalyHistory = {
      sourceId: SOURCE,
      rows: [...healthyHistory(13).rows, { observedAt: "2026-09-22T20:00:00.000Z", outcome: "DEGRADED_ANOMALOUS", plausibleItems: 0, stopReason: OVERSIZE_STOP }],
    };
    const anomalies = [oversizeAnomaly()];
    const classifications = classifyAnomalies(anomalies, new Map([[SOURCE, history]]));
    const packet = buildJevAdjudicationPacket({ dispatched: 12, classifications });
    expect(packet.task).toContain("shadow");
    expect(packet.state).toContain(SOURCE);
    expect(packet.state).toContain("524312");
    expect(packet.context).toContain("non-public");
    expect(Object.keys(packet.criteria)).toEqual(["ACCEPT_NOTES", "FAIL_CONSERVATIVE", "ABSTAIN"]);
    expect(JSON.stringify(packet).length).toBeLessThan(4000);
  });

  test("packet reports the total dispatched count, not the anomaly count", () => {
    const anomalies = [oversizeAnomaly({ sourceId: "workable:x", providerId: "workable", outcome: "RATE_LIMITED", stopReason: null, bytesReceived: 0 })];
    const classifications = classifyAnomalies(anomalies, new Map());
    // Simulate 10 dispatched probes with only 1 anomaly — Jev must see "10", not "1"
    const packet = buildJevAdjudicationPacket({ dispatched: 10, classifications });
    expect(packet.state).toContain("Dispatched probes this run: 10.");
    expect(packet.state).toContain("Anomalous outcomes: 1.");
    // Ensure the text does NOT say "Dispatched probes this run: 1."
    expect(packet.state).not.toContain("Dispatched probes this run: 1.");
  });
});

describe("constants", () => {
  test("history window and thresholds are labeled provisional and bounded", () => {
    expect(ANOMALY_HISTORY_WINDOW_DAYS).toBe(14);
    expect(KNOWN_LIMIT_MIN_HEALTHY_HISTORY).toBe(3);
    expect(JEV_MIN_CONFIDENCE).toBeGreaterThanOrEqual(0.5);
  });
});
