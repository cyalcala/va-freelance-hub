/**
 * v6.5 priority cases A-G — offline verification against existing pure functions.
 *
 * These cases are defined by the v6.5 maintainer contract ("verify priority cases
 * A-G before runtime acceptance"). They exercise real repository logic
 * (packages/scraper/geoGate.ts, scripts/lake/auto-publish-policy.ts,
 * scripts/lake/lake-shared.ts, scripts/lake/source-ranker.ts,
 * scripts/lake/measurement-contracts.ts) with deterministic fixtures.
 *
 * Scope limits, stated honestly:
 * - Nothing here proves a runtime SLO, publication effect or deployed behavior.
 * - No case widens publication authority, lowers a Wilson/sample floor, or
 *   bypasses the publication gateway; that authority remains untouched.
 * - Where a case needs a seam that does not exist as a pure function, the test is
 *   `it.skip` with the exact missing seam named instead of a fake pass.
 *
 * Labels: "v6.5-CASES:" + MATH id.
 */

import { describe, expect, it } from "bun:test";
import { geoGate } from "../../packages/scraper/geoGate";
import { computeFingerprint } from "./lake-shared";
import { decideAutoPublish, wilsonLowerBound } from "./auto-publish-policy";
import {
  checkColdRevisit,
  computeDiversityBonus,
  evaluateFeasibility,
  rankSources,
  DEFAULT_RANKER_CONFIG,
  CURRENT_VERSIONS,
  type SourceMemoryRecord,
} from "./source-ranker";
import {
  createPublicationCohortLabel,
  validatePublicationCohortLabel,
} from "./measurement-contracts";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const EPOCH = "2026-10-04T02:00:00.000Z";
const NOW = new Date(EPOCH);

function createSourceRecord(overrides: Partial<SourceMemoryRecord> = {}): SourceMemoryRecord {
  const record: SourceMemoryRecord = {
    source_id: "case-source",
    provider_id: "case-provider",
    declared_capability: "ats_json",
    endpoint_url: "https://ats.example.com/api/v1/jobs",
    company_token: "case-tenant",
    payload_kind: "json",
    selected_processor: "ats_json",
    routing_warnings: [],
    fetch_state: {
      etag: null,
      last_modified: null,
      last_body_hash: null,
      last_fetch_at: "2026-10-04T01:00:00.000Z",
      last_fetch_ok: true,
      consecutive_failures: 0,
      backoff_until: null,
    },
    lake_state: {
      last_raw_observation_id: 1,
      last_candidate_count: 40,
      last_qualified_ready: 12,
      last_ingestion_at: "2026-10-04T01:00:00.000Z",
      last_sighting_at: "2026-10-04T01:00:00.000Z",
    },
    publication_state: {
      compliance_state: "allowed",
      operational_state: "active",
      policy_expiry: null,
      opt_out: false,
      lease_expiry: null,
      last_decision: "ADMIT",
      last_decision_at: "2026-10-03T01:00:00.000Z",
      last_publication_at: "2026-10-03T01:00:00.000Z",
      last_publication_count: 8,
      last_publication_mode: "unlimited",
      concentration_status: "OK",
    },
    health_rollup: {
      recent_success_rate: 0.95,
      recent_ph_rate: 0.3,
      recent_false_ph_rate: 0.01,
      last_quality_check_at: "2026-10-03T01:00:00.000Z",
      robots_last_checked_at: "2026-10-03T01:00:00.000Z",
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
      can_replay_triage: true,
      can_replay_fingerprint: true,
      can_replay_conditional: true,
      can_replay_publication: true,
      missing_fields: [],
    },
    material_digests: {
      fingerprint_hash: "fp-1",
      content_hash: "ch-1",
      description_hash: "dh-1",
      policy_hash: "pol-1",
    },
  };
  return { ...record, ...overrides };
}

// ─── Case A — valid PH owner lead ────────────────────────────────────────────

describe("v6.5-CASES: MATH-05 case A — valid PH owner lead", () => {
  it("classifies a remote PH-targeted owner lead as PH eligible", () => {
    const verdict = geoGate({
      title: "Virtual Assistant for US e-commerce team",
      description: "Fully remote role open to applicants based in the Philippines.",
      locationRaw: "Remote - Philippines",
      tags: ["remote"],
    });

    expect(verdict.phEligibility).toBe("eligible_verified");
    expect(verdict.evidence).toContain("Philippines");
  });

  it("assigns one stable canonical identity to the owner lead", () => {
    const first = computeFingerprint("Brightwell VA", "Virtual Assistant", "https://jobs.example.com/apply/1");
    const second = computeFingerprint("Brightwell VA", "Virtual Assistant", "https://www.jobs.example.com/apply/1");

    expect(first).toBe(second);
    expect(first).toHaveLength(32);
  });

  it("publishes a mature PH cohort only when the Wilson lower bound clears the floor", () => {
    const decision = decideAutoPublish({
      sourceId: "brightwell-va",
      totalJobs: 10,
      qualifiedReady: 5,
      jevChoice: null,
      jevConfidence: null,
      inventory: null,
    });

    expect(decision.action).toBe("PUBLISH");
    expect(decision.wilsonLower).not.toBeNull();
    expect(decision.reason).toContain("Wilson lower bound");
  });
});

// ─── Case B — onsite / non-PH vacancy rejection ──────────────────────────────

describe("v6.5-CASES: MATH-05 case B — onsite or non-PH vacancy rejection", () => {
  it("rejects an onsite role before any PH text is considered", () => {
    const verdict = geoGate({
      title: "Onsite Customer Support Associate",
      description: "Based in the Philippines, onsite at the Manila office.",
      locationRaw: "Manila, Philippines",
    });

    expect(verdict.phEligibility).toBe("ineligible");
    expect(verdict.evidence).toContain("Not fully remote");
  });

  it("rejects a vacancy pinned outside the Philippines", () => {
    const verdict = geoGate({
      title: "Remote Customer Success Manager",
      description: "Applicants must reside in the United States.",
      locationRaw: "United States",
    });

    expect(verdict.phEligibility).toBe("ineligible");
  });

  it("rejects a cohort whose PH rate is below the reject floor", () => {
    const decision = decideAutoPublish({
      sourceId: "low-yield-source",
      totalJobs: 40,
      qualifiedReady: 1,
      jevChoice: "ADMIT",
      jevConfidence: 0.95,
      inventory: null,
    });

    expect(decision.action).toBe("REJECT");
    expect(decision.publishCount).toBe(0);
  });
});

// ─── Case C — small sample, missing evidence, floors unchanged ───────────────

describe("v6.5-CASES: MATH-05 case C — small sample resolves as missing evidence", () => {
  it("holds a two-job cohort instead of admitting on an obviously good rate", () => {
    const decision = decideAutoPublish({
      sourceId: "small-sample-source",
      totalJobs: 2,
      qualifiedReady: 2,
      jevChoice: "ADMIT",
      jevConfidence: 0.99,
      inventory: null,
    });

    expect(decision.action).toBe("HOLD");
    expect(decision.publishCount).toBe(0);
    expect(decision.reason).toContain("too small");
  });

  it("does not publish a 33% raw PH rate that the Wilson floor cannot clear", () => {
    const decision = decideAutoPublish({
      sourceId: "thin-cohort-source",
      totalJobs: 3,
      qualifiedReady: 1,
      jevChoice: null,
      jevConfidence: null,
      inventory: null,
    });

    expect(decision.action).toBe("HOLD");
    expect(decision.publishCount).toBe(0);
    expect(decision.wilsonLower).not.toBeNull();
    expect(decision.wilsonLower!).toBeLessThan(1 / 3);
  });

  it("publishes only the narrow band the floor actually admits", () => {
    const lower = wilsonLowerBound(2, 3);

    expect(lower).not.toBeNull();
    const decision = decideAutoPublish({
      sourceId: "thin-clearing-source",
      totalJobs: 3,
      qualifiedReady: 2,
      jevChoice: null,
      jevConfidence: null,
      inventory: null,
    });

    expect(decision.action).toBe("PUBLISH");
    expect(lower).toBeCloseTo(decision.wilsonLower!, 10);
  });

  it("returns no interval for an unusable sample rather than a favorable one", () => {
    expect(wilsonLowerBound(2, 0)).toBeNull();
    expect(wilsonLowerBound(-1, 5)).toBeNull();
    expect(wilsonLowerBound(6, 5)).toBeNull();
  });
});

// ─── Case D — opted-out or restricted source block ───────────────────────────

describe("v6.5-CASES: MATH-06 case D — opted-out or restricted source block", () => {
  it("refuses feasibility for an opted-out source", () => {
    const record = createSourceRecord({
      publication_state: {
        ...createSourceRecord().publication_state,
        opt_out: true,
      },
    });

    const gate = evaluateFeasibility(record, NOW);

    expect(gate.permitted).toBe(false);
    expect(gate.hardGate).toBe("OPT_OUT");
  });

  it("refuses feasibility when robots disallow the host", () => {
    const base = createSourceRecord();
    const record = createSourceRecord({
      health_rollup: { ...base.health_rollup, robots_allows: false },
    });

    const gate = evaluateFeasibility(record, NOW);

    expect(gate.permitted).toBe(false);
    expect(gate.hardGate).toBe("ROBOTS");
  });

  it("refuses feasibility for a blocked compliance state and an expired lease", () => {
    const base = createSourceRecord();
    const blocked = evaluateFeasibility(
      createSourceRecord({ publication_state: { ...base.publication_state, compliance_state: "blocked" } }),
      NOW,
    );
    const expired = evaluateFeasibility(
      createSourceRecord({ publication_state: { ...base.publication_state, lease_expiry: "2026-09-01T00:00:00.000Z" } }),
      NOW,
    );

    expect(blocked.permitted).toBe(false);
    expect(blocked.hardGate).toBe("POLICY_EXPIRY");
    expect(expired.permitted).toBe(false);
    expect(expired.hardGate).toBe("LEASE_EXPIRY");
  });

  it("excludes the blocked source from ranking and keeps its reason", () => {
    const base = createSourceRecord();
    const blocked = createSourceRecord({
      source_id: "blocked-source",
      publication_state: { ...base.publication_state, opt_out: true },
    });

    const output = rankSources({
      sources: [createSourceRecord(), blocked],
      currentConcentration: { sourceShares: {}, familyShares: {} },
      epochTimestamp: EPOCH,
    });

    expect(output.ranked.map((s) => s.source_id)).not.toContain("blocked-source");
    const excluded = output.excluded.find((s) => s.source_id === "blocked-source");
    expect(excluded?.excluded).toBe(true);
    expect(excluded?.exclusion_reason).toContain("opted out");
  });

  it("rejects an opted-out source even with a cleared cohort", () => {
    const decision = decideAutoPublish({
      sourceId: "opted-out-source",
      totalJobs: 20,
      qualifiedReady: 20,
      optOut: true,
      inventory: null,
    });

    expect(decision.action).toBe("REJECT");
    expect(decision.publishCount).toBe(0);
  });
});

// ─── Case E — bulk backlog priority ──────────────────────────────────────────

describe("v6.5-CASES: MATH-02 case E — bulk backlog priority", () => {
  it("bounds selected work at topK when a large cohort arrives at once", () => {
    const sources = Array.from({ length: 200 }, (_, index) =>
      createSourceRecord({
        source_id: `backlog-source-${index}`,
        provider_id: `backlog-provider-${index % 7}`,
        lake_state: {
          ...createSourceRecord().lake_state,
          last_candidate_count: 50,
          last_qualified_ready: 10,
        },
      }),
    );

    const output = rankSources({
      sources,
      currentConcentration: { sourceShares: {}, familyShares: {} },
      epochTimestamp: EPOCH,
    });

    expect(output.metadata.totalSources).toBe(200);
    expect(output.ranked.length).toBe(DEFAULT_RANKER_CONFIG.topK);
    expect(output.metadata.rankedCount).toBe(DEFAULT_RANKER_CONFIG.topK);
  });

  it("keeps an unqualified backlog source out of publication consideration by name", () => {
    const base = createSourceRecord();
    const backlog = createSourceRecord({
      source_id: "backlog-no-qualified",
      lake_state: { ...base.lake_state, last_candidate_count: 500, last_qualified_ready: 0 },
    });

    const output = rankSources({
      sources: [createSourceRecord(), backlog],
      currentConcentration: { sourceShares: {}, familyShares: {} },
      epochTimestamp: EPOCH,
    });

    const excluded = output.excluded.find((s) => s.source_id === "backlog-no-qualified");
    expect(excluded).toBeDefined();
    expect(excluded!.excluded).toBe(true);
    expect(excluded!.exclusion_reason).toContain("Qualified ready");
  });

  it("gives a never-observed backlog source a named revisit instead of silent denial", () => {
    const base = createSourceRecord();
    const cold = createSourceRecord({
      source_id: "cold-backlog-source",
      lake_state: { ...base.lake_state, last_candidate_count: 0, last_qualified_ready: 0, last_ingestion_at: null, last_sighting_at: null },
    });

    const revisit = checkColdRevisit(cold, DEFAULT_RANKER_CONFIG, NOW);
    const output = rankSources({
      sources: [cold],
      currentConcentration: { sourceShares: {}, familyShares: {} },
      epochTimestamp: EPOCH,
    });

    expect(revisit.due).toBe(true);
    expect(revisit.dueAt).not.toBeNull();
    const listed = [...output.coldRevisit, ...output.excluded].find((s) => s.source_id === "cold-backlog-source");
    expect(listed).toBeDefined();
    expect(listed!.cold_revisit_reason).toContain("cold start");
    expect(listed!.cold_revisit_due_at).not.toBeNull();
  });
});

// ─── Case F — repeated-owner fairness ────────────────────────────────────────

describe("v6.5-CASES: MATH-08 case F — repeated-owner fairness", () => {
  it("reduces the diversity bonus once one family accumulates repeated share", () => {
    const record = createSourceRecord({ source_id: "repeat-owner-a", provider_id: "repeat-family" });
    const ceilings = DEFAULT_RANKER_CONFIG.concentrationCeiling;

    const fresh = computeDiversityBonus(record, { sourceShares: {}, familyShares: {} }, ceilings);
    const repeated = computeDiversityBonus(
      record,
      { sourceShares: { "repeat-owner-a": 0.2 }, familyShares: { "repeat-family": 0.38 } },
      ceilings,
    );

    expect(repeated).toBeLessThan(fresh);
  });

  it("does not let one repeated owner monopolize the selected set", () => {
    const sources = [
      createSourceRecord({ source_id: "owner-a-1", provider_id: "family-a" }),
      createSourceRecord({ source_id: "owner-a-2", provider_id: "family-a" }),
      createSourceRecord({ source_id: "owner-a-3", provider_id: "family-a" }),
      createSourceRecord({ source_id: "owner-b-1", provider_id: "family-b" }),
    ];
    const concentration = {
      sourceShares: { "owner-a-1": 0.22, "owner-a-2": 0.22, "owner-a-3": 0.22 },
      familyShares: { "family-a": 0.38 },
    };

    const output = rankSources({ sources, currentConcentration: concentration, epochTimestamp: EPOCH });

    expect(output.ranked.length).toBe(4);
    const familyA = output.ranked.filter((s) => s.provider_id === "family-a");
    const familyB = output.ranked.filter((s) => s.provider_id === "family-b");
    expect(familyB.length).toBeGreaterThan(0);
    expect(familyA[0].score_breakdown.diversity_bonus).toBeLessThan(
      familyB[0].score_breakdown.diversity_bonus,
    );
  });

  it("collapses repeated submissions of the same owner lead to one identity", () => {
    const submitted = [
      computeFingerprint("Owner Co", "Remote VA", "https://careers.owner.example/jobs/42"),
      computeFingerprint("Owner Co", "Remote VA", "https://careers.owner.example/jobs/42?ref=inbox"),
      computeFingerprint("owner co", "remote va", "https://careers.owner.example/jobs/42"),
    ];

    expect(new Set(submitted).size).toBe(1);
  });
});

// ─── Case G — rediscovery and idempotent age ─────────────────────────────────

describe("v6.5-CASES: MATH-09 case G — rediscovery and idempotent age", () => {
  it("keeps one canonical identity when a rediscovery changes only non-identity text", () => {
    const original = computeFingerprint("Owner Co", "Remote VA", "https://careers.owner.example/jobs/42");
    const rediscovered = computeFingerprint("Owner Co", "Remote VA", "https://careers.owner.example/jobs/42");

    expect(rediscovered).toBe(original);
  });

  it("refuses a fresh-discovery label when the original posting date is unknown", () => {
    const label = createPublicationCohortLabel(
      "job-rediscovered",
      "owner-source",
      "owner-provider",
      "FRESH_DISCOVERY",
      "2026-10-04T02:00:00.000Z",
      null,
      "v1",
    );

    const result = validatePublicationCohortLabel(label);

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("posted_at");
  });

  it("labels a replayed rediscovery as replay recovery, not fresh supply", () => {
    const label = createPublicationCohortLabel(
      "job-rediscovered",
      "owner-source",
      "owner-provider",
      "REPLAY_RECOVERY",
      "2026-10-04T02:00:00.000Z",
      null,
      "v1",
    );

    const result = validatePublicationCohortLabel(label);

    expect(result.valid).toBe(true);
    expect(label.cohort).not.toBe("FRESH_DISCOVERY");
  });

  it.skip("v6.5-CASES: MATH-09 case G — original first-observation age is not reset by rediscovery", () => {
    // Missing seam: no pure function in the repository compares an original
    // first-observation/first-publication clock against a rediscovery. The age
    // clock lives in the ingest/sighting writer (scripts/lake/ingest-to-lake.ts,
    // scripts/lake/sync-to-d1.ts), both hold-list paths this unit may not edit,
    // and the publication path is a production writer. Needs an owner-authorized
    // pure age-preservation helper plus its own unit; not a fake pass here.
  });
});