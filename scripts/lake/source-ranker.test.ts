/**
 * SSAE-03 Source Ranker — Unit Tests
 * Tests the pure read-only ranking logic with deterministic fixtures.
 */

import { describe, it, expect, beforeAll } from "bun:test";
import {
  selectProcessingMode,
  evaluateFeasibility,
  estimateMarginalYield,
  estimateCostCents,
  computeFreshnessBonus,
  computeDiversityBonus,
  checkColdRevisit,
  rankSources,
  DEFAULT_RANKER_CONFIG,
  type SourceMemoryRecord,
  type RankerInput,
  type ProcessingMode,
  CURRENT_VERSIONS,
} from "./source-ranker";

// ─── Test Fixtures ────────────────────────────────────────────────────────────

function createBaseRecord(overrides: Partial<SourceMemoryRecord> = {}): SourceMemoryRecord {
  const now = new Date().toISOString();
  return {
    source_id: "test-source",
    provider_id: "test-provider",
    declared_capability: "ats_json",
    endpoint_url: "https://example.com/api",
    company_token: "test-tenant",
    payload_kind: "json",
    selected_processor: "ats_json",
    routing_warnings: [],
    fetch_state: {
      etag: null,
      last_modified: null,
      last_body_hash: null,
      last_fetch_at: now,
      last_fetch_ok: true,
      consecutive_failures: 0,
      backoff_until: null,
    },
    lake_state: {
      last_raw_observation_id: 1,
      last_candidate_count: 100,
      last_qualified_ready: 25,
      last_ingestion_at: now,
      last_sighting_at: now,
    },
    publication_state: {
      compliance_state: "allowed",
      operational_state: "active",
      policy_expiry: null,
      opt_out: false,
      lease_expiry: null,
      last_decision: "ADMIT",
      last_decision_at: now,
      last_publication_at: now,
      last_publication_count: 10,
      last_publication_mode: "unlimited",
      concentration_status: "OK",
    },
    health_rollup: {
      recent_success_rate: 0.95,
      recent_ph_rate: 0.3,
      recent_false_ph_rate: 0.01,
      last_quality_check_at: now,
      robots_last_checked_at: now,
      robots_allows: true,
    },
    version_deps: { ...CURRENT_VERSIONS },
    retention: {
      raw_observation_ttl_days: 30,
      candidate_ttl_days: 180,
      sighting_ttl_days: 365,
      fetch_state_ttl_days: 90,
      publication_receipt_ttl_days: 3650,
    },
    replay_coverage: {
      can_replay_geo_gate: true,
      can_replay_triage: false,
      can_replay_fingerprint: true,
      can_replay_conditional: true,
      can_replay_publication: true,
      missing_fields: ["raw_payload_full", "jev_raw"],
    },
    material_digests: {
      fingerprint_hash: "abc123",
      content_hash: "def456",
      description_hash: null,
      policy_hash: "constitution-v5.2",
    },
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SSAE-03 Source Ranker — Processing Mode Selection", () => {
  it("selects FULL for source with no prior evidence", () => {
    const record = createBaseRecord({
      lake_state: { ...createBaseRecord().lake_state, last_candidate_count: 0, last_qualified_ready: 0 },
      material_digests: { ...createBaseRecord().material_digests, fingerprint_hash: "", content_hash: "" },
    });
    const { mode, reason } = selectProcessingMode(record, CURRENT_VERSIONS);
    expect(mode).toBe("FULL");
    expect(reason).toContain("Insufficient prior evidence");
  });

  it("selects REUSE when evidence and versions match", () => {
    const record = createBaseRecord();
    const { mode, reason, dependencies } = selectProcessingMode(record, CURRENT_VERSIONS);
    expect(mode).toBe("REUSE");
    expect(reason).toContain("Sufficient compatible evidence");
    expect(dependencies).toBeNull();
  });

  it("selects BOUNDED_REPLAY for opt-out", () => {
    const record = createBaseRecord({ publication_state: { ...createBaseRecord().publication_state, opt_out: true } });
    const { mode, reason, dependencies } = selectProcessingMode(record, CURRENT_VERSIONS);
    expect(mode).toBe("BOUNDED_REPLAY");
    expect(reason).toContain("opted out");
    expect(dependencies).toContain("SOURCE_AUTHORITY");
    expect(dependencies).toContain("POLICY");
  });

  it("selects BOUNDED_REPLAY for policy expiry", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const record = createBaseRecord({ publication_state: { ...createBaseRecord().publication_state, policy_expiry: past } });
    const { mode, reason, dependencies } = selectProcessingMode(record, CURRENT_VERSIONS);
    expect(mode).toBe("BOUNDED_REPLAY");
    expect(reason).toContain("Policy lease expired");
    expect(dependencies).toContain("POLICY");
  });

  it("selects BOUNDED_REPLAY for lease expiry", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const record = createBaseRecord({ publication_state: { ...createBaseRecord().publication_state, lease_expiry: past } });
    const { mode, reason, dependencies } = selectProcessingMode(record, CURRENT_VERSIONS);
    expect(mode).toBe("BOUNDED_REPLAY");
    expect(reason).toContain("Evidence lease expired");
    expect(dependencies).toContain("SOURCE_AUTHORITY");
  });

  it("selects BOUNDED_REPLAY for geo_gate version mismatch", () => {
    const record = createBaseRecord({
      version_deps: { ...CURRENT_VERSIONS, geo_gate_version: "geoGate@2025-01-01" },
    });
    const { mode, reason, dependencies } = selectProcessingMode(record, CURRENT_VERSIONS);
    expect(mode).toBe("BOUNDED_REPLAY");
    expect(reason).toContain("GEO_GATE");
    expect(dependencies).toContain("GEO");
  });

  it("selects REINDEX for multiple version mismatches", () => {
    const record = createBaseRecord({
      version_deps: { ...CURRENT_VERSIONS, geo_gate_version: "geoGate@2025-01-01", triage_version: "triage@0.5.0" },
    });
    const { mode, reason } = selectProcessingMode(record, CURRENT_VERSIONS);
    expect(mode).toBe("REINDEX");
    expect(reason).toContain("Version mismatch");
  });
});

describe("SSAE-03 Source Ranker — Feasibility Evaluation", () => {
  const now = new Date();

  it("permits healthy active source", () => {
    const record = createBaseRecord();
    const gate = evaluateFeasibility(record, now);
    expect(gate.permitted).toBe(true);
    expect(gate.hardGate).toBe("NONE");
  });

  it("blocks opted-out source", () => {
    const record = createBaseRecord({ publication_state: { ...createBaseRecord().publication_state, opt_out: true } });
    const gate = evaluateFeasibility(record, now);
    expect(gate.permitted).toBe(false);
    expect(gate.hardGate).toBe("OPT_OUT");
  });

  it("blocks retired source", () => {
    const record = createBaseRecord({ publication_state: { ...createBaseRecord().publication_state, operational_state: "retired" } });
    const gate = evaluateFeasibility(record, now);
    expect(gate.permitted).toBe(false);
    expect(gate.hardGate).toBe("POLICY_EXPIRY");
  });

  it("blocks quarantined source", () => {
    const record = createBaseRecord({ publication_state: { ...createBaseRecord().publication_state, operational_state: "quarantined" } });
    const gate = evaluateFeasibility(record, now);
    expect(gate.permitted).toBe(false);
    expect(gate.hardGate).toBe("POLICY_EXPIRY");
  });

  it("blocks policy-expired source", () => {
    const past = new Date(now.getTime() - 86400000).toISOString();
    const record = createBaseRecord({ publication_state: { ...createBaseRecord().publication_state, policy_expiry: past } });
    const gate = evaluateFeasibility(record, now);
    expect(gate.permitted).toBe(false);
    expect(gate.hardGate).toBe("POLICY_EXPIRY");
  });

  it("blocks lease-expired source", () => {
    const past = new Date(now.getTime() - 86400000).toISOString();
    const record = createBaseRecord({ publication_state: { ...createBaseRecord().publication_state, lease_expiry: past } });
    const gate = evaluateFeasibility(record, now);
    expect(gate.permitted).toBe(false);
    expect(gate.hardGate).toBe("LEASE_EXPIRY");
  });

  it("blocks robots-disallowed source", () => {
    const record = createBaseRecord({ health_rollup: { ...createBaseRecord().health_rollup, robots_allows: false } });
    const gate = evaluateFeasibility(record, now);
    expect(gate.permitted).toBe(false);
    expect(gate.hardGate).toBe("ROBOTS");
  });

  it("blocks source in backoff", () => {
    const future = new Date(now.getTime() + 3600000).toISOString();
    const record = createBaseRecord({ fetch_state: { ...createBaseRecord().fetch_state, backoff_until: future } });
    const gate = evaluateFeasibility(record, now);
    expect(gate.permitted).toBe(false);
    expect(gate.hardGate).toBe("RATE_LIMIT");
  });

  it("blocks source with >3 consecutive failures", () => {
    const record = createBaseRecord({ fetch_state: { ...createBaseRecord().fetch_state, consecutive_failures: 4 } });
    const gate = evaluateFeasibility(record, now);
    expect(gate.permitted).toBe(false);
    expect(gate.hardGate).toBe("RATE_LIMIT");
  });

  it("permits source with no qualified ready but allows fetch", () => {
    const record = createBaseRecord({ lake_state: { ...createBaseRecord().lake_state, last_qualified_ready: 0 } });
    const gate = evaluateFeasibility(record, now);
    expect(gate.permitted).toBe(true);
    expect(gate.reason).toContain("No qualified candidates yet");
  });
});

describe("SSAE-03 Source Ranker — Yield and Cost Estimation", () => {
  it("estimates marginal yield from PH rate and qualified count", () => {
    const record = createBaseRecord({
      lake_state: { ...createBaseRecord().lake_state, last_qualified_ready: 20, last_candidate_count: 100 },
      health_rollup: { ...createBaseRecord().health_rollup, recent_ph_rate: 0.25 },
    });
    const yield_ = estimateMarginalYield(record);
    expect(yield_).toBe(5); // 20 * 0.25
  });

  it("returns zero yield when no qualified candidates", () => {
    const record = createBaseRecord({ lake_state: { ...createBaseRecord().lake_state, last_qualified_ready: 0 } });
    expect(estimateMarginalYield(record)).toBe(0);
  });

  it("returns zero yield when no candidates", () => {
    const record = createBaseRecord({ lake_state: { ...createBaseRecord().lake_state, last_candidate_count: 0 } });
    expect(estimateMarginalYield(record)).toBe(0);
  });

  it("estimates cost based on candidate count and AI usage", () => {
    const record = createBaseRecord({
      lake_state: { ...createBaseRecord().lake_state, last_candidate_count: 200, last_qualified_ready: 50 },
      publication_state: { ...createBaseRecord().publication_state, last_decision: "ADMIT" },
    });
    const cost = estimateCostCents(record);
    expect(cost).toBeGreaterThan(10); // Base cost
    expect(cost).toBeLessThan(500); // Within reasonable bounds
  });
});

describe("SSAE-03 Source Ranker — Bonuses and Cold Revisit", () => {
  const now = new Date();

  it("gives freshness bonus for recent ingestion", () => {
    const recent = new Date(now.getTime() - 1800000).toISOString(); // 30 min ago
    const record = createBaseRecord({ lake_state: { ...createBaseRecord().lake_state, last_ingestion_at: recent } });
    expect(computeFreshnessBonus(record, now)).toBe(1.0);
  });

  it("gives reduced freshness bonus for older ingestion", () => {
    const older = new Date(now.getTime() - 43200000).toISOString(); // 12 hours ago
    const record = createBaseRecord({ lake_state: { ...createBaseRecord().lake_state, last_ingestion_at: older } });
    expect(computeFreshnessBonus(record, now)).toBe(0.5);
  });

  it("gives no freshness bonus for stale ingestion", () => {
    const stale = new Date(now.getTime() - 86400000 * 2).toISOString(); // 2 days ago
    const record = createBaseRecord({ lake_state: { ...createBaseRecord().lake_state, last_ingestion_at: stale } });
    expect(computeFreshnessBonus(record, now)).toBe(0);
  });

  it("gives diversity bonus for underrepresented source/family", () => {
    const record = createBaseRecord({ source_id: "new-source", provider_id: "new-family" });
    const concentration = { sourceShares: {}, familyShares: {} };
    expect(computeDiversityBonus(record, concentration, DEFAULT_RANKER_CONFIG.concentrationCeiling)).toBe(0.5);
  });

  it("gives partial diversity bonus when under ceiling", () => {
    const record = createBaseRecord({ source_id: "source-a", provider_id: "family-a" });
    const concentration = { sourceShares: { "source-a": 0.1 }, familyShares: { "family-a": 0.1 } };
    const bonus = computeDiversityBonus(record, concentration, DEFAULT_RANKER_CONFIG.concentrationCeiling);
    expect(bonus).toBe(0.5); // Both under 50% of ceiling
  });

  it("detects cold revisit for never-observed source", () => {
    const record = createBaseRecord({
      lake_state: { ...createBaseRecord().lake_state, last_sighting_at: null, last_ingestion_at: null },
    });
    const cold = checkColdRevisit(record, DEFAULT_RANKER_CONFIG, now);
    expect(cold.due).toBe(true);
    expect(cold.reason).toContain("Never observed");
  });

  it("detects cold revisit after configured days", () => {
    const old = new Date(now.getTime() - 86400000 * 10).toISOString(); // 10 days ago
    const record = createBaseRecord({ lake_state: { ...createBaseRecord().lake_state, last_sighting_at: old } });
    const cold = checkColdRevisit(record, DEFAULT_RANKER_CONFIG, now);
    expect(cold.due).toBe(true);
    expect(cold.reason).toContain("days");
  });

  it("does not flag cold revisit for recent observation", () => {
    const recent = new Date(now.getTime() - 86400000).toISOString(); // 1 day ago
    const record = createBaseRecord({ lake_state: { ...createBaseRecord().lake_state, last_sighting_at: recent } });
    const cold = checkColdRevisit(record, DEFAULT_RANKER_CONFIG, now);
    expect(cold.due).toBe(false);
  });
});

describe("SSAE-03 Source Ranker — End-to-End Ranking", () => {
  it("ranks feasible sources by composite score", () => {
    const now = new Date().toISOString();
    const sources = [
      createBaseRecord({ source_id: "high-yield", provider_id: "fam-a", lake_state: { ...createBaseRecord().lake_state, last_qualified_ready: 50, last_candidate_count: 100 }, health_rollup: { ...createBaseRecord().health_rollup, recent_ph_rate: 0.4 } }),
      createBaseRecord({ source_id: "low-yield", provider_id: "fam-b", lake_state: { ...createBaseRecord().lake_state, last_qualified_ready: 5, last_candidate_count: 100 }, health_rollup: { ...createBaseRecord().health_rollup, recent_ph_rate: 0.1 } }),
      createBaseRecord({ source_id: "mid-yield", provider_id: "fam-c", lake_state: { ...createBaseRecord().lake_state, last_qualified_ready: 20, last_candidate_count: 100 }, health_rollup: { ...createBaseRecord().health_rollup, recent_ph_rate: 0.25 } }),
    ];

    const concentration = { sourceShares: {}, familyShares: {} };
    const input: RankerInput = { sources, currentConcentration: concentration, epochTimestamp: now };

    const output = rankSources(input);

    expect(output.ranked.length).toBe(3);
    expect(output.ranked[0].source_id).toBe("high-yield");
    expect(output.ranked[1].source_id).toBe("mid-yield");
    expect(output.ranked[2].source_id).toBe("low-yield");
  });

  it("excludes infeasible sources", () => {
    const now = new Date().toISOString();
    const sources = [
      createBaseRecord({ source_id: "feasible", provider_id: "fam-a" }),
      createBaseRecord({ source_id: "opted-out", provider_id: "fam-b", publication_state: { ...createBaseRecord().publication_state, opt_out: true } }),
      createBaseRecord({ source_id: "retired", provider_id: "fam-c", publication_state: { ...createBaseRecord().publication_state, operational_state: "retired" } }),
    ];

    const input: RankerInput = { sources, currentConcentration: { sourceShares: {}, familyShares: {} }, epochTimestamp: now };
    const output = rankSources(input);

    expect(output.ranked.length).toBe(1);
    expect(output.ranked[0].source_id).toBe("feasible");
    expect(output.excluded.length).toBe(2);
    expect(output.excluded.map(e => e.source_id).sort()).toEqual(["opted-out", "retired"]);
  });

  it("excludes sources exceeding cost budget", () => {
    const now = new Date().toISOString();
    const expensiveRecord = createBaseRecord({
      source_id: "expensive",
      provider_id: "fam-a",
      lake_state: { ...createBaseRecord().lake_state, last_candidate_count: 10000, last_qualified_ready: 1000 },
    });
    const sources = [
      createBaseRecord({ source_id: "cheap", provider_id: "fam-b" }),
      expensiveRecord,
    ];

    const input: RankerInput = { sources, currentConcentration: { sourceShares: {}, familyShares: {} }, epochTimestamp: now, config: { ...DEFAULT_RANKER_CONFIG, maxCostPerSourceCents: 50 } };
    const output = rankSources(input);

    expect(output.excluded.some(e => e.source_id === "expensive")).toBe(true);
    expect(output.excluded.find(e => e.source_id === "expensive")?.exclusion_reason).toContain("exceeds budget");
  });

  it("excludes sources below min qualified threshold", () => {
    const now = new Date().toISOString();
    const sources = [
      createBaseRecord({ source_id: "qualified", provider_id: "fam-a", lake_state: { ...createBaseRecord().lake_state, last_qualified_ready: 10 } }),
      createBaseRecord({ source_id: "unqualified", provider_id: "fam-b", lake_state: { ...createBaseRecord().lake_state, last_qualified_ready: 1 } }),
    ];

    const input: RankerInput = { sources, currentConcentration: { sourceShares: {}, familyShares: {} }, epochTimestamp: now, config: { ...DEFAULT_RANKER_CONFIG, minQualifiedReady: 3 } };
    const output = rankSources(input);

    expect(output.ranked.map(r => r.source_id)).toEqual(["qualified"]);
    expect(output.excluded.find(e => e.source_id === "unqualified")?.exclusion_reason).toContain("minimum 3");
  });

  it("flags cold revisit sources separately", () => {
    const now = new Date();
    const old = new Date(now.getTime() - 86400000 * 10).toISOString();
    const sources = [
      createBaseRecord({ source_id: "fresh", provider_id: "fam-a", lake_state: { ...createBaseRecord().lake_state, last_sighting_at: now.toISOString() } }),
      createBaseRecord({ source_id: "cold", provider_id: "fam-b", lake_state: { ...createBaseRecord().lake_state, last_sighting_at: old } }),
    ];

    const input: RankerInput = { sources, currentConcentration: { sourceShares: {}, familyShares: {} }, epochTimestamp: now.toISOString(), config: { ...DEFAULT_RANKER_CONFIG, coldRevisitDays: 7 } };
    const output = rankSources(input);

    expect(output.coldRevisit.map(r => r.source_id)).toEqual(["cold"]);
    expect(output.coldRevisit[0].cold_revisit_reason).toContain("days");
  });

  it("respects top-K limit", () => {
    const now = new Date().toISOString();
    const sources = Array.from({ length: 100 }, (_, i) =>
      createBaseRecord({ source_id: `source-${i}`, provider_id: `fam-${i % 10}`, lake_state: { ...createBaseRecord().lake_state, last_qualified_ready: 100 - i } })
    );

    const input: RankerInput = { sources, currentConcentration: { sourceShares: {}, familyShares: {} }, epochTimestamp: now, config: { ...DEFAULT_RANKER_CONFIG, topK: 10 } };
    const output = rankSources(input);

    expect(output.ranked.length).toBe(10);
    expect(output.metadata.rankedCount).toBe(10);
  });

  it("includes evidence refs and completeness flag", () => {
    const now = new Date().toISOString();
    const sources = [createBaseRecord()];
    const input: RankerInput = { sources, currentConcentration: { sourceShares: {}, familyShares: {} }, epochTimestamp: now };
    const output = rankSources(input);

    expect(output.ranked[0].evidence_refs).toContain("lake_candidate_jobs:test-source");
    expect(output.ranked[0].evidence_refs).toContain("source_registry:test-source");
    expect(output.ranked[0].evidence_complete).toBe(false); // triage replay is false
  });

  it("produces deterministic output for same input", () => {
    const now = new Date().toISOString();
    const sources = [
      createBaseRecord({ source_id: "a", provider_id: "fam-1" }),
      createBaseRecord({ source_id: "b", provider_id: "fam-2" }),
    ];
    const input: RankerInput = { sources, currentConcentration: { sourceShares: {}, familyShares: {} }, epochTimestamp: now };

    const out1 = rankSources(input);
    const out2 = rankSources(input);

    expect(out1.ranked.map(r => r.source_id)).toEqual(out2.ranked.map(r => r.source_id));
    expect(out1.ranked[0].score).toBe(out2.ranked[0].score);
  });
});

describe("SSAE-03 Source Ranker — Version Dependency Invalidation", () => {
  it("invalidates REUSE when fingerprint version changes", () => {
    const record = createBaseRecord({ version_deps: { ...CURRENT_VERSIONS, fingerprint_version: "fingerprint@v0" } });
    const { mode, dependencies } = selectProcessingMode(record, CURRENT_VERSIONS);
    expect(mode).toBe("BOUNDED_REPLAY");
    expect(dependencies).toContain("IDENTITY");
  });

  it("invalidates REUSE when content_hash version changes", () => {
    const record = createBaseRecord({ version_deps: { ...CURRENT_VERSIONS, content_hash_version: "contentHash@v0" } });
    const { mode, dependencies } = selectProcessingMode(record, CURRENT_VERSIONS);
    expect(mode).toBe("BOUNDED_REPLAY");
    expect(dependencies).toContain("IDENTITY");
  });

  it("invalidates REUSE when policy version changes", () => {
    const record = createBaseRecord({ version_deps: { ...CURRENT_VERSIONS, policy_version: "constitution-v5.1" } });
    const { mode, dependencies } = selectProcessingMode(record, CURRENT_VERSIONS);
    expect(mode).toBe("BOUNDED_REPLAY");
    expect(dependencies).toContain("POLICY");
  });

  it("invalidates REUSE when processor version changes", () => {
    const record = createBaseRecord({ version_deps: { ...CURRENT_VERSIONS, processor_version: "capability-registry@0.9.0" } });
    const { mode, dependencies } = selectProcessingMode(record, CURRENT_VERSIONS);
    expect(mode).toBe("REINDEX");
    expect(dependencies).toContain("PARSER");
  });

  it("treats unknown version as mismatch", () => {
    const record = createBaseRecord({ version_deps: { ...CURRENT_VERSIONS, processor_version: "unknown" } });
    const { mode } = selectProcessingMode(record, CURRENT_VERSIONS);
    expect(mode).toBe("FULL");
  });
});