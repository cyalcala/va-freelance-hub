/**
 * SSAE-04 Temporal Holdout Evaluation — Unit Tests
 * Tests the pure read-only evaluation logic with deterministic fixtures.
 */

import { describe, it, expect, beforeAll } from "bun:test";
import {
  HOLDOUT_SPLITS,
  controlSelector,
  computeMetrics,
  compareSelectors,
  createSyntheticRecord,
  type SourceMemoryRecord,
  type RankedSource,
  type HoldoutSplit,
  type SelectorMetrics,
  type ComparisonMetrics,
} from "./temporal-holdout-eval";

// ─── Test Fixtures ────────────────────────────────────────────────────────────

const TEST_EPOCH = "2026-09-08T12:00:00Z";

function createBaseRankedSource(overrides: Partial<RankedSource> = {}): RankedSource {
  const now = new Date().toISOString();
  return {
    source_id: "test-source",
    provider_id: "test-provider",
    declared_capability: "ats_json",
    endpoint_url: "https://example.com/api",
    score: 10,
    score_breakdown: {
      marginal_yield_estimate: 5,
      cost_estimate_cents: 20,
      feasibility_penalty: 0,
      freshness_bonus: 0,
      diversity_bonus: 0,
      cold_revisit_bonus: 0,
    },
    processing_mode: "FULL",
    mode_reason: "test",
    feasibility: { permitted: true, reason: "test", hardGate: "NONE" },
    excluded: false,
    exclusion_reason: null,
    cold_revisit_reason: null,
    cold_revisit_due_at: null,
    evidence_refs: [],
    evidence_complete: false,
    dependencies: null,
    ranked_at: now,
    selector_version: "test@v1",
    ...overrides,
  };
}

function createTestSources(): SourceMemoryRecord[] {
  return [
    createSyntheticRecord("we-work-remotely", "WeWorkRemotely", "rss_xml", 500, 0.15, 200),
    createSyntheticRecord("remotive", "Remotive", "rss_xml", 300, 0.12, 150),
    createSyntheticRecord("real-work-from-anywhere", "RealWorkFromAnywhere", "rss_xml", 200, 0.08, 80),
    createSyntheticRecord("remote-ok", "RemoteOK", "public_json_api", 1000, 0.05, 50),
    createSyntheticRecord("jobicy-apac-1", "Jobicy", "rss_xml", 100, 0.25, 30),
    createSyntheticRecord("jobicy-apac-2", "Jobicy", "rss_xml", 80, 0.22, 25),
    createSyntheticRecord("breezy:20four7va", "Breezy", "ats_json", 50, 0.60, 10),
    createSyntheticRecord("breezy:another-va", "Breezy", "ats_json", 40, 0.55, 8),
    createSyntheticRecord("greenhouse:gitlab", "Greenhouse", "ats_json", 200, 0.10, 40),
    createSyntheticRecord("lever:shopify", "Lever", "ats_json", 150, 0.08, 20),
  ];
}

const TEST_ACTUAL_YIELD = new Map<string, number>([
  ["we-work-remotely", 8],
  ["remotive", 5],
  ["real-work-from-anywhere", 2],
  ["remote-ok", 3],
  ["jobicy-apac-1", 4],
  ["jobicy-apac-2", 2],
  ["breezy:20four7va", 6],
  ["breezy:another-va", 3],
  ["greenhouse:gitlab", 4],
  ["lever:shopify", 2],
]);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SSAE-04 Temporal Holdout — Holdout Split Definitions", () => {
  it("defines primary_2026_09 split with correct windows", () => {
    const split = HOLDOUT_SPLITS.find(s => s.name === "primary_2026_09");
    expect(split).toBeDefined();
    expect(split!.trainCutoff).toBe("2026-09-01T00:00:00Z");
    expect(split!.valStart).toBe("2026-09-01T00:00:00Z");
    expect(split!.valEnd).toBe("2026-09-15T23:59:59Z");
    expect(split!.testStart).toBe("2026-09-16T00:00:00Z");
  });

  it("defines extended_2026_08_09 split with correct windows", () => {
    const split = HOLDOUT_SPLITS.find(s => s.name === "extended_2026_08_09");
    expect(split).toBeDefined();
    expect(split!.trainCutoff).toBe("2026-08-01T00:00:00Z");
    expect(split!.valStart).toBe("2026-08-01T00:00:00Z");
    expect(split!.valEnd).toBe("2026-08-31T23:59:59Z");
    expect(split!.testStart).toBe("2026-09-01T00:00:00Z");
  });

  it("all splits have required fields", () => {
    for (const split of HOLDOUT_SPLITS) {
      expect(split.name).toBeTruthy();
      expect(split.trainCutoff).toBeTruthy();
      expect(split.valStart).toBeTruthy();
      expect(split.valEnd).toBeTruthy();
      expect(split.testStart).toBeTruthy();
      expect(new Date(split.trainCutoff).getTime()).toBeLessThanOrEqual(new Date(split.valStart).getTime());
      expect(new Date(split.valEnd).getTime()).toBeLessThan(new Date(split.testStart).getTime());
    }
  });
});

describe("SSAE-04 Temporal Holdout — Control Selector (Deterministic Stride Sampler)", () => {
  const budget = { topK: 5, maxCostPerSourceCents: 500 };

  it("selects evenly spaced sources per provider family", () => {
    const sources = createTestSources();
    const selected = controlSelector(sources, TEST_EPOCH, budget);

    expect(selected.length).toBeLessThanOrEqual(budget.topK);
    expect(selected.length).toBeGreaterThan(0);

    // Should include sources from different families
    const families = new Set(selected.map(s => s.provider_id));
    expect(families.size).toBeGreaterThan(1);
  });

  it("respects topK budget", () => {
    const sources = createTestSources();
    const smallBudget = { topK: 2, maxCostPerSourceCents: 500 };
    const selected = controlSelector(sources, TEST_EPOCH, smallBudget);
    expect(selected.length).toBeLessThanOrEqual(2);
  });

  it("produces deterministic output for same input", () => {
    const sources = createTestSources();
    const out1 = controlSelector(sources, TEST_EPOCH, budget);
    const out2 = controlSelector(sources, TEST_EPOCH, budget);

    expect(out1.map(s => s.source_id)).toEqual(out2.map(s => s.source_id));
    expect(out1.map(s => s.score)).toEqual(out2.map(s => s.score));
  });

  it("ranks selected sources by simple yield estimate descending", () => {
    const sources = createTestSources();
    const selected = controlSelector(sources, TEST_EPOCH, budget);

    for (let i = 1; i < selected.length; i++) {
      expect(selected[i - 1].score).toBeGreaterThanOrEqual(selected[i].score);
    }
  });

  it("includes only feasible sources (permitted=true)", () => {
    const sources = createTestSources();
    const selected = controlSelector(sources, TEST_EPOCH, budget);

    for (const s of selected) {
      expect(s.feasibility.permitted).toBe(true);
      expect(s.feasibility.hardGate).toBe("NONE");
    }
  });

  it("handles single family correctly", () => {
    const singleFamilySources = [
      createSyntheticRecord("source-1", "SingleFam", "rss_xml", 100, 0.2, 20),
      createSyntheticRecord("source-2", "SingleFam", "rss_xml", 80, 0.15, 15),
      createSyntheticRecord("source-3", "SingleFam", "rss_xml", 60, 0.1, 10),
    ];
    const selected = controlSelector(singleFamilySources, TEST_EPOCH, budget);
    expect(selected.length).toBeGreaterThan(0);
    expect(selected.length).toBeLessThanOrEqual(budget.topK);
  });

  it("handles empty source list", () => {
    const selected = controlSelector([], TEST_EPOCH, budget);
    expect(selected).toEqual([]);
  });
});

describe("SSAE-04 Temporal Holdout — Metrics Computation", () => {
  const sources = createTestSources();

  it("computes metrics for control selector output", () => {
    const budget = { topK: 5, maxCostPerSourceCents: 500 };
    const controlSelected = controlSelector(sources, TEST_EPOCH, budget);
    const metrics = computeMetrics(controlSelected, TEST_ACTUAL_YIELD, sources.length, 0);

    expect(metrics.selectedCount).toBe(controlSelected.length);
    expect(metrics.totalPredictedYield).toBeGreaterThanOrEqual(0);
    expect(metrics.totalActualYield).toBeGreaterThanOrEqual(0);
    expect(metrics.calibrationError).toBeGreaterThanOrEqual(0);
    expect(metrics.costPerYieldCents).toBeGreaterThanOrEqual(0);
    expect(metrics.diversityScore).toBeGreaterThanOrEqual(0);
    expect(metrics.longTailCoverage).toBeGreaterThanOrEqual(0);
    expect(metrics.overlapRate).toBe(0); // placeholder
  });

  it("computes zero metrics for empty selection", () => {
    const metrics = computeMetrics([], TEST_ACTUAL_YIELD, sources.length, 0);
    expect(metrics.selectedCount).toBe(0);
    expect(metrics.totalPredictedYield).toBe(0);
    expect(metrics.totalActualYield).toBe(0);
    expect(metrics.calibrationError).toBe(0);
    expect(metrics.costPerYieldCents).toBe(Infinity);
    expect(metrics.diversityScore).toBe(0);
    expect(metrics.longTailCoverage).toBe(0);
  });

  it("calculates calibration error as RMSE", () => {
    const perfectMatch = [
      createBaseRankedSource({ source_id: "a", score_breakdown: { marginal_yield_estimate: 5, cost_estimate_cents: 10, feasibility_penalty: 0, freshness_bonus: 0, diversity_bonus: 0, cold_revisit_bonus: 0 } }),
      createBaseRankedSource({ source_id: "b", score_breakdown: { marginal_yield_estimate: 3, cost_estimate_cents: 10, feasibility_penalty: 0, freshness_bonus: 0, diversity_bonus: 0, cold_revisit_bonus: 0 } }),
    ];
    const actualYield = new Map([["a", 5], ["b", 3]]);
    const metrics = computeMetrics(perfectMatch, actualYield, 2, 0);
    expect(metrics.calibrationError).toBe(0);
  });

  it("calculates cost per yield correctly", () => {
    const selected = [
      createBaseRankedSource({ source_id: "a", score_breakdown: { marginal_yield_estimate: 10, cost_estimate_cents: 20, feasibility_penalty: 0, freshness_bonus: 0, diversity_bonus: 0, cold_revisit_bonus: 0 } }),
    ];
    const actualYield = new Map([["a", 5]]);
    const metrics = computeMetrics(selected, actualYield, 1, 20);
    expect(metrics.costPerYieldCents).toBe(4); // 20 cents / 5 yield
  });
});

describe("SSAE-04 Temporal Holdout — Selector Comparison", () => {
  it("computes delta yield correctly", () => {
    const control: SelectorMetrics = { selectedCount: 5, totalPredictedYield: 10, totalActualYield: 8, calibrationError: 0.5, costPerYieldCents: 25, diversityScore: 0.1, longTailCoverage: 0.2, overlapRate: 0 };
    const treatment: SelectorMetrics = { selectedCount: 5, totalPredictedYield: 12, totalActualYield: 11, calibrationError: 0.3, costPerYieldCents: 18, diversityScore: 0.25, longTailCoverage: 0.3, overlapRate: 0 };

    const comparison = compareSelectors(control, treatment);

    expect(comparison.deltaYield).toBe(3); // 11 - 8
    expect(comparison.deltaCostPerYield).toBe(-7); // 18 - 25
    expect(comparison.deltaCalibration).toBe(-0.2); // 0.3 - 0.5
    expect(comparison.deltaDiversity).toBeCloseTo(0.15, 10); // 0.25 - 0.1
    expect(comparison.deltaLongTail).toBeCloseTo(0.1, 10); // 0.3 - 0.2
    expect(comparison.statisticalSignificance).toBe("INSUFFICIENT_DATA");
  });

  it("handles negative delta yield", () => {
    const control: SelectorMetrics = { selectedCount: 5, totalPredictedYield: 10, totalActualYield: 12, calibrationError: 0.5, costPerYieldCents: 20, diversityScore: 0.1, longTailCoverage: 0.2, overlapRate: 0 };
    const treatment: SelectorMetrics = { selectedCount: 5, totalPredictedYield: 10, totalActualYield: 8, calibrationError: 0.5, costPerYieldCents: 20, diversityScore: 0.1, longTailCoverage: 0.2, overlapRate: 0 };

    const comparison = compareSelectors(control, treatment);
    expect(comparison.deltaYield).toBe(-4); // 8 - 12
  });
});

describe("SSAE-04 Temporal Holdout — Synthetic Fixtures", () => {
  it("createSyntheticRecord produces valid SourceMemoryRecord", () => {
    const record = createSyntheticRecord("test-source", "TestProvider", "ats_json", 100, 0.3, 25);

    expect(record.source_id).toBe("test-source");
    expect(record.provider_id).toBe("TestProvider");
    expect(record.declared_capability).toBe("ats_json");
    expect(record.lake_state.last_candidate_count).toBe(100);
    expect(record.health_rollup.recent_ph_rate).toBe(0.3);
    expect(record.lake_state.last_qualified_ready).toBe(25);
    expect(record.publication_state.compliance_state).toBe("allowed");
    expect(record.publication_state.operational_state).toBe("active");
    expect(record.version_deps.policy_version).toBe("constitution-v5.2");
  });

  it("synthetic records have valid replay_coverage", () => {
    const record = createSyntheticRecord("test", "Test", "ats_json", 10, 0.1, 5);
    expect(record.replay_coverage.can_replay_geo_gate).toBe(true);
    expect(record.replay_coverage.can_replay_fingerprint).toBe(true);
    expect(record.replay_coverage.can_replay_conditional).toBe(true);
    expect(record.replay_coverage.can_replay_publication).toBe(true);
    expect(record.replay_coverage.missing_fields).toContain("raw_payload_full");
  });

  it("synthetic records have valid material_digests", () => {
    const record = createSyntheticRecord("test", "Test", "ats_json", 10, 0.1, 5);
    expect(record.material_digests.fingerprint_hash).toBeTruthy();
    expect(record.material_digests.content_hash).toBeTruthy();
    expect(record.material_digests.policy_hash).toBe("constitution-v5.2");
  });
});

describe("SSAE-04 Temporal Holdout — Demo Mode Structure", () => {
  it("demo mode creates valid evaluation result structure", () => {
    // We can't easily test runDemoMode directly without mocking console,
    // but we can verify the synthetic fixtures produce valid structures
    const sources = createTestSources();
    expect(sources.length).toBe(10);

    const budget = { topK: 5, maxCostPerSourceCents: 500 };
    const controlSelected = controlSelector(sources, TEST_EPOCH, budget);
    expect(controlSelected.length).toBeLessThanOrEqual(5);
    expect(controlSelected.length).toBeGreaterThan(0);

    const metrics = computeMetrics(controlSelected, TEST_ACTUAL_YIELD, sources.length, 0);
    expect(metrics.selectedCount).toBe(controlSelected.length);
  });
});

describe("SSAE-04 Temporal Holdout — Leakage Prevention", () => {
  it("control selector uses only selection-time features", () => {
    const sources = createTestSources();
    const budget = { topK: 5, maxCostPerSourceCents: 500 };
    const selected = controlSelector(sources, TEST_EPOCH, budget);

    for (const s of selected) {
      // Should not use future information
      expect(s.ranked_at).toBeTruthy();
      expect(s.selector_version).toBe("control-stride@v1");
      // Score based only on last_qualified_ready and recent_ph_rate (selection-time)
      expect(s.score_breakdown.marginal_yield_estimate).toBeGreaterThanOrEqual(0);
      expect(s.score_breakdown.freshness_bonus).toBe(0); // control has no freshness bonus
      expect(s.score_breakdown.diversity_bonus).toBe(0); // control has no diversity bonus
    }
  });

  it("holdout splits prevent future leakage by design", () => {
    for (const split of HOLDOUT_SPLITS) {
      const trainCutoff = new Date(split.trainCutoff).getTime();
      const valStart = new Date(split.valStart).getTime();
      const valEnd = new Date(split.valEnd).getTime();
      const testStart = new Date(split.testStart).getTime();

      // Train cutoff <= val start
      expect(trainCutoff).toBeLessThanOrEqual(valStart);
      // Val window is valid
      expect(valStart).toBeLessThanOrEqual(valEnd);
      // Test starts after validation
      expect(valEnd).toBeLessThan(testStart);
    }
  });
});

describe("SSAE-04 Temporal Holdout — Disposition LIMITED Handling", () => {
  it("metrics handle insufficient label coverage gracefully", () => {
    // Empty actual yield map simulates insufficient labels
    const emptyYield = new Map<string, number>();
    const sources = createTestSources();
    const budget = { topK: 5, maxCostPerSourceCents: 500 };
    const selected = controlSelector(sources, TEST_EPOCH, budget);

    const metrics = computeMetrics(selected, emptyYield, sources.length, 0);

    expect(metrics.totalActualYield).toBe(0);
    expect(metrics.costPerYieldCents).toBe(Infinity);
    expect(metrics.calibrationError).toBeGreaterThanOrEqual(0);
  });

  it("comparison handles zero actual yield", () => {
    const control: SelectorMetrics = { selectedCount: 3, totalPredictedYield: 5, totalActualYield: 0, calibrationError: 1.0, costPerYieldCents: Infinity, diversityScore: 0.1, longTailCoverage: 0.0, overlapRate: 0 };
    const treatment: SelectorMetrics = { selectedCount: 3, totalPredictedYield: 6, totalActualYield: 0, calibrationError: 1.2, costPerYieldCents: Infinity, diversityScore: 0.2, longTailCoverage: 0.1, overlapRate: 0 };

    const comparison = compareSelectors(control, treatment);
    expect(comparison.deltaYield).toBe(0);
    expect(comparison.deltaCostPerYield).toBe(NaN); // Infinity - Infinity
    expect(comparison.statisticalSignificance).toBe("INSUFFICIENT_DATA");
  });
});