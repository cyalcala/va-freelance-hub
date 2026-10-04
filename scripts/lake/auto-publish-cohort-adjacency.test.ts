/**
 * INCIDENT-0410 / MATH-06: the auto-publish decision sample and the pending
 * publication queue are read from two tables that are never joined.
 *
 * Every expectation below is produced by the real `planAutoPublishSources`,
 * `decideAutoPublish` and `wilsonLowerBound` in this repository over recorded
 * row shapes, and the last block pins the actual source text of the two
 * queries in `sync-to-d1.ts` so the disconnect cannot be "fixed" in one place
 * and stay in the other.
 */

import { describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as path from "path";

import {
  captureAutoPublishLog,
  classifyStarvationBranch,
  measureCohortAdjacency,
  missingEvidenceForStarvation,
  PENDING_PH_ELIGIBILITY_VALUES,
  floor_lowering_required,
  type AdjacencyInput,
  type PendingCohortRow,
} from "./auto-publish-cohort-adjacency";
import {
  decideAutoPublish,
  wilsonLowerBound,
  PUBLISH_PH_RATE_FLOOR,
  REJECT_PH_RATE_FLOOR,
  MIN_JOBS_FOR_RATE,
  type InventorySnapshot,
} from "./auto-publish-policy";
import { planAutoPublishSources, type DiscoveryTenantRow } from "./sync-to-d1";

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..");

function tenant(over: Partial<DiscoveryTenantRow> & { source_id: string }): DiscoveryTenantRow {
  return {
    job_count: 0,
    qualified_ready: 0,
    ph_rate: 0,
    jev_raw: null,
    ...over,
  };
}

/** Recorded production shapes, 2026-10-04 (read-only lake rows). */
const HELD_TENANTS: DiscoveryTenantRow[] = [
  tenant({ source_id: "lever:deliverect", job_count: 38, qualified_ready: 10, ph_rate: 0.263 }),
  tenant({ source_id: "ashby:supabase", job_count: 48, qualified_ready: 13, ph_rate: 0.271 }),
  tenant({ source_id: "lever:decilegroup", job_count: 16, qualified_ready: 5, ph_rate: 0.3125 }),
  tenant({ source_id: "ashby:circulareconomysystems", job_count: 8, qualified_ready: 3, ph_rate: 0.375 }),
  tenant({ source_id: "lever:influ2", job_count: 3, qualified_ready: 1, ph_rate: 0.333 }),
];

const AUTHORIZED_TENANTS: DiscoveryTenantRow[] = [
  tenant({ source_id: "breezy:20four7va", job_count: 109, qualified_ready: 108, ph_rate: 0.991 }),
  tenant({ source_id: "ashby:multiplymii", job_count: 50, qualified_ready: 50, ph_rate: 1 }),
  tenant({ source_id: "workable:pearltalent", job_count: 281, qualified_ready: 99, ph_rate: 0.352 }),
  tenant({ source_id: "lever:snappr", job_count: 17, qualified_ready: 13, ph_rate: 0.765 }),
];

const HELD_PENDING: PendingCohortRow[] = [
  { source_id: "lever:deliverect", ready: 9, newest_observed_at: "2026-10-03 14:11:51" },
  { source_id: "ashby:supabase", ready: 13, newest_observed_at: "2026-10-01 20:22:10" },
  { source_id: "lever:decilegroup", ready: 5, newest_observed_at: "2026-10-03 07:42:06" },
  { source_id: "ashby:circulareconomysystems", ready: 3, newest_observed_at: "2026-10-03 14:09:19" },
  { source_id: "lever:influ2", ready: 1, newest_observed_at: "2026-10-01 19:45:04" },
];

const BASE_IDS = ["we-work-remotely", "remotive", "remote-ok", "breezy:20four7va"];

const INVENTORY: InventorySnapshot = {
  activeTotal: 1397,
  bySource: [
    { sourceId: "we-work-remotely", count: 374 },
    { sourceId: "workable:coconutva", count: 246 },
    { sourceId: "breezy:20four7va", count: 108 },
    { sourceId: "lever:deliverect", count: 9 },
  ],
};

function incidentInput(over: Partial<AdjacencyInput> = {}): AdjacencyInput {
  return {
    tenants: [...HELD_TENANTS, ...AUTHORIZED_TENANTS],
    pending: HELD_PENDING,
    inventory: INVENTORY,
    baseAuthorizedSourceIds: BASE_IDS,
    pendingEligibilitySplit: [
      { ph_eligibility: "eligible_likely", n: 38 },
      { ph_eligibility: "eligible_verified", n: 22 },
    ],
    ...over,
  };
}

describe("INCIDENT-0410: the frozen-supply shape is real, not a hypothesis", () => {
  test("a healthy plan and an unreachable pending queue are reported together", () => {
    const report = measureCohortAdjacency(incidentInput());

    expect(report.tenantCount).toBe(9);
    expect(report.authorizedSourceCount).toBeGreaterThan(0);
    expect(report.authorizedCapacity).toBeGreaterThan(100);
    expect(report.pendingRowCount).toBe(31);
    expect(report.pendingRowsInAuthorizedSources).toBe(0);
    expect(report.pendingRowsInBaseAuthorizedSources).toBe(0);
    expect(report.pendingRowsInHeldSources).toBe(31);
    expect(report.pendingRowsInUnauthorizedSources).toBe(0);
    expect(report.supplyIsFrozen).toBe(true);
  });

  test("every authorised grant is unusable because its tenant has no pending row", () => {
    const report = measureCohortAdjacency(incidentInput());
    expect(report.unusableGrantCount).toBe(report.authorizedSourceCount);
    for (const grant of report.unusableGrants) expect(grant.pendingReady).toBe(0);
    expect(report.unusableGrants.map((grant) => grant.sourceId)).toContain("lever:snappr");
  });

  test("grants recorded from the real planner reasons name the Wilson clearance", () => {
    const report = measureCohortAdjacency(incidentInput());
    const snappr = report.unusableGrants.find((grant) => grant.sourceId === "lever:snappr");
    expect(snappr).toBeDefined();
    expect(snappr!.reason).toContain("clears");
    expect(snappr!.publishCount).toBe(13);
  });

  test("a non-frozen queue is not reported as frozen", () => {
    const report = measureCohortAdjacency(
      incidentInput({ pending: [...HELD_PENDING, { source_id: "lever:snappr", ready: 2 }] }),
    );
    expect(report.supplyIsFrozen).toBe(false);
    expect(report.pendingRowsInAuthorizedSources).toBe(2);
    expect(report.unusableGrantCount).toBe(report.authorizedSourceCount - 1);
    expect(report.pendingRowsInHeldSources).toBe(31);
    expect(report.pendingRowsInUnauthorizedSources).toBe(0);
  });

  test("a base-authorised pending source is reachable even with an empty plan", () => {
    const report = measureCohortAdjacency(
      incidentInput({
        tenants: HELD_TENANTS,
        pending: [{ source_id: "we-work-remotely", ready: 4 }],
      }),
    );
    expect(report.authorizedSourceCount).toBe(0);
    expect(report.pendingRowsInBaseAuthorizedSources).toBe(4);
    expect(report.supplyIsFrozen).toBe(false);
  });

  test("the kill switch empties the plan and turns the queue into a total freeze", () => {
    const withSwitch = measureCohortAdjacency(incidentInput({ holdAutoApproved: true }));
    expect(withSwitch.authorizedSourceCount).toBe(0);
    expect(withSwitch.authorizedCapacity).toBe(0);
    expect(withSwitch.supplyIsFrozen).toBe(true);
  });

  test("the summary states both sides of the disconnect", () => {
    const report = measureCohortAdjacency(incidentInput());
    expect(report.summary).toContain("pending QUALIFIED_READY row(s) exist and none is reachable");
    expect(report.summary).toContain("grant(s) of capacity were issued");
  });
});

describe("INCIDENT-0410: every starved tenant carries a named branch and a next evidence action", () => {
  test("the held tenants are classified by the real decision inputs", () => {
    const report = measureCohortAdjacency(incidentInput());
    const branches = report.starvedSources.map((row) => `${row.sourceId}:${row.branch}`);
    expect(branches).toEqual([
      "ashby:supabase:wilson_ambiguous_without_jev",
      "lever:deliverect:wilson_ambiguous_without_jev",
      "lever:decilegroup:wilson_ambiguous_without_jev",
      "ashby:circulareconomysystems:wilson_ambiguous_without_jev",
      "lever:influ2:wilson_ambiguous_without_jev",
    ]);
  });

  test("the reported Wilson value is the one the real policy computed", () => {
    const report = measureCohortAdjacency(incidentInput());
    const deliverect = report.starvedSources.find((row) => row.sourceId === "lever:deliverect")!;
    const expected = wilsonLowerBound(10, 38);
    expect(expected).not.toBeNull();
    expect(deliverect.wilsonLower).toBeCloseTo(expected!, 12);
    expect(deliverect.wilsonLower!).toBeLessThan(PUBLISH_PH_RATE_FLOOR);
    expect(deliverect.action).toBe("HOLD");
  });

  test("every starved tenant names missing evidence and a next action, never a lower floor", () => {
    const report = measureCohortAdjacency(incidentInput());
    expect(report.starvedSources).toHaveLength(5);
    for (const row of report.starvedSources) {
      expect(row.missingEvidence.length).toBeGreaterThan(0);
      expect(row.nextAction.length).toBeGreaterThan(0);
      expect(row.nextAction.toLowerCase()).not.toContain("lower the");
      expect(row.nextAction.toLowerCase()).not.toContain("relax");
    }
    const supabase = report.starvedSources.find((row) => row.sourceId === "ashby:supabase")!;
    expect(supabase.missingEvidence[0]).toContain("jev_raw");
    expect(supabase.nextAction).toContain("advisory Jev verdict");
  });

  test("a small sample is reported as the sample floor, not as ambiguity", () => {
    const small = tenant({ source_id: "lever:tiny", job_count: 2, qualified_ready: 1, ph_rate: 0.5 });
    const decision = decideAutoPublish({ sourceId: small.source_id, totalJobs: 2, qualifiedReady: 1, inventory: null });
    expect(decision.action).toBe("HOLD");
    expect(classifyStarvationBranch(small, decision)).toBe("sample_floor");
    const evidence = missingEvidenceForStarvation("sample_floor", small);
    expect(evidence.missingEvidence[0]).toContain("MIN_JOBS_FOR_RATE");
    expect(MIN_JOBS_FOR_RATE).toBe(3);
  });

  test("a cohort under the reject floor is distinguished from an ambiguous one", () => {
    const low = tenant({ source_id: "lever:low", job_count: 40, qualified_ready: 1, ph_rate: 0.025 });
    const decision = decideAutoPublish({ sourceId: low.source_id, totalJobs: 40, qualifiedReady: 1, inventory: null });
    expect(1 / 40).toBeLessThan(REJECT_PH_RATE_FLOOR);
    expect(decision.action).toBe("REJECT");
    expect(classifyStarvationBranch(low, decision)).toBe("ph_rate_floor");
    expect(missingEvidenceForStarvation("ph_rate_floor", low).missingEvidence[0]).toContain("REJECT_PH_RATE_FLOOR");
  });

  test("a present but non-admit Jev verdict is a different branch from an absent one", () => {
    const shadowed = tenant({
      source_id: "lever:shadowed",
      job_count: 38,
      qualified_ready: 10,
      ph_rate: 0.263,
      jev_raw: "ambiguous:SHADOW@0.91",
    });
    const decision = decideAutoPublish({
      sourceId: shadowed.source_id,
      totalJobs: 38,
      qualifiedReady: 10,
      jevChoice: "SHADOW",
      jevConfidence: 0.91,
      inventory: null,
    });
    expect(decision.action).toBe("HOLD");
    expect(classifyStarvationBranch(shadowed, decision)).toBe("wilson_ambiguous_jev_not_admit");
    expect(missingEvidenceForStarvation("wilson_ambiguous_jev_not_admit", shadowed).nextAction).toContain(
      "larger lifetime sample",
    );
  });

  test("a cleared tenant blocked only by concentration is labelled as such", () => {
    const bigInventory: InventorySnapshot = {
      activeTotal: 200,
      bySource: [{ sourceId: "lever:crowded", count: 60 }],
    };
    const crowded = tenant({ source_id: "lever:crowded", job_count: 20, qualified_ready: 10, ph_rate: 0.5 });
    const decision = decideAutoPublish({
      sourceId: crowded.source_id,
      totalJobs: 20,
      qualifiedReady: 10,
      inventory: bigInventory,
    });
    expect(wilsonLowerBound(10, 20)!).toBeGreaterThan(PUBLISH_PH_RATE_FLOOR);
    expect(decision.action).toBe("HOLD");
    expect(decision.concentration).toBe("BLOCKED");
    expect(classifyStarvationBranch(crowded, decision)).toBe("concentration_blocked");
  });
});

describe("INCIDENT-0410: the pending-only rate is circular, so it must not replace the sample", () => {
  test("a pending rate is 1 whenever the pending queue is non-empty", () => {
    const report = measureCohortAdjacency(incidentInput());
    for (const row of report.starvedSources) {
      expect(row.pendingReady).toBeGreaterThan(0);
      expect(row.pendingRate).toBe(1);
      expect(row.pendingRateIsCircular).toBe(true);
    }
  });

  test("the pending eligibility split is measured, not assumed", () => {
    const report = measureCohortAdjacency(incidentInput());
    expect(report.eligiblePendingPhShare).toBe(1);
    const missing = measureCohortAdjacency(incidentInput({ pendingEligibilitySplit: [] }));
    expect(missing.eligiblePendingPhShare).toBeNull();
  });

  test("the module declares it lowers no floor", () => {
    expect(floor_lowering_required).toBe(false);
    expect(PENDING_PH_ELIGIBILITY_VALUES).toEqual(["eligible_verified", "eligible_likely"]);
  });
});

describe("INCIDENT-0410: the planner's own log is captured as evidence", () => {
  test("captureAutoPublishLog records the real [AutoPublish] lines and restores console", () => {
    const original = console.log;
    const { result, log } = captureAutoPublishLog(() =>
      planAutoPublishSources(AUTHORIZED_TENANTS, INVENTORY, false),
    );
    expect(console.log).toBe(original);
    expect(result).toHaveLength(4);
    expect(log).toHaveLength(4);
    expect(log[0]).toContain("[AutoPublish] breezy:20four7va: PUBLISH");
    expect(log[0]).toContain("No human approval");
  });

  test("captureAutoPublishLog restores console even when the wrapped call throws", () => {
    const original = console.log;
    expect(() =>
      captureAutoPublishLog(() => {
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(console.log).toBe(original);
  });
});

describe("INCIDENT-0410: source agreement with the live publish path", () => {
  const syncSource = fs.readFileSync(path.join(REPO_ROOT, "scripts/lake/sync-to-d1.ts"), "utf8");

  test("the decision sample and the drained queue are two separate queries", () => {
    expect(syncSource).toContain("FROM lake_ats_discovery");
    expect(syncSource).toContain("FROM lake_candidate_jobs");
    const discoveryQuery = syncSource.slice(syncSource.indexOf("SELECT source_id, job_count, qualified_ready, ph_rate, jev_raw"));
    expect(discoveryQuery.slice(0, 400)).not.toContain("JOIN");
    expect(discoveryQuery.slice(0, 400)).toContain("review_status = 'auto_approved'");
  });

  test("the planner spends a grant against the same tenant id the queue is queried by", () => {
    const grantLoop = syncSource.slice(syncSource.indexOf("for (const source of planned)"));
    expect(grantLoop).toContain("source.sourceId");
    expect(grantLoop).toContain("LIMIT ?");
    expect(grantLoop).toContain("candidates.length === 0");
    expect(grantLoop).toContain("return { syncedCount: 0 }");
  });

  test("the drained queue is pre-filtered to the two eligible PH values", () => {
    const candidateSelect = syncSource.slice(syncSource.indexOf("const CANDIDATE_SELECT"));
    const block = candidateSelect.slice(0, candidateSelect.indexOf("source_id IN ("));
    expect(block).toContain("status = 'QUALIFIED_READY'");
    for (const value of PENDING_PH_ELIGIBILITY_VALUES) expect(block).toContain(`'${value}'`);
  });

  test("the module's constants match the policy module's exported floors", () => {
    const policySource = fs.readFileSync(path.join(REPO_ROOT, "scripts/lake/auto-publish-policy.ts"), "utf8");
    expect(policySource).toContain(`export const PUBLISH_PH_RATE_FLOOR = ${PUBLISH_PH_RATE_FLOOR}`);
    expect(policySource).toContain(`export const REJECT_PH_RATE_FLOOR = ${REJECT_PH_RATE_FLOOR}`);
    expect(policySource).toContain(`export const MIN_JOBS_FOR_RATE = ${MIN_JOBS_FOR_RATE}`);
  });
});