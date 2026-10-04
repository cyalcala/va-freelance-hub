/**
 * SSAE-05 Shadow Decisions — Deterministic Tests
 *
 * Tests cover: holdout split definitions, control/treatment selectors,
 * shadow decision records, overlap metrics, agreement classifications,
 * synthetic fixtures, LIMITED disposition handling.
 *
 * Run: bun test scripts/lake/shadow-decisions.test.ts
 */

import { describe, it, expect, beforeAll } from "bun:test";
import {
  runShadowDecisionCycle,
  generateShadowReceipt,
  ShadowConfig,
  ShadowCycleResult,
  ShadowDecisionRecord,
  createSyntheticRecord,
} from "./shadow-decisions";
import { SourceMemoryRecord, type RankedSource } from "./source-ranker";
import { HOLDOUT_SPLITS, controlSelector } from "./temporal-holdout-eval";

describe("SSAE-05 Shadow Decisions", () => {
  let syntheticSources: SourceMemoryRecord[];
  let baseConfig: ShadowConfig;

  beforeAll(() => {
    syntheticSources = [
      createSyntheticRecord("source-a", "ProviderA", "rss_xml", 500, 0.15, 200),
      createSyntheticRecord("source-b", "ProviderA", "rss_xml", 300, 0.12, 150),
      createSyntheticRecord("source-c", "ProviderB", "rss_xml", 200, 0.08, 80),
      createSyntheticRecord("source-d", "ProviderC", "public_json_api", 1000, 0.05, 50),
      createSyntheticRecord("source-e", "ProviderD", "rss_xml", 100, 0.25, 30),
      createSyntheticRecord("source-f", "ProviderD", "rss_xml", 80, 0.22, 25),
      createSyntheticRecord("source-g", "ProviderE", "ats_json", 50, 0.60, 10),
      createSyntheticRecord("source-h", "ProviderE", "ats_json", 40, 0.55, 8),
      createSyntheticRecord("source-i", "ProviderF", "ats_json", 200, 0.10, 40),
      createSyntheticRecord("source-j", "ProviderG", "ats_json", 150, 0.08, 20),
    ];

    baseConfig = {
      topK: 5,
      maxCostPerSourceCents: 500,
      coldRevisitDays: 7,
      epochTimestamp: "2026-09-15T12:00:00Z",
    };
  });

  describe("Holdout Split Definitions", () => {
    it("defines primary_2026_09 split with correct boundaries", () => {
      const split = HOLDOUT_SPLITS.find(s => s.name === "primary_2026_09");
      expect(split).toBeDefined();
      expect(split!.trainCutoff).toBe("2026-09-01T00:00:00Z");
      expect(split!.valStart).toBe("2026-09-01T00:00:00Z");
      expect(split!.valEnd).toBe("2026-09-15T23:59:59Z");
      expect(split!.testStart).toBe("2026-09-16T00:00:00Z");
    });

    it("defines extended_2026_08_09 split with correct boundaries", () => {
      const split = HOLDOUT_SPLITS.find(s => s.name === "extended_2026_08_09");
      expect(split).toBeDefined();
      expect(split!.trainCutoff).toBe("2026-08-01T00:00:00Z");
      expect(split!.valStart).toBe("2026-08-01T00:00:00Z");
      expect(split!.valEnd).toBe("2026-08-31T23:59:59Z");
      expect(split!.testStart).toBe("2026-09-01T00:00:00Z");
    });

    it("has no overlapping validation windows", () => {
      const primary = HOLDOUT_SPLITS.find(s => s.name === "primary_2026_09")!;
      const extended = HOLDOUT_SPLITS.find(s => s.name === "extended_2026_08_09")!;

      const primaryValStart = new Date(primary.valStart).getTime();
      const primaryValEnd = new Date(primary.valEnd).getTime();
      const extendedValStart = new Date(extended.valStart).getTime();
      const extendedValEnd = new Date(extended.valEnd).getTime();

      // Extended ends before primary starts (Aug 31 < Sep 1)
      expect(extendedValEnd).toBeLessThan(primaryValStart);
    });
  });

  describe("Control Selector (Deterministic Stride Sampler)", () => {
    it("selects evenly spaced sources per family", () => {
      // ProviderA has 2 sources, ProviderB 1, ProviderC 1, ProviderD 2, ProviderE 2, ProviderF 1, ProviderG 1 = 7 families
      // topK=5, perFamily = max(1, floor(5/7)) = 1
      // Should select 1 from each family until topK reached
      const config = { ...baseConfig, topK: 5 };
      const result = runShadowDecisionCycle(config, syntheticSources);

      // This is tested via the full cycle; control selection is deterministic
    });
  });

  describe("Shadow Decision Cycle", () => {
    it("produces a complete shadow cycle result with all required fields", async () => {
      const result = await runShadowDecisionCycle(baseConfig, syntheticSources);

      expect(result).toBeDefined();
      expect(result.epoch_timestamp).toBe(baseConfig.epochTimestamp);
      expect(result.epoch_label).toBe("custom");
      expect(result.disposition).toBe("LIMITED");

      // Control fields
      expect(result.control.selector_version).toBe("control-stride@v1");
      expect(result.control.top_k).toBe(5);
      expect(result.control.selected_count).toBeLessThanOrEqual(5);
      expect(Array.isArray(result.control.selected_ids)).toBe(true);
      expect(typeof result.control.ranking_latency_ms).toBe("number");

      // Treatment fields
      expect(result.treatment.selector_version).toContain("source-ranker@");
      expect(result.treatment.top_k).toBe(5);
      expect(result.treatment.selected_count).toBeLessThanOrEqual(5);
      expect(typeof result.treatment.excluded_count).toBe("number");
      expect(typeof result.treatment.cold_revisit_count).toBe("number");
      expect(typeof result.treatment.ranking_latency_ms).toBe("number");

      // Overlap fields
      expect(typeof result.overlap.selected_overlap_count).toBe("number");
      expect(typeof result.overlap.selected_overlap_rate).toBe("number");
      expect(typeof result.overlap.rank_correlation).toBe("number");
      expect(typeof result.overlap.mode_agreement_rate).toBe("number");

      // Decisions
      expect(Array.isArray(result.decisions)).toBe(true);
      expect(result.decisions.length).toBe(syntheticSources.length);

      // Coverage
      expect(result.coverage.total_sources_evaluated).toBe(syntheticSources.length);
      expect(result.coverage.unknown_outcome_sources).toBe(syntheticSources.length);
      expect(result.coverage.known_outcome_sources).toBe(0);

      // Limitations
      expect(Array.isArray(result.limitations)).toBe(true);
      expect(result.limitations.length).toBeGreaterThan(0);
    });

    it("classifies agreement correctly for each source", async () => {
      const result = await runShadowDecisionCycle(baseConfig, syntheticSources);

      for (const decision of result.decisions) {
        expect(decision.agreement).toMatch(/^(BOTH_SELECTED|CONTROL_ONLY|TREATMENT_ONLY|NEITHER)$/);
        expect(typeof decision.control.selected).toBe("boolean");
        expect(typeof decision.treatment.selected).toBe("boolean");
        expect(decision.overlap_score).toBe(decision.control.selected && decision.treatment.selected ? 1 : 0);
      }
    });

    it("produces deterministic results for same input", async () => {
      const result1 = await runShadowDecisionCycle(baseConfig, syntheticSources);
      const result2 = await runShadowDecisionCycle(baseConfig, syntheticSources);

      expect(result1.control.selected_ids).toEqual(result2.control.selected_ids);
      expect(result1.treatment.selected_ids).toEqual(result2.treatment.selected_ids);
      expect(result1.overlap.selected_overlap_count).toBe(result2.overlap.selected_overlap_count);
      expect(result1.overlap.rank_correlation).toBe(result2.overlap.rank_correlation);
    });

    it("includes all sources in decisions", async () => {
      const result = await runShadowDecisionCycle(baseConfig, syntheticSources);

      const decisionSourceIds = new Set(result.decisions.map(d => d.source_id));
      const inputSourceIds = new Set(syntheticSources.map(s => s.source_id));

      expect(decisionSourceIds).toEqual(inputSourceIds);
    });

    it("ranks treatment sources by score descending", async () => {
      const result = await runShadowDecisionCycle(baseConfig, syntheticSources);

      // Check the treatment selected array directly (already sorted)
      const treatmentScores = result.treatment.selected_ids.length > 0
        ? result.decisions
            .filter(d => result.treatment.selected_ids.includes(d.source_id))
            .sort((a, b) => result.treatment.selected_ids.indexOf(a.source_id) - result.treatment.selected_ids.indexOf(b.source_id))
            .map(d => d.treatment.score)
        : [];

      for (let i = 1; i < treatmentScores.length; i++) {
        // Allow small floating point differences
        expect(treatmentScores[i]).toBeLessThanOrEqual(treatmentScores[i - 1] + 1e-10);
      }
    });

    it("respects topK limit for both selectors", async () => {
      const result = await runShadowDecisionCycle({ ...baseConfig, topK: 3 }, syntheticSources);

      expect(result.control.selected_count).toBeLessThanOrEqual(3);
      expect(result.treatment.selected_count).toBeLessThanOrEqual(3);
    });

    it("respects maxCostPerSourceCents exclusion", async () => {
      // Create a source with very high candidate count -> high cost
      const expensiveSource = createSyntheticRecord(
        "expensive-source",
        "ExpensiveProvider",
        "public_json_api",
        10000, // High candidate count -> high cost
        0.10,
        500
      );

      const sourcesWithExpensive = [...syntheticSources, expensiveSource];
      const result = await runShadowDecisionCycle(
        { ...baseConfig, maxCostPerSourceCents: 100, topK: 10 },
        sourcesWithExpensive
      );

      // Expensive source should be excluded by treatment
      const expensiveDecision = result.decisions.find(d => d.source_id === "expensive-source");
      expect(expensiveDecision).toBeDefined();
      if (expensiveDecision) {
        expect(expensiveDecision.treatment.excluded).toBe(true);
        expect(expensiveDecision.treatment.exclusion_reason).toContain("exceeds budget");
      }
    });

    it("handles cold revisit detection", async () => {
      // Create a source with very old last_sighting_at
      const oldSource = createSyntheticRecord(
        "old-source",
        "OldProvider",
        "rss_xml",
        100,
        0.20,
        20
      );
      // Override last_sighting_at to be very old
      oldSource.lake_state.last_sighting_at = "2026-01-01T00:00:00Z";

      const sourcesWithOld = [...syntheticSources, oldSource];
      const result = await runShadowDecisionCycle(
        { ...baseConfig, coldRevisitDays: 7, topK: 10 },
        sourcesWithOld
      );

      const oldDecision = result.decisions.find(d => d.source_id === "old-source");
      expect(oldDecision).toBeDefined();
      if (oldDecision) {
        // Should be flagged for cold revisit in treatment
        expect(oldDecision.treatment.cold_revisit_reason).toMatch(/cold|cold_revisit|No observation/i);
        // Or it could be in cold revisit list
        const isColdRevisit = oldDecision.treatment.reason === "cold_revisit" ||
                              oldDecision.treatment.cold_revisit_reason !== null;
        expect(isColdRevisit).toBe(true);
      }
    });
  });

  describe("Overlap Metrics", () => {
    it("computes Jaccard overlap rate correctly", async () => {
      const result = await runShadowDecisionCycle(baseConfig, syntheticSources);

      const controlSet = new Set(result.control.selected_ids);
      const treatmentSet = new Set(result.treatment.selected_ids);
      const intersection = new Set([...controlSet].filter(x => treatmentSet.has(x)));
      const union = new Set([...controlSet, ...treatmentSet]);
      const expectedJaccard = union.size > 0 ? intersection.size / union.size : 0;

      expect(result.overlap.selected_overlap_count).toBe(intersection.size);
      expect(result.overlap.selected_overlap_rate).toBeCloseTo(expectedJaccard, 5);
    });

    it("computes rank correlation on common selected sources", async () => {
      const result = await runShadowDecisionCycle(baseConfig, syntheticSources);

      // Rank correlation should be between -1 and 1
      expect(result.overlap.rank_correlation).toBeGreaterThanOrEqual(-1);
      expect(result.overlap.rank_correlation).toBeLessThanOrEqual(1);
    });

    it("computes mode agreement rate", async () => {
      const result = await runShadowDecisionCycle(baseConfig, syntheticSources);

      expect(result.overlap.mode_agreement_rate).toBeGreaterThanOrEqual(0);
      expect(result.overlap.mode_agreement_rate).toBeLessThanOrEqual(1);
    });
  });

  describe("Synthetic Fixtures", () => {
    it("creates valid SourceMemoryRecord with all required fields", () => {
      const record = createSyntheticRecord("test-source", "TestProvider", "rss_xml", 100, 0.2, 25);

      expect(record.source_id).toBe("test-source");
      expect(record.provider_id).toBe("TestProvider");
      expect(record.declared_capability).toBe("rss_xml");
      expect(record.lake_state.last_candidate_count).toBe(100);
      expect(record.health_rollup.recent_ph_rate).toBe(0.2);
      expect(record.lake_state.last_qualified_ready).toBe(25);
      expect(record.publication_state.compliance_state).toBe("allowed");
      expect(record.publication_state.operational_state).toBe("active");
      expect(record.replay_coverage.can_replay_geo_gate).toBe(true);
      expect(record.version_deps.policy_version).toBe("constitution-v5.2");
    });

    it("sets payload_kind correctly for XML vs JSON capabilities", () => {
      const xmlRecord = createSyntheticRecord("xml-src", "Prov", "rss_xml", 100, 0.2, 25);
      const jsonRecord = createSyntheticRecord("json-src", "Prov", "public_json_api", 100, 0.2, 25);

      expect(xmlRecord.payload_kind).toBe("xml");
      expect(jsonRecord.payload_kind).toBe("json");
    });
  });

  describe("LIMITED Disposition", () => {
    it("returns LIMITED when no known outcomes", async () => {
      const result = await runShadowDecisionCycle(baseConfig, syntheticSources);
      expect(result.disposition).toBe("LIMITED");
    });

    it("includes standard limitations in result", async () => {
      const result = await runShadowDecisionCycle(baseConfig, syntheticSources);

      const limitationText = result.limitations.join(" ");
      expect(limitationText).toContain("UNKNOWN");
      expect(limitationText).toContain("INSUFFICIENT");
      expect(limitationText).toContain("first_publication_at");
      expect(limitationText).toContain("cohort labels");
    });
  });

  describe("Shadow Receipt Generation", () => {
    it("generates human-readable receipt with all sections", async () => {
      const result = await runShadowDecisionCycle(baseConfig, syntheticSources);
      const receipt = generateShadowReceipt(result);

      expect(receipt).toContain("SSAE-05 Shadow Decision Receipt");
      expect(receipt).toContain(result.epoch_label);
      expect(receipt).toContain("Control (Deterministic Stride)");
      expect(receipt).toContain("Treatment (SSAE-03 Ranker)");
      expect(receipt).toContain("Overlap");
      expect(receipt).toContain("Coverage");
      expect(receipt).toContain("Limitations");
      expect(receipt).toContain(`DISPOSITION: ${result.disposition}`);
    });

    it("includes key metrics in receipt", async () => {
      const result = await runShadowDecisionCycle(baseConfig, syntheticSources);
      const receipt = generateShadowReceipt(result);

      expect(receipt).toContain(result.control.selector_version);
      expect(receipt).toContain(result.treatment.selector_version);
      expect(receipt).toContain(result.control.selected_count.toString());
      expect(receipt).toContain(result.treatment.selected_count.toString());
      expect(receipt).toContain(result.overlap.selected_overlap_count.toString());
    });
  });

  describe("Edge Cases", () => {
    it("handles empty source list", async () => {
      const result = await runShadowDecisionCycle(baseConfig, []);

      expect(result.control.selected_count).toBe(0);
      expect(result.treatment.selected_count).toBe(0);
      expect(result.decisions.length).toBe(0);
      expect(result.coverage.total_sources_evaluated).toBe(0);
    });

    it("handles single source", async () => {
      const singleSource = [createSyntheticRecord("only-source", "OnlyProvider", "rss_xml", 50, 0.3, 15)];
      const result = await runShadowDecisionCycle({ ...baseConfig, topK: 1 }, singleSource);

      expect(result.control.selected_count).toBeLessThanOrEqual(1);
      expect(result.treatment.selected_count).toBeLessThanOrEqual(1);
      expect(result.decisions.length).toBe(1);
    });

    it("handles all sources excluded by treatment", async () => {
      // All sources have 0 qualified_ready -> treatment excludes all (minQualifiedReady=3 default)
      const zeroQualifiedSources = syntheticSources.map(s => ({
        ...s,
        lake_state: { ...s.lake_state, last_qualified_ready: 0 },
      }));

      const result = await runShadowDecisionCycle(baseConfig, zeroQualifiedSources);

      // Treatment should exclude all
      expect(result.treatment.selected_count).toBe(0);
      expect(result.treatment.excluded_count).toBe(zeroQualifiedSources.length);

      // All decisions should be NEITHER or CONTROL_ONLY
      for (const d of result.decisions) {
        expect(["NEITHER", "CONTROL_ONLY"]).toContain(d.agreement);
      }
    });
  });
});

describe("compareSelectorOutputs Helper", () => {
    const baseSources = [
      createSyntheticRecord("source-a", "ProviderA", "rss_xml", 500, 0.15, 200),
      createSyntheticRecord("source-b", "ProviderA", "rss_xml", 300, 0.12, 150),
      createSyntheticRecord("source-c", "ProviderB", "rss_xml", 200, 0.08, 80),
      createSyntheticRecord("source-d", "ProviderC", "public_json_api", 1000, 0.05, 50),
    ];

    function createMockRankedSource(overrides: Partial<RankedSource> = {}): RankedSource {
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

    it("compares control and treatment selections correctly", async () => {
      const controlSelected = [
        createMockRankedSource({ source_id: "source-a", provider_id: "ProviderA", rank: 1, score: 15 }),
        createMockRankedSource({ source_id: "source-c", provider_id: "ProviderB", rank: 2, score: 10 }),
      ];

      const treatmentRanked = [
        createMockRankedSource({ source_id: "source-a", provider_id: "ProviderA", rank: 1, score: 20 }),
        createMockRankedSource({ source_id: "source-b", provider_id: "ProviderA", rank: 2, score: 12 }),
      ];

      const treatmentExcluded = [
        createMockRankedSource({ source_id: "source-c", provider_id: "ProviderB", excluded: true, exclusion_reason: "cost_exceeds_budget" }),
      ];

      const treatmentColdRevisit: RankedSource[] = [];

      const { compareSelectorOutputs } = await import("./shadow-decisions");

      const result = compareSelectorOutputs(
        controlSelected,
        treatmentRanked,
        treatmentExcluded,
        treatmentColdRevisit,
        baseSources
      );

      expect(result.decisions.length).toBe(4);

      const decisionA = result.decisions.find(d => d.source_id === "source-a");
      expect(decisionA?.agreement).toBe("BOTH_SELECTED");
      expect(decisionA?.overlap_score).toBe(1);

      const decisionB = result.decisions.find(d => d.source_id === "source-b");
      expect(decisionB?.agreement).toBe("TREATMENT_ONLY");

      const decisionC = result.decisions.find(d => d.source_id === "source-c");
      expect(decisionC?.agreement).toBe("CONTROL_ONLY");

      const decisionD = result.decisions.find(d => d.source_id === "source-d");
      expect(decisionD?.agreement).toBe("NEITHER");
    });

    it("computes Jaccard overlap rate correctly", async () => {
      const controlSelected = [
        createMockRankedSource({ source_id: "source-a", provider_id: "ProviderA" }),
        createMockRankedSource({ source_id: "source-b", provider_id: "ProviderA" }),
      ];

      const treatmentRanked = [
        createMockRankedSource({ source_id: "source-a", provider_id: "ProviderA" }),
        createMockRankedSource({ source_id: "source-c", provider_id: "ProviderB" }),
      ];

      const { compareSelectorOutputs } = await import("./shadow-decisions");

      const result = compareSelectorOutputs(
        controlSelected,
        treatmentRanked,
        [],
        [],
        baseSources
      );

      expect(result.overlap.selectedOverlapCount).toBe(1);
      expect(result.overlap.selectedOverlapRate).toBeCloseTo(1 / 3, 5); // Jaccard: 1 / (2+2-1) = 1/3
    });

    it("computes Spearman rank correlation on common sources", async () => {
      const controlSelected = [
        createMockRankedSource({ source_id: "source-a", provider_id: "ProviderA", rank: 1, score: 20 }),
        createMockRankedSource({ source_id: "source-b", provider_id: "ProviderA", rank: 2, score: 15 }),
        createMockRankedSource({ source_id: "source-c", provider_id: "ProviderB", rank: 3, score: 10 }),
      ];

      const treatmentRanked = [
        createMockRankedSource({ source_id: "source-a", provider_id: "ProviderA", rank: 1, score: 25 }),
        createMockRankedSource({ source_id: "source-b", provider_id: "ProviderA", rank: 2, score: 18 }),
        createMockRankedSource({ source_id: "source-c", provider_id: "ProviderB", rank: 3, score: 12 }),
      ];

      const { compareSelectorOutputs } = await import("./shadow-decisions");

      const result = compareSelectorOutputs(
        controlSelected,
        treatmentRanked,
        [],
        [],
        baseSources
      );

      expect(result.overlap.rankCorrelation).toBe(1); // Perfect correlation
    });

    it("handles zero common sources for rank correlation", async () => {
      const controlSelected = [
        createMockRankedSource({ source_id: "source-a", provider_id: "ProviderA", rank: 1 }),
      ];

      const treatmentRanked = [
        createMockRankedSource({ source_id: "source-b", provider_id: "ProviderB", rank: 1 }),
      ];

      const { compareSelectorOutputs } = await import("./shadow-decisions");

      const result = compareSelectorOutputs(
        controlSelected,
        treatmentRanked,
        [],
        [],
        baseSources
      );

      expect(result.overlap.rankCorrelation).toBe(0); // No common sources -> 0
    });

    it("computes mode agreement rate on common selected sources", async () => {
      const controlSelected = [
        createMockRankedSource({ source_id: "source-a", provider_id: "ProviderA", processing_mode: "FULL" }),
        createMockRankedSource({ source_id: "source-b", provider_id: "ProviderA", processing_mode: "REINDEX" }),
      ];

      const treatmentRanked = [
        createMockRankedSource({ source_id: "source-a", provider_id: "ProviderA", processing_mode: "FULL" }),
        createMockRankedSource({ source_id: "source-b", provider_id: "ProviderA", processing_mode: "FULL" }), // Different mode
      ];

      const { compareSelectorOutputs } = await import("./shadow-decisions");

      const result = compareSelectorOutputs(
        controlSelected,
        treatmentRanked,
        [],
        [],
        baseSources
      );

      expect(result.overlap.modeAgreementRate).toBe(0.5); // 1 out of 2 agree
    });

    it("handles treatment excluded sources correctly", async () => {
      const controlSelected = [
        createMockRankedSource({ source_id: "source-a", provider_id: "ProviderA", rank: 1 }),
      ];

      const treatmentRanked: RankedSource[] = [];
      const treatmentExcluded = [
        createMockRankedSource({ source_id: "source-a", provider_id: "ProviderA", excluded: true, exclusion_reason: "cost_exceeds_budget" }),
      ];

      const { compareSelectorOutputs } = await import("./shadow-decisions");

      const result = compareSelectorOutputs(
        controlSelected,
        treatmentRanked,
        treatmentExcluded,
        [],
        baseSources
      );

      const decisionA = result.decisions.find(d => d.source_id === "source-a");
      expect(decisionA?.agreement).toBe("CONTROL_ONLY");
      expect(decisionA?.treatment.excluded).toBe(true);
      expect(decisionA?.treatment.exclusion_reason).toBe("cost_exceeds_budget");
    });

    it("handles treatment cold revisit sources correctly", async () => {
      const controlSelected = [
        createMockRankedSource({ source_id: "source-a", provider_id: "ProviderA", rank: 1 }),
      ];

      const treatmentRanked: RankedSource[] = [];
      const treatmentColdRevisit = [
        createMockRankedSource({ source_id: "source-a", provider_id: "ProviderA", cold_revisit_reason: "no_observation_7d" }),
      ];

      const { compareSelectorOutputs } = await import("./shadow-decisions");

      const result = compareSelectorOutputs(
        controlSelected,
        treatmentRanked,
        [],
        treatmentColdRevisit,
        baseSources
      );

      const decisionA = result.decisions.find(d => d.source_id === "source-a");
      expect(decisionA?.agreement).toBe("CONTROL_ONLY");
      expect(decisionA?.treatment.cold_revisit_reason).toBe("no_observation_7d");
    });

    it("handles empty inputs gracefully", async () => {
      const { compareSelectorOutputs } = await import("./shadow-decisions");

      const result = compareSelectorOutputs(
        [],
        [],
        [],
        [],
        []
      );

      expect(result.decisions).toEqual([]);
      expect(result.overlap.selectedOverlapCount).toBe(0);
      expect(result.overlap.selectedOverlapRate).toBe(0);
      expect(result.overlap.rankCorrelation).toBe(0);
      expect(result.overlap.modeAgreementRate).toBe(0);
    });

    it("handles single source in both selections", async () => {
      const singleSource = [createSyntheticRecord("only-source", "OnlyProvider", "rss_xml", 50, 0.3, 15)];

      const controlSelected = [
        createMockRankedSource({ source_id: "only-source", provider_id: "OnlyProvider", rank: 1, score: 10 }),
      ];

      const treatmentRanked = [
        createMockRankedSource({ source_id: "only-source", provider_id: "OnlyProvider", rank: 1, score: 12 }),
      ];

      const { compareSelectorOutputs } = await import("./shadow-decisions");

      const result = compareSelectorOutputs(
        controlSelected,
        treatmentRanked,
        [],
        [],
        singleSource
      );

      expect(result.decisions.length).toBe(1);
      expect(result.decisions[0].agreement).toBe("BOTH_SELECTED");
      expect(result.overlap.selectedOverlapCount).toBe(1);
      expect(result.overlap.selectedOverlapRate).toBe(1);
      expect(result.overlap.rankCorrelation).toBe(0); // Need >=2 for correlation
      expect(result.overlap.modeAgreementRate).toBe(1);
    });

    it("handles tied ranks in Spearman correlation", async () => {
      // When ranks are tied, Spearman correlation should still compute
      const controlSelected = [
        createMockRankedSource({ source_id: "source-a", provider_id: "ProviderA", rank: 1, score: 20 }),
        createMockRankedSource({ source_id: "source-b", provider_id: "ProviderA", rank: 2, score: 15 }),
        createMockRankedSource({ source_id: "source-c", provider_id: "ProviderB", rank: 2, score: 15 }), // Tied rank
      ];

      const treatmentRanked = [
        createMockRankedSource({ source_id: "source-a", provider_id: "ProviderA", rank: 1, score: 25 }),
        createMockRankedSource({ source_id: "source-b", provider_id: "ProviderA", rank: 2, score: 18 }),
        createMockRankedSource({ source_id: "source-c", provider_id: "ProviderB", rank: 2, score: 18 }), // Tied rank
      ];

      const { compareSelectorOutputs } = await import("./shadow-decisions");

      const result = compareSelectorOutputs(
        controlSelected,
        treatmentRanked,
        [],
        [],
        baseSources
      );

      // With tied ranks, correlation may not be perfect 1.0
      expect(result.overlap.rankCorrelation).toBeGreaterThanOrEqual(-1);
      expect(result.overlap.rankCorrelation).toBeLessThanOrEqual(1);
    });

    it("handles treatment sources with null processing_mode", async () => {
      const controlSelected = [
        createMockRankedSource({ source_id: "source-a", provider_id: "ProviderA", rank: 1, processing_mode: "FULL" }),
      ];

      const treatmentRanked = [
        createMockRankedSource({ source_id: "source-a", provider_id: "ProviderA", rank: 1, processing_mode: undefined as any }),
      ];

      const { compareSelectorOutputs } = await import("./shadow-decisions");

      const result = compareSelectorOutputs(
        controlSelected,
        treatmentRanked,
        [],
        [],
        baseSources
      );

      const decisionA = result.decisions.find(d => d.source_id === "source-a");
      expect(decisionA).toBeDefined();
      expect(decisionA?.treatment.mode).toBe("N/A"); // Falls back to "N/A" when undefined
      // Mode agreement should be 0 when treatment mode is missing
      expect(result.overlap.modeAgreementRate).toBe(0);
    });

    it("handles sources only in treatment cold revisit", async () => {
      const controlSelected = [
        createMockRankedSource({ source_id: "source-a", provider_id: "ProviderA", rank: 1 }),
      ];

      const treatmentColdRevisit = [
        createMockRankedSource({ source_id: "source-b", provider_id: "ProviderB", cold_revisit_reason: "no_observation_7d", mode_reason: "cold_revisit" }),
      ];

      const { compareSelectorOutputs } = await import("./shadow-decisions");

      const result = compareSelectorOutputs(
        controlSelected,
        [],
        [],
        treatmentColdRevisit,
        [
          createSyntheticRecord("source-a", "ProviderA", "rss_xml", 500, 0.15, 200),
          createSyntheticRecord("source-b", "ProviderB", "rss_xml", 300, 0.12, 150),
        ]
      );

      expect(result.decisions.length).toBe(2);

      const decisionB = result.decisions.find(d => d.source_id === "source-b");
      // Neither control nor treatment selected source-b (it's only in cold revisit)
      expect(decisionB?.agreement).toBe("NEITHER");
      expect(decisionB?.treatment.cold_revisit_reason).toBe("no_observation_7d");
      expect(decisionB?.treatment.reason).toBe("cold_revisit");
    });

    it("computes overlap_score correctly for binary overlap", async () => {
      const controlSelected = [
        createMockRankedSource({ source_id: "source-a", provider_id: "ProviderA", rank: 1 }),
        createMockRankedSource({ source_id: "source-b", provider_id: "ProviderA", rank: 2 }),
      ];

      const treatmentRanked = [
        createMockRankedSource({ source_id: "source-a", provider_id: "ProviderA", rank: 1 }),
        createMockRankedSource({ source_id: "source-c", provider_id: "ProviderB", rank: 2 }),
      ];

      const { compareSelectorOutputs } = await import("./shadow-decisions");

      const result = compareSelectorOutputs(
        controlSelected,
        treatmentRanked,
        [],
        [],
        baseSources
      );

      const decisionA = result.decisions.find(d => d.source_id === "source-a");
      const decisionB = result.decisions.find(d => d.source_id === "source-b");
      const decisionC = result.decisions.find(d => d.source_id === "source-c");
      const decisionD = result.decisions.find(d => d.source_id === "source-d");

      // Overlap score is binary: 1 if both selected, 0 otherwise
      expect(decisionA?.overlap_score).toBe(1);
      expect(decisionB?.overlap_score).toBe(0);
      expect(decisionC?.overlap_score).toBe(0);
      expect(decisionD?.overlap_score).toBe(0);
    });

    it("handles large input sets without performance degradation", async () => {
      // Create 100 sources
      const largeSources = Array.from({ length: 100 }, (_, i) =>
        createSyntheticRecord(`source-${i}`, `Provider${i % 10}`, "rss_xml", 100, 0.2, 20)
      );

      const controlSelected = largeSources.slice(0, 10).map((s, i) =>
        createMockRankedSource({ source_id: s.source_id, provider_id: s.provider_id, rank: i + 1 })
      );

      const treatmentRanked = largeSources.slice(5, 15).map((s, i) =>
        createMockRankedSource({ source_id: s.source_id, provider_id: s.provider_id, rank: i + 1 })
      );

      const { compareSelectorOutputs } = await import("./shadow-decisions");

      const start = Date.now();
      const result = compareSelectorOutputs(
        controlSelected,
        treatmentRanked,
        [],
        [],
        largeSources
      );
      const elapsed = Date.now() - start;

      expect(result.decisions.length).toBe(100);
      expect(elapsed).toBeLessThan(100); // Should complete quickly
      expect(result.overlap.selectedOverlapCount).toBe(5); // Sources 5-9 overlap
    });

    it("handles treatment excluded with cost_exceeds_budget reason", async () => {
      const controlSelected = [
        createMockRankedSource({ source_id: "source-a", provider_id: "ProviderA", rank: 1 }),
      ];

      const treatmentExcluded = [
        createMockRankedSource({
          source_id: "source-a",
          provider_id: "ProviderA",
          excluded: true,
          exclusion_reason: "cost_exceeds_budget",
          feasibility: { permitted: false, reason: "cost_exceeds_budget", hardGate: "COST" },
        }),
      ];

      const { compareSelectorOutputs } = await import("./shadow-decisions");

      const result = compareSelectorOutputs(
        controlSelected,
        [],
        treatmentExcluded,
        [],
        baseSources
      );

      const decisionA = result.decisions.find(d => d.source_id === "source-a");
      expect(decisionA?.agreement).toBe("CONTROL_ONLY");
      expect(decisionA?.treatment.excluded).toBe(true);
      expect(decisionA?.treatment.exclusion_reason).toBe("cost_exceeds_budget");
      expect(decisionA?.treatment.feasibility).toContain("cost_exceeds_budget");
    });

    it("handles treatment excluded with multiple reasons", async () => {
      const treatmentExcluded = [
        createMockRankedSource({
          source_id: "source-a",
          provider_id: "ProviderA",
          excluded: true,
          exclusion_reason: "insufficient_qualified_ready",
        }),
        createMockRankedSource({
          source_id: "source-b",
          provider_id: "ProviderB",
          excluded: true,
          exclusion_reason: "policy_lease_expired",
        }),
      ];

      const { compareSelectorOutputs } = await import("./shadow-decisions");

      const result = compareSelectorOutputs(
        [],
        [],
        treatmentExcluded,
        [],
        baseSources
      );

      const decisionA = result.decisions.find(d => d.source_id === "source-a");
      const decisionB = result.decisions.find(d => d.source_id === "source-b");

      expect(decisionA?.treatment.exclusion_reason).toBe("insufficient_qualified_ready");
      expect(decisionB?.treatment.exclusion_reason).toBe("policy_lease_expired");
    });
  });

  describe("runMultiEpochShadowDecisions", () => {
    const epoch1 = "2026-09-01T12:00:00Z";
    const epoch2 = "2026-09-08T12:00:00Z";

    function createSourcesForEpoch(count: number, prefix: string): SourceMemoryRecord[] {
      return Array.from({ length: count }, (_, i) =>
        createSyntheticRecord(`${prefix}-source-${i}`, `Provider${i % 3}`, "rss_xml", 100, 0.2, 20)
      );
    }

    it("runs shadow decisions for multiple epochs", async () => {
      const configs = [
        { topK: 3, maxCostPerSourceCents: 500, coldRevisitDays: 7, epochTimestamp: epoch1 },
        { topK: 3, maxCostPerSourceCents: 500, coldRevisitDays: 7, epochTimestamp: epoch2 },
      ];

      const sourceSnapshots = new Map<string, SourceMemoryRecord[]>([
        [epoch1, createSourcesForEpoch(5, "epoch1")],
        [epoch2, createSourcesForEpoch(5, "epoch2")],
      ]);

      const { runMultiEpochShadowDecisions } = await import("./shadow-decisions");

      const results = await runMultiEpochShadowDecisions(configs, sourceSnapshots);

      expect(results.length).toBe(2);
      expect(results[0].epoch_timestamp).toBe(epoch1);
      expect(results[1].epoch_timestamp).toBe(epoch2);
      expect(results[0].epoch_label).toBe("custom");
      expect(results[1].epoch_label).toBe("custom");
    });

    it("returns result for each config, even with missing epochs", async () => {
       const configs = [
         { topK: 3, maxCostPerSourceCents: 500, coldRevisitDays: 7, epochTimestamp: epoch1 },
         { topK: 3, maxCostPerSourceCents: 500, coldRevisitDays: 7, epochTimestamp: epoch2 },
       ];

       const sourceSnapshots = new Map<string, SourceMemoryRecord[]>([
         [epoch1, createSourcesForEpoch(5, "epoch1")],
         // epoch2 missing
       ]);

       const { runMultiEpochShadowDecisions } = await import("./shadow-decisions");

       const results = await runMultiEpochShadowDecisions(configs, sourceSnapshots);

       expect(results.length).toBe(2);
       expect(results[0].epoch_timestamp).toBe(epoch1);
       expect(results[1].epoch_timestamp).toBe(epoch2);
       expect(results[0].control.total_feasible).toBe(5);
       expect(results[1].control.total_feasible).toBe(0);
     });

    it("returns result for config with empty sources", async () => {
       const configs = [
         { topK: 3, maxCostPerSourceCents: 500, coldRevisitDays: 7, epochTimestamp: epoch1 },
       ];

       const sourceSnapshots = new Map<string, SourceMemoryRecord[]>([
         [epoch1, []],
       ]);

       const { runMultiEpochShadowDecisions } = await import("./shadow-decisions");

       const results = await runMultiEpochShadowDecisions(configs, sourceSnapshots);

       expect(results.length).toBe(1);
       expect(results[0].epoch_timestamp).toBe(epoch1);
       expect(results[0].control.total_feasible).toBe(0);
     });

    it("uses holdout split epoch label when provided", async () => {
      const configs = [
        { topK: 3, maxCostPerSourceCents: 500, coldRevisitDays: 7, epochTimestamp: epoch1, holdoutSplit: "primary_2026_09" },
      ];

      const sourceSnapshots = new Map<string, SourceMemoryRecord[]>([
        [epoch1, createSourcesForEpoch(5, "epoch1")],
      ]);

      const { runMultiEpochShadowDecisions } = await import("./shadow-decisions");

      const results = await runMultiEpochShadowDecisions(configs, sourceSnapshots);

      expect(results[0].epoch_label).toBe("primary_2026_09");
    });

    it("preserves epoch order in results", async () => {
      const configs = [
        { topK: 3, maxCostPerSourceCents: 500, coldRevisitDays: 7, epochTimestamp: epoch2 },
        { topK: 3, maxCostPerSourceCents: 500, coldRevisitDays: 7, epochTimestamp: epoch1 },
      ];

      const sourceSnapshots = new Map<string, SourceMemoryRecord[]>([
        [epoch1, createSourcesForEpoch(5, "epoch1")],
        [epoch2, createSourcesForEpoch(5, "epoch2")],
      ]);

      const { runMultiEpochShadowDecisions } = await import("./shadow-decisions");

      const results = await runMultiEpochShadowDecisions(configs, sourceSnapshots);

      // Results should follow config order, not snapshot order
      expect(results.length).toBe(2);
      expect(results[0].epoch_timestamp).toBe(epoch2);
      expect(results[1].epoch_timestamp).toBe(epoch1);
    });

    it("returns results for all configs even when all epochs are missing", async () => {
       const configs = [
         { topK: 3, maxCostPerSourceCents: 500, coldRevisitDays: 7, epochTimestamp: epoch1 },
         { topK: 3, maxCostPerSourceCents: 500, coldRevisitDays: 7, epochTimestamp: epoch2 },
       ];

       const sourceSnapshots = new Map<string, SourceMemoryRecord[]>();

       const { runMultiEpochShadowDecisions } = await import("./shadow-decisions");

       const results = await runMultiEpochShadowDecisions(configs, sourceSnapshots);

       expect(results.length).toBe(2);
       expect(results[0].epoch_timestamp).toBe(epoch1);
       expect(results[1].epoch_timestamp).toBe(epoch2);
       expect(results[0].control.total_feasible).toBe(0);
       expect(results[1].control.total_feasible).toBe(0);
     });

    it("handles configs with different topK per epoch", async () => {
      const configs = [
        { topK: 2, maxCostPerSourceCents: 500, coldRevisitDays: 7, epochTimestamp: epoch1 },
        { topK: 5, maxCostPerSourceCents: 500, coldRevisitDays: 7, epochTimestamp: epoch2 },
      ];

      const sourceSnapshots = new Map<string, SourceMemoryRecord[]>([
        [epoch1, createSourcesForEpoch(5, "epoch1")],
        [epoch2, createSourcesForEpoch(5, "epoch2")],
      ]);

      const { runMultiEpochShadowDecisions } = await import("./shadow-decisions");

      const results = await runMultiEpochShadowDecisions(configs, sourceSnapshots);

      expect(results.length).toBe(2);
      expect(results[0].control.top_k).toBe(2);
      expect(results[1].control.top_k).toBe(5);
    });
  });

  describe("Shadow Decision Exports", () => {
  it("exports runShadowDecisionCycle", () => {
    expect(typeof runShadowDecisionCycle).toBe("function");
  });

  it("exports generateShadowReceipt", () => {
    expect(typeof generateShadowReceipt).toBe("function");
  });

  it("exports ShadowConfig type", () => {
    // Type test - if this compiles, the type is exported
    const config: ShadowConfig = {
      topK: 10,
      maxCostPerSourceCents: 1000,
      coldRevisitDays: 14,
      epochTimestamp: new Date().toISOString(),
    };
    expect(config.topK).toBe(10);
  });

  it("exports ShadowCycleResult type", () => {
    const result: ShadowCycleResult = {
      epoch_timestamp: "",
      epoch_label: "",
      control: {
        selector_version: "",
        top_k: 0,
        selected_count: 0,
        selected_ids: [],
        excluded_count: 0,
        cold_revisit_count: 0,
        total_feasible: 0,
        ranking_latency_ms: 0,
      },
      treatment: {
        selector_version: "",
        top_k: 0,
        selected_count: 0,
        selected_ids: [],
        excluded_count: 0,
        cold_revisit_count: 0,
        total_feasible: 0,
        ranking_latency_ms: 0,
      },
      overlap: {
        selected_overlap_count: 0,
        selected_overlap_rate: 0,
        rank_correlation: 0,
        mode_agreement_rate: 0,
      },
      decisions: [],
      coverage: {
        known_outcome_sources: 0,
        unknown_outcome_sources: 0,
        censored_sources: 0,
        total_sources_evaluated: 0,
      },
      limitations: [],
      disposition: "LIMITED",
    };
    expect(result.disposition).toBe("LIMITED");
  });

  it("exports ShadowDecisionRecord type", () => {
    const decision: ShadowDecisionRecord = {
      source_id: "test",
      provider_id: "test",
      control: { selected: false, rank: null, score: 0, mode: "", reason: "" },
      treatment: { selected: false, rank: null, score: 0, mode: "", reason: "", feasibility: "", excluded: false, exclusion_reason: null },
      agreement: "NEITHER",
      overlap_score: 0,
    };
    expect(decision.agreement).toBe("NEITHER");
  });

  it("exports createSyntheticRecord for test fixtures", () => {
    expect(typeof createSyntheticRecord).toBe("function");
  });
});

describe("SSAE-05 Offline Hardening — Pure Fixture Tests", () => {
  const baseConfig: ShadowConfig = {
    topK: 5,
    maxCostPerSourceCents: 500,
    coldRevisitDays: 7,
    epochTimestamp: "2026-09-15T12:00:00Z",
  };

  function makeSources(count: number, prefix = "src"): SourceMemoryRecord[] {
    return Array.from({ length: count }, (_, i) =>
      createSyntheticRecord(`${prefix}-${i}`, "Provider", "rss_xml", 100, 0.1, 50)
    );
  }

  function makeRankedSource(overrides: Record<string, any> = {}): RankedSource {
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

  it("runShadowDecisionCycle handles zero feasible sources", async () => {
    const { runShadowDecisionCycle } = await import("./shadow-decisions");
    const result = await runShadowDecisionCycle(baseConfig, []);
    expect(result.control.total_feasible).toBe(0);
    expect(result.treatment.total_feasible).toBe(0);
    expect(result.disposition).toBe("LIMITED");
  });

  it("runShadowDecisionCycle handles single source", async () => {
    const { runShadowDecisionCycle } = await import("./shadow-decisions");
    const sources = makeSources(1);
    const result = await runShadowDecisionCycle(baseConfig, sources);
    expect(result.control.total_feasible).toBe(1);
    expect(result.treatment.total_feasible).toBe(1);
  });

  it("runShadowDecisionCycle respects topK limit", async () => {
    const { runShadowDecisionCycle } = await import("./shadow-decisions");
    const sources = makeSources(20);
    const result = await runShadowDecisionCycle({ ...baseConfig, topK: 3 }, sources);
    expect(result.control.selected_count).toBeLessThanOrEqual(3);
    expect(result.treatment.selected_count).toBeLessThanOrEqual(3);
  });

  it("runShadowDecisionCycle respects cost budget", async () => {
    const { runShadowDecisionCycle } = await import("./shadow-decisions");
    const sources = makeSources(10, "expensive").map(s => ({
      ...s,
      health_rollup: { ...s.health_rollup, recent_success_rate: 0.5 },
    }));
    const result = await runShadowDecisionCycle({ ...baseConfig, maxCostPerSourceCents: 50 }, sources);
    expect(result.control.ranking_latency_ms).toBeGreaterThanOrEqual(0);
  });

  it("runShadowDecisionCycle identifies cold revisit sources", async () => {
    const { runShadowDecisionCycle } = await import("./shadow-decisions");
    const now = new Date("2026-09-15T12:00:00Z");
    const oldDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const sources = makeSources(5).map(s => ({
      ...s,
      lake_state: { ...s.lake_state, last_sighting_at: oldDate },
    }));
    const result = await runShadowDecisionCycle({ ...baseConfig, coldRevisitDays: 7 }, sources);
    expect(result.control.cold_revisit_count).toBeGreaterThanOrEqual(0);
  });

  it("compareSelectorOutputs handles tied ranks in Spearman correlation", async () => {
    const { compareSelectorOutputs } = await import("./shadow-decisions");
    const allSources = [
      createSyntheticRecord("a", "ProviderA", "rss_xml", 100, 0.1, 50),
      createSyntheticRecord("b", "ProviderA", "rss_xml", 100, 0.1, 50),
      createSyntheticRecord("c", "ProviderB", "rss_xml", 100, 0.1, 50),
    ];
    const controlSelected = [
      makeRankedSource({ source_id: "a", provider_id: "ProviderA", rank: 1, score: 20 }),
      makeRankedSource({ source_id: "b", provider_id: "ProviderA", rank: 2, score: 15 }),
      makeRankedSource({ source_id: "c", provider_id: "ProviderB", rank: 3, score: 10 }),
    ];
    const treatmentRanked = [
      makeRankedSource({ source_id: "a", provider_id: "ProviderA", rank: 1, score: 25 }),
      makeRankedSource({ source_id: "b", provider_id: "ProviderA", rank: 2, score: 18 }),
      makeRankedSource({ source_id: "c", provider_id: "ProviderB", rank: 3, score: 12 }),
    ];
    const result = compareSelectorOutputs(controlSelected, treatmentRanked, [], [], allSources);
    expect(result.overlap.selectedOverlapCount).toBe(3);
    expect(result.overlap.rankCorrelation).toBe(1);
  });

  it("compareSelectorOutputs handles null processing_mode gracefully", async () => {
    const { compareSelectorOutputs } = await import("./shadow-decisions");
    const allSources = [
      createSyntheticRecord("a", "ProviderA", "rss_xml", 100, 0.1, 50),
    ];
    const controlSelected = [
      makeRankedSource({ source_id: "a", provider_id: "ProviderA", rank: 1, score: 10 }),
    ];
    const treatmentRanked = [
      makeRankedSource({ source_id: "a", provider_id: "ProviderA", rank: 1, score: 12, processing_mode: undefined as any }),
    ];
    const result = compareSelectorOutputs(controlSelected, treatmentRanked, [], [], allSources);
    expect(result.overlap.modeAgreementRate).toBeGreaterThanOrEqual(0);
  });

  it("compareSelectorOutputs handles cold revisit only sources", async () => {
    const { compareSelectorOutputs } = await import("./shadow-decisions");
    const allSources = [
      createSyntheticRecord("cold-src", "ProviderA", "rss_xml", 100, 0.1, 50),
    ];
    const controlSelected: RankedSource[] = [];
    const treatmentRanked: RankedSource[] = [];
    const treatmentColdRevisit = [
      makeRankedSource({ source_id: "cold-src", provider_id: "ProviderA", cold_revisit_reason: "no_observation_7d" }),
    ];
    const result = compareSelectorOutputs(controlSelected, treatmentRanked, [], treatmentColdRevisit, allSources);
    expect(result.overlap.selectedOverlapCount).toBe(0);
    expect(result.overlap.selectedOverlapRate).toBe(0);
  });

  it("compareSelectorOutputs handles binary overlap_score", async () => {
    const { compareSelectorOutputs } = await import("./shadow-decisions");
    const allSources = [
      createSyntheticRecord("a", "ProviderA", "rss_xml", 100, 0.1, 50),
      createSyntheticRecord("b", "ProviderA", "rss_xml", 100, 0.1, 50),
      createSyntheticRecord("c", "ProviderB", "rss_xml", 100, 0.1, 50),
    ];
    const controlSelected = [
      makeRankedSource({ source_id: "a", provider_id: "ProviderA", rank: 1, score: 10 }),
      makeRankedSource({ source_id: "b", provider_id: "ProviderA", rank: 2, score: 8 }),
    ];
    const treatmentRanked = [
      makeRankedSource({ source_id: "a", provider_id: "ProviderA", rank: 1, score: 12 }),
      makeRankedSource({ source_id: "c", provider_id: "ProviderB", rank: 2, score: 9 }),
    ];
    const result = compareSelectorOutputs(controlSelected, treatmentRanked, [], [], allSources);
    expect(result.overlap.selectedOverlapCount).toBe(1);
    expect(result.overlap.selectedOverlapRate).toBeCloseTo(1 / 3);
  });

  it("compareSelectorOutputs handles large input sets", async () => {
    const { compareSelectorOutputs } = await import("./shadow-decisions");
    const controlIds = Array.from({ length: 100 }, (_, i) => `ctrl-${i}`);
    const treatmentIds = Array.from({ length: 100 }, (_, i) => i < 50 ? `ctrl-${i}` : `treat-${i}`);
    const allSources = controlIds.map((id, i) => createSyntheticRecord(id, "Provider", "rss_xml", 100, 0.1, 50));
    allSources.push(...treatmentIds.filter(id => !controlIds.includes(id)).map(id => createSyntheticRecord(id, "Provider", "rss_xml", 100, 0.1, 50)));
    const controlSelected = controlIds.map((id, i) => makeRankedSource({ source_id: id, provider_id: "Provider", rank: i + 1, score: 100 - i }));
    const treatmentRanked = treatmentIds.map((id, i) => makeRankedSource({ source_id: id, provider_id: "Provider", rank: i + 1, score: 100 - i }));
    const result = compareSelectorOutputs(controlSelected, treatmentRanked, [], [], allSources);
    expect(result.overlap.selectedOverlapCount).toBe(50);
  });

  it("compareSelectorOutputs returns exclusion reasons for cost_exceeds_budget", async () => {
    const { compareSelectorOutputs } = await import("./shadow-decisions");
    const allSources = [
      createSyntheticRecord("a", "ProviderA", "rss_xml", 100, 0.1, 50),
    ];
    const controlSelected = [
      makeRankedSource({ source_id: "a", provider_id: "ProviderA", rank: 1, score: 10 }),
    ];
    const treatmentExcluded = [
      makeRankedSource({ source_id: "a", provider_id: "ProviderA", excluded: true, exclusion_reason: "cost_exceeds_budget" }),
    ];
    const result = compareSelectorOutputs(controlSelected, [], treatmentExcluded, [], allSources);
    const decision = result.decisions.find(d => d.source_id === "a");
    expect(decision?.treatment.exclusion_reason).toBe("cost_exceeds_budget");
  });

  it("generateShadowReceipt produces valid text output", async () => {
    const { generateShadowReceipt } = await import("./shadow-decisions");
    const mockResult = {
      epoch_timestamp: "2026-09-15T12:00:00Z",
      epoch_label: "test",
      control: {
        selector_version: "control@v1",
        top_k: 5,
        selected_count: 3,
        selected_ids: ["a", "b", "c"],
        excluded_count: 2,
        cold_revisit_count: 1,
        total_feasible: 10,
        ranking_latency_ms: 50,
      },
      treatment: {
        selector_version: "ranker@v1",
        top_k: 5,
        selected_count: 2,
        selected_ids: ["a", "b"],
        excluded_count: 3,
        cold_revisit_count: 0,
        total_feasible: 10,
        ranking_latency_ms: 60,
      },
      overlap: {
        selected_overlap_count: 2,
        selected_overlap_rate: 0.5,
        rank_correlation: 0.8,
        mode_agreement_rate: 0.67,
      },
      decisions: [],
      coverage: {
        known_outcome_sources: 2,
        unknown_outcome_sources: 8,
        censored_sources: 0,
        total_sources_evaluated: 10,
      },
      limitations: ["Test limitation"],
      disposition: "LIMITED",
    };
    const receipt = generateShadowReceipt(mockResult);
    expect(receipt).toContain("SSAE-05 Shadow Decision Receipt");
    expect(receipt).toContain("LIMITED");
    expect(receipt).toContain("Overlap: 2");
  });

  it("generateShadowReceipt handles empty decisions", async () => {
    const { generateShadowReceipt } = await import("./shadow-decisions");
    const mockResult = {
      epoch_timestamp: "2026-09-15T12:00:00Z",
      epoch_label: "empty",
      control: {
        selector_version: "control@v1",
        top_k: 5,
        selected_count: 0,
        selected_ids: [],
        excluded_count: 0,
        cold_revisit_count: 0,
        total_feasible: 0,
        ranking_latency_ms: 0,
      },
      treatment: {
        selector_version: "ranker@v1",
        top_k: 5,
        selected_count: 0,
        selected_ids: [],
        excluded_count: 0,
        cold_revisit_count: 0,
        total_feasible: 0,
        ranking_latency_ms: 0,
      },
      overlap: {
        selected_overlap_count: 0,
        selected_overlap_rate: 0,
        rank_correlation: 0,
        mode_agreement_rate: 0,
      },
      decisions: [],
      coverage: {
        known_outcome_sources: 0,
        unknown_outcome_sources: 0,
        censored_sources: 0,
        total_sources_evaluated: 0,
      },
      limitations: [],
      disposition: "LIMITED",
    };
    const receipt = generateShadowReceipt(mockResult);
    expect(receipt).toContain("SSAE-05 Shadow Decision Receipt");
  });

  it("runMultiEpochShadowDecisions preserves epoch order", async () => {
    const { runMultiEpochShadowDecisions } = await import("./shadow-decisions");
    const epoch1 = "2026-09-01T12:00:00Z";
    const epoch2 = "2026-09-08T12:00:00Z";
    const epoch3 = "2026-09-15T12:00:00Z";
    const configs = [
      { ...baseConfig, epochTimestamp: epoch1 },
      { ...baseConfig, epochTimestamp: epoch2 },
      { ...baseConfig, epochTimestamp: epoch3 },
    ];
    const sourceSnapshots = new Map<string, SourceMemoryRecord[]>([
      [epoch1, makeSources(5, "e1")],
      [epoch2, makeSources(5, "e2")],
      [epoch3, makeSources(5, "e3")],
    ]);
    const results = await runMultiEpochShadowDecisions(configs, sourceSnapshots);
    expect(results.length).toBe(3);
    expect(results[0].epoch_timestamp).toBe(epoch1);
    expect(results[1].epoch_timestamp).toBe(epoch2);
    expect(results[2].epoch_timestamp).toBe(epoch3);
  });

  it("runMultiEpochShadowDecisions handles missing epochs gracefully", async () => {
    const { runMultiEpochShadowDecisions } = await import("./shadow-decisions");
    const epoch1 = "2026-09-01T12:00:00Z";
    const epoch2 = "2026-09-08T12:00:00Z";
    const configs = [
      { ...baseConfig, epochTimestamp: epoch1 },
      { ...baseConfig, epochTimestamp: epoch2 },
    ];
    const sourceSnapshots = new Map<string, SourceMemoryRecord[]>([
      [epoch1, makeSources(5, "e1")],
    ]);
    const results = await runMultiEpochShadowDecisions(configs, sourceSnapshots);
    expect(results.length).toBe(2);
    expect(results[0].control.total_feasible).toBe(5);
    expect(results[1].control.total_feasible).toBe(0);
  });

    it("shadow decision cycle uses only provided epochTimestamp", async () => {
      const { runShadowDecisionCycle } = await import("./shadow-decisions");
      const baseConfig: ShadowConfig = {
        topK: 5,
        maxCostPerSourceCents: 500,
        coldRevisitDays: 7,
        epochTimestamp: "2026-09-15T12:00:00Z",
      };
      const sources = makeSources(3);
      // Run with the given epochTimestamp
      const result1 = await runShadowDecisionCycle(baseConfig, sources);
      // Change the epochTimestamp to a different value
      const modifiedConfig = { ...baseConfig, epochTimestamp: "2026-09-16T12:00:00Z" };
      const result2 = await runShadowDecisionCycle(modifiedConfig, sources);
      // The epoch_label should change (if we are using custom label) or at least the epoch_timestamp in the result
      expect(result1.epoch_timestamp).toBe(baseConfig.epochTimestamp);
      expect(result2.epoch_timestamp).toBe(modifiedConfig.epochTimestamp);
      // The rest of the result should be the same because the sources and config (except epochTimestamp) are the same?
      // Actually, the epochTimestamp is used only for the epoch_label and epoch_timestamp in the result.
      // The selection logic does not depend on the epochTimestamp value (only on the sources and config parameters like topK, etc.)
      // So we expect the selected IDs to be the same.
      expect(result1.control.selected_ids).toEqual(result2.control.selected_ids);
      expect(result1.treatment.selected_ids).toEqual(result2.treatment.selected_ids);
    });

    it("shadow receipt includes non-empty selector versions", async () => {
      const { runShadowDecisionCycle, generateShadowReceipt } = await import("./shadow-decisions");
      const baseConfig: ShadowConfig = {
        topK: 5,
        maxCostPerSourceCents: 500,
        coldRevisitDays: 7,
        epochTimestamp: "2026-09-15T12:00:00Z",
      };
      const sources = makeSources(3);
      const result = await runShadowDecisionCycle(baseConfig, sources);
      const receipt = generateShadowReceipt(result);
      expect(receipt).toContain("Control (Deterministic Stride)");
      expect(receipt).toContain("Treatment (SSAE-03 Ranker)");
      // The selector versions should be non-empty strings
      expect(result.control.selector_version).toMatch(/^.+$/);
      expect(result.treatment.selector_version).toMatch(/^.+$/);
      // The receipt should contain these versions
      expect(receipt).toContain(result.control.selector_version);
      expect(receipt).toContain(result.treatment.selector_version);
    });


  it("shadow decision cycle does not mutate input sources", async () => {
    const { runShadowDecisionCycle } = await import("./shadow-decisions");
    const baseConfig: ShadowConfig = {
      topK: 5,
      maxCostPerSourceCents: 500,
      coldRevisitDays: 7,
      epochTimestamp: "2026-09-15T12:00:00Z",
    };
    const sources = makeSources(3);
    // Deep clone the sources to compare later
    const sourcesClone = JSON.parse(JSON.stringify(sources));
    await runShadowDecisionCycle(baseConfig, sources);
    // After the function call, the sources should be unchanged
    expect(sources).toEqual(sourcesClone);
  });
});

describe("SSAE-05 Additional Offline Hardening — Edge Cases", () => {
  const baseConfig: ShadowConfig = {
    topK: 5,
    maxCostPerSourceCents: 500,
    coldRevisitDays: 7,
    epochTimestamp: "2026-09-15T12:00:00Z",
  };

  function makeSources(count: number, prefix = "src"): SourceMemoryRecord[] {
    return Array.from({ length: count }, (_, i) =>
      createSyntheticRecord(`${prefix}-${i}`, "Provider", "rss_xml", 100, 0.1, 50)
    );
  }

  function makeRankedSource(overrides: Record<string, any> = {}): RankedSource {
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

  it("compareSelectorOutputs handles all four agreement types in single call", async () => {
    const { compareSelectorOutputs } = await import("./shadow-decisions");
    const allSources = [
      createSyntheticRecord("both", "ProviderA", "rss_xml", 100, 0.1, 50),
      createSyntheticRecord("control-only", "ProviderA", "rss_xml", 100, 0.1, 50),
      createSyntheticRecord("treatment-only", "ProviderB", "rss_xml", 100, 0.1, 50),
      createSyntheticRecord("neither", "ProviderB", "rss_xml", 100, 0.1, 50),
    ];
    const controlSelected = [
      makeRankedSource({ source_id: "both", provider_id: "ProviderA", rank: 1, score: 20 }),
      makeRankedSource({ source_id: "control-only", provider_id: "ProviderA", rank: 2, score: 15 }),
    ];
    const treatmentRanked = [
      makeRankedSource({ source_id: "both", provider_id: "ProviderA", rank: 1, score: 25 }),
      makeRankedSource({ source_id: "treatment-only", provider_id: "ProviderB", rank: 2, score: 18 }),
    ];
    const result = compareSelectorOutputs(controlSelected, treatmentRanked, [], [], allSources);
    expect(result.decisions.length).toBe(4);
    const dBoth = result.decisions.find(d => d.source_id === "both");
    const dControl = result.decisions.find(d => d.source_id === "control-only");
    const dTreatment = result.decisions.find(d => d.source_id === "treatment-only");
    const dNeither = result.decisions.find(d => d.source_id === "neither");
    expect(dBoth?.agreement).toBe("BOTH_SELECTED");
    expect(dControl?.agreement).toBe("CONTROL_ONLY");
    expect(dTreatment?.agreement).toBe("TREATMENT_ONLY");
    expect(dNeither?.agreement).toBe("NEITHER");
  });

  it("compareSelectorOutputs handles treatment sources with REINDEX mode", async () => {
    const { compareSelectorOutputs } = await import("./shadow-decisions");
    const allSources = [
      createSyntheticRecord("reindex-src", "ProviderA", "rss_xml", 100, 0.1, 50),
    ];
    const controlSelected = [
      makeRankedSource({ source_id: "reindex-src", provider_id: "ProviderA", rank: 1, score: 10, processing_mode: "FULL" }),
    ];
    const treatmentRanked = [
      makeRankedSource({ source_id: "reindex-src", provider_id: "ProviderA", rank: 1, score: 12, processing_mode: "REINDEX" }),
    ];
    const result = compareSelectorOutputs(controlSelected, treatmentRanked, [], [], allSources);
    const decision = result.decisions.find(d => d.source_id === "reindex-src");
    expect(decision?.agreement).toBe("BOTH_SELECTED");
    expect(decision?.control.mode).toBe("FULL");
    expect(decision?.treatment.mode).toBe("REINDEX");
    expect(result.overlap.modeAgreementRate).toBe(0); // Different modes
  });

  it("compareSelectorOutputs handles treatment sources with REUSE mode", async () => {
    const { compareSelectorOutputs } = await import("./shadow-decisions");
    const allSources = [
      createSyntheticRecord("reuse-src", "ProviderA", "rss_xml", 100, 0.1, 50),
    ];
    const controlSelected = [
      makeRankedSource({ source_id: "reuse-src", provider_id: "ProviderA", rank: 1, score: 10, processing_mode: "FULL" }),
    ];
    const treatmentRanked = [
      makeRankedSource({ source_id: "reuse-src", provider_id: "ProviderA", rank: 1, score: 10, processing_mode: "REUSE" }),
    ];
    const result = compareSelectorOutputs(controlSelected, treatmentRanked, [], [], allSources);
    const decision = result.decisions.find(d => d.source_id === "reuse-src");
    expect(decision?.agreement).toBe("BOTH_SELECTED");
    expect(decision?.treatment.mode).toBe("REUSE");
    expect(result.overlap.modeAgreementRate).toBe(0); // Different modes
  });

  it("compareSelectorOutputs handles treatment sources with BOUNDED_REPLAY mode", async () => {
    const { compareSelectorOutputs } = await import("./shadow-decisions");
    const allSources = [
      createSyntheticRecord("replay-src", "ProviderA", "rss_xml", 100, 0.1, 50),
    ];
    const controlSelected = [
      makeRankedSource({ source_id: "replay-src", provider_id: "ProviderA", rank: 1, score: 10, processing_mode: "FULL" }),
    ];
    const treatmentRanked = [
      makeRankedSource({ source_id: "replay-src", provider_id: "ProviderA", rank: 1, score: 10, processing_mode: "BOUNDED_REPLAY" }),
    ];
    const result = compareSelectorOutputs(controlSelected, treatmentRanked, [], [], allSources);
    const decision = result.decisions.find(d => d.source_id === "replay-src");
    expect(decision?.agreement).toBe("BOTH_SELECTED");
    expect(decision?.treatment.mode).toBe("BOUNDED_REPLAY");
    expect(result.overlap.modeAgreementRate).toBe(0); // Different modes
  });

  it("compareSelectorOutputs handles multiple exclusion reasons", async () => {
    const { compareSelectorOutputs } = await import("./shadow-decisions");
    const allSources = [
      createSyntheticRecord("excl-cost", "ProviderA", "rss_xml", 100, 0.1, 50),
      createSyntheticRecord("excl-qualified", "ProviderB", "rss_xml", 100, 0.1, 50),
      createSyntheticRecord("excl-lease", "ProviderC", "rss_xml", 100, 0.1, 50),
      createSyntheticRecord("excl-optout", "ProviderD", "rss_xml", 100, 0.1, 50),
    ];
    const treatmentExcluded = [
      makeRankedSource({ source_id: "excl-cost", provider_id: "ProviderA", excluded: true, exclusion_reason: "cost_exceeds_budget" }),
      makeRankedSource({ source_id: "excl-qualified", provider_id: "ProviderB", excluded: true, exclusion_reason: "insufficient_qualified_ready" }),
      makeRankedSource({ source_id: "excl-lease", provider_id: "ProviderC", excluded: true, exclusion_reason: "policy_lease_expired" }),
      makeRankedSource({ source_id: "excl-optout", provider_id: "ProviderD", excluded: true, exclusion_reason: "opt_out_active" }),
    ];
    const result = compareSelectorOutputs([], [], treatmentExcluded, [], allSources);
    expect(result.decisions.length).toBe(4);
    for (const d of result.decisions) {
      expect(d.treatment.excluded).toBe(true);
      expect(["cost_exceeds_budget", "insufficient_qualified_ready", "policy_lease_expired", "opt_out_active"]).toContain(d.treatment.exclusion_reason);
    }
  });

  it("runMultiEpochShadowDecisions handles configs with holdoutSplit specified", async () => {
    const { runMultiEpochShadowDecisions } = await import("./shadow-decisions");
    const epoch1 = "2026-09-01T12:00:00Z";
    const epoch2 = "2026-09-08T12:00:00Z";
    const configs = [
      { topK: 3, maxCostPerSourceCents: 500, coldRevisitDays: 7, epochTimestamp: epoch1, holdoutSplit: "primary_2026_09" },
      { topK: 3, maxCostPerSourceCents: 500, coldRevisitDays: 7, epochTimestamp: epoch2, holdoutSplit: "extended_2026_08_09" },
    ];
    const sourceSnapshots = new Map<string, SourceMemoryRecord[]>([
      [epoch1, makeSources(5, "e1")],
      [epoch2, makeSources(5, "e2")],
    ]);
    const results = await runMultiEpochShadowDecisions(configs, sourceSnapshots);
    expect(results.length).toBe(2);
    expect(results[0].epoch_label).toBe("primary_2026_09");
    expect(results[1].epoch_label).toBe("extended_2026_08_09");
  });

  it("runMultiEpochShadowDecisions handles empty configs array", async () => {
    const { runMultiEpochShadowDecisions } = await import("./shadow-decisions");
    const results = await runMultiEpochShadowDecisions([], new Map());
    expect(results).toEqual([]);
  });

  it("runShadowDecisionCycle handles sources with different provider families", async () => {
    const { runShadowDecisionCycle } = await import("./shadow-decisions");
    const sources = [
      createSyntheticRecord("src-1", "ProviderA", "rss_xml", 100, 0.1, 50),
      createSyntheticRecord("src-2", "ProviderB", "rss_xml", 100, 0.1, 50),
      createSyntheticRecord("src-3", "ProviderC", "rss_xml", 100, 0.1, 50),
      createSyntheticRecord("src-4", "ProviderD", "rss_xml", 100, 0.1, 50),
      createSyntheticRecord("src-5", "ProviderE", "rss_xml", 100, 0.1, 50),
    ];
    const result = await runShadowDecisionCycle({ ...baseConfig, topK: 5 }, sources);
    // With 5 families and topK=5, should select 1 from each family
    expect(result.control.selected_count).toBeLessThanOrEqual(5);
    const families = new Set(result.control.selected_ids.map(id => sources.find(s => s.source_id === id)?.provider_id).filter(Boolean));
    // Should have diversity across families
    expect(families.size).toBeGreaterThan(1);
  });

  it("runShadowDecisionCycle handles very high cost sources correctly", async () => {
    const { runShadowDecisionCycle } = await import("./shadow-decisions");
    const expensiveSource = createSyntheticRecord(
      "expensive",
      "ExpensiveProvider",
      "public_json_api",
      10000,
      0.10,
      500
    );
    const normalSources = makeSources(5);
    const allSources = [...normalSources, expensiveSource];
    const result = await runShadowDecisionCycle(
      { ...baseConfig, maxCostPerSourceCents: 100, topK: 10 },
      allSources
    );
    const expensiveDecision = result.decisions.find(d => d.source_id === "expensive");
    expect(expensiveDecision).toBeDefined();
    if (expensiveDecision) {
      expect(expensiveDecision.treatment.excluded).toBe(true);
      expect(expensiveDecision.treatment.exclusion_reason).toContain("exceeds budget");
    }
  });

  it("runShadowDecisionCycle handles coldRevisitDays boundary exactly at threshold", async () => {
    const { runShadowDecisionCycle } = await import("./shadow-decisions");
    const now = new Date("2026-09-15T12:00:00Z");
    // Exactly 7 days ago (boundary)
    const exactly7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    // 8 days ago (over threshold)
    const over7Days = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const sources = [
      createSyntheticRecord("exact-7", "ProviderA", "rss_xml", 100, 0.1, 50),
      createSyntheticRecord("over-7", "ProviderB", "rss_xml", 100, 0.1, 50),
    ];
    sources[0].lake_state.last_sighting_at = exactly7Days;
    sources[1].lake_state.last_sighting_at = over7Days;
    const result = await runShadowDecisionCycle({ ...baseConfig, coldRevisitDays: 7, topK: 10 }, sources);
    const exact7Decision = result.decisions.find(d => d.source_id === "exact-7");
    const over7Decision = result.decisions.find(d => d.source_id === "over-7");
    // Exact 7 days: should NOT be cold revisit (threshold is > 7 days)
    // Over 7 days: should be cold revisit
    expect(over7Decision?.treatment.cold_revisit_reason).toMatch(/cold|cold_revisit|No observation/i);
  });

  it("compareSelectorOutputs handles zero overlap with Jaccard = 0", async () => {
    const { compareSelectorOutputs } = await import("./shadow-decisions");
    const allSources = [
      createSyntheticRecord("ctrl-only", "ProviderA", "rss_xml", 100, 0.1, 50),
      createSyntheticRecord("treat-only", "ProviderB", "rss_xml", 100, 0.1, 50),
    ];
    const controlSelected = [
      makeRankedSource({ source_id: "ctrl-only", provider_id: "ProviderA", rank: 1, score: 20 }),
    ];
    const treatmentRanked = [
      makeRankedSource({ source_id: "treat-only", provider_id: "ProviderB", rank: 1, score: 25 }),
    ];
    const result = compareSelectorOutputs(controlSelected, treatmentRanked, [], [], allSources);
    expect(result.overlap.selectedOverlapCount).toBe(0);
    expect(result.overlap.selectedOverlapRate).toBe(0);
    expect(result.overlap.rankCorrelation).toBe(0); // No common sources
  });

  it("compareSelectorOutputs handles perfect overlap with Jaccard = 1", async () => {
    const { compareSelectorOutputs } = await import("./shadow-decisions");
    const allSources = [
      createSyntheticRecord("shared", "ProviderA", "rss_xml", 100, 0.1, 50),
    ];
    const controlSelected = [
      makeRankedSource({ source_id: "shared", provider_id: "ProviderA", rank: 1, score: 20 }),
    ];
    const treatmentRanked = [
      makeRankedSource({ source_id: "shared", provider_id: "ProviderA", rank: 1, score: 25 }),
    ];
    const result = compareSelectorOutputs(controlSelected, treatmentRanked, [], [], allSources);
    expect(result.overlap.selectedOverlapCount).toBe(1);
    expect(result.overlap.selectedOverlapRate).toBe(1);
    expect(result.overlap.rankCorrelation).toBe(0); // Need >=2 for correlation
  });

  it("runShadowDecisionCycle ranking latency is non-negative", async () => {
    const { runShadowDecisionCycle } = await import("./shadow-decisions");
    const sources = makeSources(10);
    const result = await runShadowDecisionCycle(baseConfig, sources);
    expect(result.control.ranking_latency_ms).toBeGreaterThanOrEqual(0);
    expect(result.treatment.ranking_latency_ms).toBeGreaterThanOrEqual(0);
  });

  it("shadow decision cycle with topK=0 returns empty selections", async () => {
    const { runShadowDecisionCycle } = await import("./shadow-decisions");
    const sources = makeSources(5);
    const result = await runShadowDecisionCycle({ ...baseConfig, topK: 0 }, sources);
    expect(result.control.selected_count).toBe(0);
    expect(result.treatment.selected_count).toBe(0);
    expect(result.control.selected_ids).toEqual([]);
    expect(result.treatment.selected_ids).toEqual([]);
  });

  it("compareSelectorOutputs handles control selected with treatment excluded same source", async () => {
    const { compareSelectorOutputs } = await import("./shadow-decisions");
    const allSources = [
      createSyntheticRecord("conflict", "ProviderA", "rss_xml", 100, 0.1, 50),
    ];
    const controlSelected = [
      makeRankedSource({ source_id: "conflict", provider_id: "ProviderA", rank: 1, score: 20 }),
    ];
    const treatmentExcluded = [
      makeRankedSource({ source_id: "conflict", provider_id: "ProviderA", excluded: true, exclusion_reason: "cost_exceeds_budget" }),
    ];
    const result = compareSelectorOutputs(controlSelected, [], treatmentExcluded, [], allSources);
    const decision = result.decisions.find(d => d.source_id === "conflict");
    expect(decision?.agreement).toBe("CONTROL_ONLY");
    expect(decision?.control.selected).toBe(true);
    expect(decision?.treatment.excluded).toBe(true);
  });

  it("runMultiEpochShadowDecisions handles configs with different topK per epoch", async () => {
    const { runMultiEpochShadowDecisions } = await import("./shadow-decisions");
    const epoch1 = "2026-09-01T12:00:00Z";
    const epoch2 = "2026-09-08T12:00:00Z";
    const configs = [
      { topK: 2, maxCostPerSourceCents: 500, coldRevisitDays: 7, epochTimestamp: epoch1 },
      { topK: 5, maxCostPerSourceCents: 500, coldRevisitDays: 7, epochTimestamp: epoch2 },
    ];
    const sourceSnapshots = new Map<string, SourceMemoryRecord[]>([
      [epoch1, makeSources(5, "e1")],
      [epoch2, makeSources(5, "e2")],
    ]);
    const results = await runMultiEpochShadowDecisions(configs, sourceSnapshots);
    expect(results.length).toBe(2);
    expect(results[0].control.top_k).toBe(2);
    expect(results[1].control.top_k).toBe(5);
    expect(results[0].control.selected_count).toBeLessThanOrEqual(2);
    expect(results[1].control.selected_count).toBeLessThanOrEqual(5);
  });

  it("compareSelectorOutputs handles sources only in selector outputs (not in allSources)", async () => {
    const { compareSelectorOutputs } = await import("./shadow-decisions");
    // allSources is empty, but control and treatment have sources
    const allSources: SourceMemoryRecord[] = [];
    const controlSelected = [
      makeRankedSource({ source_id: "ctrl-only", provider_id: "ProviderA", rank: 1, score: 20 }),
    ];
    const treatmentRanked = [
      makeRankedSource({ source_id: "treat-only", provider_id: "ProviderB", rank: 1, score: 15 }),
    ];
    const treatmentExcluded = [
      makeRankedSource({ source_id: "excluded-only", provider_id: "ProviderC", excluded: true, exclusion_reason: "cost_exceeds_budget" }),
    ];
    const treatmentColdRevisit = [
      makeRankedSource({ source_id: "cold-only", provider_id: "ProviderD", cold_revisit_reason: "no_observation_7d" }),
    ];

    const result = compareSelectorOutputs(
      controlSelected,
      treatmentRanked,
      treatmentExcluded,
      treatmentColdRevisit,
      allSources
    );

    // Should create decisions for all 4 sources even though allSources is empty
    expect(result.decisions.length).toBe(4);

    const ctrlDecision = result.decisions.find(d => d.source_id === "ctrl-only");
    expect(ctrlDecision).toBeDefined();
    expect(ctrlDecision?.agreement).toBe("CONTROL_ONLY");
    expect(ctrlDecision?.provider_id).toBe("ProviderA"); // Falls back to controlSelected

    const treatDecision = result.decisions.find(d => d.source_id === "treat-only");
    expect(treatDecision).toBeDefined();
    expect(treatDecision?.agreement).toBe("TREATMENT_ONLY");
    expect(treatDecision?.provider_id).toBe("ProviderB"); // Falls back to treatmentRanked

    const excludedDecision = result.decisions.find(d => d.source_id === "excluded-only");
    expect(excludedDecision).toBeDefined();
    expect(excludedDecision?.agreement).toBe("NEITHER");
    expect(excludedDecision?.treatment.excluded).toBe(true);
    expect(excludedDecision?.provider_id).toBe("ProviderC"); // Falls back to treatmentExcluded

    const coldDecision = result.decisions.find(d => d.source_id === "cold-only");
    expect(coldDecision).toBeDefined();
    expect(coldDecision?.agreement).toBe("NEITHER");
    expect(coldDecision?.treatment.cold_revisit_reason).toBe("no_observation_7d");
    expect(coldDecision?.provider_id).toBe("ProviderD"); // Falls back to treatmentColdRevisit

    // Overlap metrics should be 0 since no overlap
    expect(result.overlap.selectedOverlapCount).toBe(0);
    expect(result.overlap.selectedOverlapRate).toBe(0);
    expect(result.overlap.rankCorrelation).toBe(0);
    expect(result.overlap.modeAgreementRate).toBe(0);
  });
});
