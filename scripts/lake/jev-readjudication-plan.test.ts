/**
 * INCIDENT-0410(p): the bounded Jev re-adjudication plan.
 *
 * VERIFIED_QUERY, 2026-10-04 06:2x–06:3xZ, read-only `oc-turso-query` (rolled back):
 *
 *   SELECT review_status, COUNT(*), SUM(jev_raw IS NULL), MAX(last_evaluated_at)
 *     FROM lake_ats_discovery GROUP BY review_status;
 *   -> auto_approved 38 tenants, 27 with jev_raw NULL, newest eval 2026-10-04 06:14:27Z
 *
 *   the per-tenant cross join reproduced as LIVE_AUTO_APPROVED_TENANTS below
 *   -> 60 QUALIFIED_READY rows across 18 tenants; 17 of those tenants have
 *      jev_raw NULL and sit in the ambiguous band; every one of the 27
 *      NULL-verdict tenants has last_evaluated_at BEFORE 2026-10-04.
 *
 * `scripts/lake/jev-readjudication-plan.ts` turns that census into the one thing
 * the incident asked for and the repository does not have: WHICH tenants need a
 * verdict, in WHICH order, capped per run and by the remaining daily AI-call
 * budget, with the evidence that would clear each hold without a paid call.
 *
 * Every assertion below runs production code — the real `decideAutoPublish`,
 * `parseJevRaw`, `wilsonLowerBound`, `MIN_JOBS_FOR_RATE`, `JEV_MIN_CONFIDENCE`,
 * `PUBLISH_PH_RATE_FLOOR` and `renderAttemptReceipt` — imported from production
 * and never restated. The thresholds are read, not copied: each metric sits
 * unambiguously inside or outside the band those constants define.
 */

import { describe, expect, test } from "bun:test";

import {
  JEV_MIN_CONFIDENCE,
  MIN_JOBS_FOR_RATE,
  PUBLISH_PH_RATE_FLOOR,
  decideAutoPublish,
  parseJevRaw,
  wilsonLowerBound,
} from "./auto-publish-policy";
import { renderAttemptReceipt, classifyJevAttempt } from "./jev-verdict-receipt";
import {
  planJevReAdjudication,
  qualifiedRowsToClearWithoutJev,
  type HeldSupplyTenant,
} from "./jev-readjudication-plan";

const VERDICT = "typesafe/jev-1.13-20260917:ADMIT@0.98";

/**
 * The live `auto_approved` census, in the exact shape the production readers
 * produce (`lake_ats_discovery.job_count` / `qualified_ready` are lifetime
 * counters; `pendingQualified` is the real `lake_candidate_jobs` count of
 * `status = 'QUALIFIED_READY'` rows for that `source_id`).
 */
const LIVE_AUTO_APPROVED_TENANTS: HeldSupplyTenant[] = [
  { sourceId: "ashby:supabase", reviewStatus: "auto_approved", jobCount: 48, qualifiedReady: 13, jevRaw: null, pendingQualified: 13 },
  { sourceId: "lever:deliverect", reviewStatus: "auto_approved", jobCount: 38, qualifiedReady: 10, jevRaw: null, pendingQualified: 9 },
  { sourceId: "lever:brafton", reviewStatus: "auto_approved", jobCount: 24, qualifiedReady: 5, jevRaw: null, pendingQualified: 5 },
  { sourceId: "lever:decilegroup", reviewStatus: "auto_approved", jobCount: 16, qualifiedReady: 5, jevRaw: null, pendingQualified: 5 },
  { sourceId: "lever:aethoshotels", reviewStatus: "auto_approved", jobCount: 17, qualifiedReady: 4, jevRaw: null, pendingQualified: 4 },
  { sourceId: "lever:glass-health-inc", reviewStatus: "auto_approved", jobCount: 4, qualifiedReady: 4, jevRaw: VERDICT, pendingQualified: 4 },
  { sourceId: "lever:loadsmart", reviewStatus: "auto_approved", jobCount: 17, qualifiedReady: 4, jevRaw: null, pendingQualified: 4 },
  { sourceId: "lever:lwolf", reviewStatus: "auto_approved", jobCount: 18, qualifiedReady: 4, jevRaw: null, pendingQualified: 4 },
  { sourceId: "ashby:circulareconomysystems", reviewStatus: "auto_approved", jobCount: 8, qualifiedReady: 3, jevRaw: null, pendingQualified: 3 },
  { sourceId: "lever:repurposeglobal", reviewStatus: "auto_approved", jobCount: 7, qualifiedReady: 3, jevRaw: null, pendingQualified: 3 },
  { sourceId: "lever:beaverprocess", reviewStatus: "auto_approved", jobCount: 9, qualifiedReady: 2, jevRaw: null, pendingQualified: 2 },
  { sourceId: "lever:sofarsounds", reviewStatus: "auto_approved", jobCount: 10, qualifiedReady: 2, jevRaw: null, pendingQualified: 2 },
  { sourceId: "ashby:homera-health", reviewStatus: "auto_approved", jobCount: 3, qualifiedReady: 1, jevRaw: null, pendingQualified: 1 },
  { sourceId: "greenhouse:trainingthestreet", reviewStatus: "auto_approved", jobCount: 3, qualifiedReady: 1, jevRaw: null, pendingQualified: 1 },
  { sourceId: "lever:90seconds", reviewStatus: "auto_approved", jobCount: 7, qualifiedReady: 2, jevRaw: null, pendingQualified: 1 },
  { sourceId: "lever:apolloagriculture", reviewStatus: "auto_approved", jobCount: 3, qualifiedReady: 1, jevRaw: null, pendingQualified: 1 },
  { sourceId: "lever:hso", reviewStatus: "auto_approved", jobCount: 5, qualifiedReady: 1, jevRaw: null, pendingQualified: 1 },
  { sourceId: "lever:influ2", reviewStatus: "auto_approved", jobCount: 3, qualifiedReady: 1, jevRaw: null, pendingQualified: 1 },
  { sourceId: "ashby:foundry-for-good", reviewStatus: "auto_approved", jobCount: 27, qualifiedReady: 27, jevRaw: null, pendingQualified: 0 },
  { sourceId: "ashby:gradient", reviewStatus: "auto_approved", jobCount: 5, qualifiedReady: 5, jevRaw: null, pendingQualified: 0 },
  { sourceId: "ashby:multiplymii", reviewStatus: "auto_approved", jobCount: 50, qualifiedReady: 50, jevRaw: "typesafe/jev-1.13-20260917:ADMIT@0.99", pendingQualified: 0 },
  { sourceId: "ashby:the-studio", reviewStatus: "auto_approved", jobCount: 5, qualifiedReady: 3, jevRaw: null, pendingQualified: 0 },
  { sourceId: "breezy:20four7va", reviewStatus: "auto_approved", jobCount: 109, qualifiedReady: 108, jevRaw: null, pendingQualified: 0 },
  { sourceId: "breezy:remote-craft", reviewStatus: "auto_approved", jobCount: 15, qualifiedReady: 14, jevRaw: "typesafe/jev-1.13-20260917:ADMIT@0.97", pendingQualified: 0 },
  { sourceId: "breezy:sourcefit", reviewStatus: "auto_approved", jobCount: 86, qualifiedReady: 78, jevRaw: "typesafe/jev-1.13-20260917:ADMIT@0.97", pendingQualified: 0 },
  { sourceId: "breezy:value-virtual-assistants", reviewStatus: "auto_approved", jobCount: 9, qualifiedReady: 9, jevRaw: "typesafe/jev-1.13-20260917:ADMIT@0.98", pendingQualified: 0 },
  { sourceId: "breezy:yokly", reviewStatus: "auto_approved", jobCount: 11, qualifiedReady: 11, jevRaw: "typesafe/jev-1.13-20260917:ADMIT@0.98", pendingQualified: 0 },
  { sourceId: "greenhouse:3cloud", reviewStatus: "auto_approved", jobCount: 34, qualifiedReady: 16, jevRaw: null, pendingQualified: 0 },
  { sourceId: "greenhouse:canonical", reviewStatus: "auto_approved", jobCount: 310, qualifiedReady: 122, jevRaw: "typesafe/jev-1.13-20260917:ADMIT@0.97", pendingQualified: 0 },
  { sourceId: "greenhouse:extenteam", reviewStatus: "auto_approved", jobCount: 18, qualifiedReady: 17, jevRaw: null, pendingQualified: 0 },
  { sourceId: "greenhouse:pacificlegalfoundation", reviewStatus: "auto_approved", jobCount: 7, qualifiedReady: 7, jevRaw: null, pendingQualified: 0 },
  { sourceId: "lever:snappr", reviewStatus: "auto_approved", jobCount: 17, qualifiedReady: 13, jevRaw: null, pendingQualified: 0 },
  { sourceId: "workable:coconutva", reviewStatus: "auto_approved", jobCount: 40, qualifiedReady: 39, jevRaw: null, pendingQualified: 0 },
  { sourceId: "workable:crewbloom", reviewStatus: "auto_approved", jobCount: 138, qualifiedReady: 37, jevRaw: "typesafe/jev-1.13-20260917:ADMIT@0.95", pendingQualified: 0 },
  { sourceId: "workable:hello-rache", reviewStatus: "auto_approved", jobCount: 3, qualifiedReady: 1, jevRaw: "typesafe/jev-1.13-20260917:ADMIT@0.83", pendingQualified: 0 },
  { sourceId: "workable:hunt-st", reviewStatus: "auto_approved", jobCount: 130, qualifiedReady: 128, jevRaw: "typesafe/jev-1.13-20260917:ADMIT@0.98", pendingQualified: 0 },
  { sourceId: "workable:pearltalent", reviewStatus: "auto_approved", jobCount: 281, qualifiedReady: 99, jevRaw: null, pendingQualified: 0 },
  { sourceId: "workable:rocketams", reviewStatus: "auto_approved", jobCount: 9, qualifiedReady: 7, jevRaw: "typesafe/jev-1.13-20260917:ADMIT@0.98", pendingQualified: 0 },
];

const UNLIMITED = { maxPerRun: Number.MAX_SAFE_INTEGER, remainingDailyCalls: Number.MAX_SAFE_INTEGER };

function planned(plan: ReturnType<typeof planJevReAdjudication>) {
  return plan.candidates.filter((row) => row.disposition === "PLANNED").map((row) => row.sourceId);
}

describe("planJevReAdjudication — the live 2026-10-04 census", () => {
  test("selects exactly the 17 verdict-less tenants that hold real pending supply", () => {
    const plan = planJevReAdjudication(LIVE_AUTO_APPROVED_TENANTS, UNLIMITED);

    expect(planned(plan)).toEqual([
      "ashby:supabase",
      "lever:deliverect",
      "lever:brafton",
      "lever:decilegroup",
      "lever:aethoshotels",
      "lever:loadsmart",
      "lever:lwolf",
      "ashby:circulareconomysystems",
      "lever:repurposeglobal",
      "lever:beaverprocess",
      "lever:sofarsounds",
      "lever:90seconds",
      "ashby:homera-health",
      "greenhouse:trainingthestreet",
      "lever:apolloagriculture",
      "lever:hso",
      "lever:influ2",
    ]);
    expect(plan.summary.eligibleTenants).toBe(17);
    expect(plan.summary.plannedTenants).toBe(17);
    expect(plan.summary.deferredTenants).toBe(0);
  });

  test("accounts for all 38 tenants: 11 already decided, 10 with nothing pending", () => {
    const plan = planJevReAdjudication(LIVE_AUTO_APPROVED_TENANTS, UNLIMITED);
    const byDisposition = (name: string) =>
      plan.candidates.filter((row) => row.disposition === name).map((row) => row.sourceId);

    expect(plan.summary.tenantsExamined).toBe(38);
    expect(byDisposition("VERDICT_RECORDED")).toHaveLength(11);
    expect(byDisposition("NO_PENDING_SUPPLY")).toHaveLength(10);
    expect(plan.candidates).toHaveLength(38);
  });

  test("reproduces the measured 60 pending rows behind the ambiguous band", () => {
    const plan = planJevReAdjudication(LIVE_AUTO_APPROVED_TENANTS, UNLIMITED);

    expect(plan.summary.pendingRowsBehindEligibleTenants).toBe(60);
    expect(plan.summary.pendingRowsPlanned).toBe(60);
    expect(plan.summary.aiCallsPlanned).toBe(17);
  });

  test("every selected tenant is held by the production ambiguous band, with production's own reason", () => {
    const plan = planJevReAdjudication(LIVE_AUTO_APPROVED_TENANTS, UNLIMITED);

    for (const row of plan.candidates.filter((candidate) => candidate.disposition === "PLANNED")) {
      expect(row.gateReason).toBe("ambiguous cohort stays in shadow until Jev returns a confident verdict");
      const live = LIVE_AUTO_APPROVED_TENANTS.find((tenant) => tenant.sourceId === row.sourceId)!;
      const withoutVerdict = decideAutoPublish({
        sourceId: live.sourceId,
        totalJobs: live.jobCount,
        qualifiedReady: live.qualifiedReady,
        inventory: null,
      });
      expect(withoutVerdict.action).toBe("HOLD");
      expect(row.wilsonLower).toBeCloseTo(withoutVerdict.wilsonLower!, 12);
    }
  });
});

describe("planJevReAdjudication — bounds, ordering and idempotency", () => {
  test("caps planned calls at maxPerRun and defers the remainder in the same order", () => {
    const plan = planJevReAdjudication(LIVE_AUTO_APPROVED_TENANTS, {
      maxPerRun: 5,
      remainingDailyCalls: UNLIMITED.remainingDailyCalls,
    });

    expect(plan.summary.plannedTenants).toBe(5);
    expect(plan.summary.deferredTenants).toBe(12);
    expect(plan.summary.aiCallsPlanned).toBe(5);
    // 13 + 9 + 5 + 5 + 4 = 36 planned; 60 - 36 = 24 still held.
    expect(plan.summary.pendingRowsPlanned).toBe(36);
    expect(plan.summary.pendingRowsDeferred).toBe(24);
    expect(plan.candidates.filter((row) => row.disposition === "DEFERRED_BUDGET").map((row) => row.sourceId))
      .toContain("lever:influ2");
  });

  test("never plans more calls than the remaining daily AI budget allows", () => {
    const plan = planJevReAdjudication(LIVE_AUTO_APPROVED_TENANTS, {
      maxPerRun: UNLIMITED.maxPerRun,
      remainingDailyCalls: 4,
    });

    expect(plan.summary.aiCallsPlanned).toBe(4);
    expect(plan.summary.plannedTenants).toBe(4);
    expect(plan.summary.deferredTenants).toBe(13);
  });

  test("an exhausted daily budget defers every candidate instead of planning one", () => {
    const plan = planJevReAdjudication(LIVE_AUTO_APPROVED_TENANTS, {
      maxPerRun: 25,
      remainingDailyCalls: 0,
    });

    expect(plan.summary.aiCallsPlanned).toBe(0);
    expect(plan.summary.plannedTenants).toBe(0);
    expect(plan.summary.deferredTenants).toBe(17);
    expect(plan.summary.pendingRowsDeferred).toBe(60);
  });

  test("refuses a negative or fractional budget instead of silently rounding it", () => {
    expect(() => planJevReAdjudication(LIVE_AUTO_APPROVED_TENANTS, { maxPerRun: -1, remainingDailyCalls: 5 }))
      .toThrow(RangeError);
    expect(() => planJevReAdjudication(LIVE_AUTO_APPROVED_TENANTS, { maxPerRun: 5, remainingDailyCalls: 2.5 }))
      .toThrow(RangeError);
  });

  test("orders equal pending supply by qualified rows, then by source id, deterministically", () => {
    const tied: HeldSupplyTenant[] = [
      { sourceId: "lever:zzz", reviewStatus: "auto_approved", jobCount: 20, qualifiedReady: 4, jevRaw: null, pendingQualified: 4 },
      { sourceId: "lever:aaa", reviewStatus: "auto_approved", jobCount: 20, qualifiedReady: 4, jevRaw: null, pendingQualified: 4 },
      { sourceId: "lever:mmm", reviewStatus: "auto_approved", jobCount: 20, qualifiedReady: 6, jevRaw: null, pendingQualified: 4 },
    ];

    expect(planned(planJevReAdjudication(tied, UNLIMITED))).toEqual([
      "lever:mmm",
      "lever:aaa",
      "lever:zzz",
    ]);
    expect(planned(planJevReAdjudication([...tied].reverse(), UNLIMITED))).toEqual(planned(planJevReAdjudication(tied, UNLIMITED)));
  });

  test("is idempotent: once the verdicts land, the next run plans nothing for those tenants", () => {
    const afterVerdicts = LIVE_AUTO_APPROVED_TENANTS.map((tenant) =>
      tenant.pendingQualified > 0 && !tenant.jevRaw ? { ...tenant, jevRaw: VERDICT } : tenant,
    );

    const second = planJevReAdjudication(afterVerdicts, UNLIMITED);

    expect(second.summary.eligibleTenants).toBe(0);
    expect(second.summary.aiCallsPlanned).toBe(0);
    expect(second.summary.plannedTenants).toBe(0);
    expect(second.candidates.filter((row) => row.disposition === "VERDICT_RECORDED")).toHaveLength(28);
  });

  test("treats a recorded SHADOW verdict as a decision, not as a tenant still awaiting one", () => {
    const shadowed: HeldSupplyTenant[] = [
      { sourceId: "lever:shady", reviewStatus: "auto_approved", jobCount: 20, qualifiedReady: 4, jevRaw: "typesafe/jev-1.13-20260917:SHADOW@0.9", pendingQualified: 4 },
    ];

    const row = planJevReAdjudication(shadowed, UNLIMITED).candidates[0];

    expect(parseJevRaw(shadowed[0].jevRaw)).toEqual({ choice: "SHADOW", confidence: 0.9 });
    expect(row.disposition).toBe("VERDICT_RECORDED");
    expect(row.recordedVerdict).toEqual({ choice: "SHADOW", confidence: 0.9 });
  });

  test("an attempt receipt is consulted-but-undecided evidence, so the tenant stays eligible", () => {
    const receipt = renderAttemptReceipt(
      classifyJevAttempt({ ok: false, error: "Jev request failed or timed out", answers: {} }),
      "2026-10-04T06:15:00.000Z",
    );
    const attempted: HeldSupplyTenant[] = [
      { sourceId: "lever:attempted", reviewStatus: "auto_approved", jobCount: 20, qualifiedReady: 4, jevRaw: receipt, pendingQualified: 4 },
    ];

    const row = planJevReAdjudication(attempted, UNLIMITED).candidates[0];

    expect(parseJevRaw(receipt)).toBeNull();
    expect(row.disposition).toBe("PLANNED");
    expect(row.attemptReceipt).toBe(receipt);
    expect(row.recordedVerdict).toBeNull();
  });
});

describe("planJevReAdjudication — no call is spent where the gate already decided", () => {
  test("skips a tenant whose Wilson bound already clears the publish floor", () => {
    const clears: HeldSupplyTenant[] = [
      { sourceId: "breezy:clears", reviewStatus: "auto_approved", jobCount: 109, qualifiedReady: 108, jevRaw: null, pendingQualified: 5 },
    ];

    const row = planJevReAdjudication(clears, UNLIMITED).candidates[0];

    expect(row.wilsonLower).not.toBeNull();
    expect(row.wilsonLower!).toBeGreaterThanOrEqual(PUBLISH_PH_RATE_FLOOR);
    expect(row.disposition).toBe("GATE_ALREADY_CLEARS");
    expect(row.aiCallPlanned).toBe(false);
  });

  test("skips an opted-out cohort and a hard-rejected cohort", () => {
    const rows = planJevReAdjudication(
      [
        { sourceId: "lever:opted-out", reviewStatus: "auto_approved", jobCount: 20, qualifiedReady: 4, jevRaw: null, pendingQualified: 4, optOut: true },
        { sourceId: "lever:too-thin", reviewStatus: "auto_approved", jobCount: 40, qualifiedReady: 1, jevRaw: null, pendingQualified: 4 },
      ],
      UNLIMITED,
    ).candidates;
    const byId = new Map(rows.map((row) => [row.sourceId, row]));

    expect(byId.get("lever:opted-out")!.disposition).toBe("GATE_REJECTS");
    expect(byId.get("lever:opted-out")!.gateReason).toBe("source is opted out");
    expect(byId.get("lever:too-thin")!.disposition).toBe("GATE_REJECTS");
    expect(byId.get("lever:too-thin")!.gateReason).toBe("PH rate is below the reject floor");
    expect(rows.every((candidate) => candidate.aiCallPlanned === false)).toBe(true);
  });

  test("a small-sample hold names the denominator evidence instead of asking for a verdict", () => {
    const row = planJevReAdjudication(
      [{ sourceId: "lever:tiny", reviewStatus: "auto_approved", jobCount: MIN_JOBS_FOR_RATE - 1, qualifiedReady: 2, jevRaw: null, pendingQualified: 2 }],
      UNLIMITED,
    ).candidates[0];

    expect(row.disposition).toBe("SMALL_SAMPLE_HOLD");
    expect(row.gateReason).toBe("qualified sample is too small to publish");
    expect(row.additionalJobsForSampleFloor).toBe(1);
    expect(row.aiCallPlanned).toBe(false);
  });

  test("never plans a call for a cohort that is not auto-approved", () => {
    const row = planJevReAdjudication(
      [{ sourceId: "lever:shadow", reviewStatus: "shadow_monitor", jobCount: 20, qualifiedReady: 4, jevRaw: null, pendingQualified: 4 }],
      UNLIMITED,
    ).candidates[0];

    expect(row.disposition).toBe("NOT_AUTO_APPROVED");
    expect(row.aiCallPlanned).toBe(false);
  });

  test("skips a tenant with no pending QUALIFIED_READY rows: a verdict unlocks nothing", () => {
    const row = planJevReAdjudication(
      [{ sourceId: "lever:idle", reviewStatus: "auto_approved", jobCount: 281, qualifiedReady: 99, jevRaw: null, pendingQualified: 0 }],
      UNLIMITED,
    ).candidates[0];

    expect(row.disposition).toBe("NO_PENDING_SUPPLY");
    expect(row.aiCallPlanned).toBe(false);
  });
});

describe("qualifiedRowsToClearWithoutJev — naming the hold's missing evidence", () => {
  test("returns 0 when the cohort already clears the floor", () => {
    expect(qualifiedRowsToClearWithoutJev(108, 109)).toBe(0);
  });

  test("returns the minimal additional qualified rows that clear the floor for supabase's 13/48", () => {
    const needed = qualifiedRowsToClearWithoutJev(13, 48)!;

    expect(needed).toBeGreaterThan(0);
    expect(wilsonLowerBound(13, 48)!).toBeLessThan(PUBLISH_PH_RATE_FLOOR);
    expect(wilsonLowerBound(13 + needed, 48)!).toBeGreaterThanOrEqual(PUBLISH_PH_RATE_FLOOR);
    // Minimality: one fewer qualified row still misses the floor.
    expect(wilsonLowerBound(12 + needed, 48)!).toBeLessThan(PUBLISH_PH_RATE_FLOOR);
  });

  test("reports the planned rows beside that alternative on every eligible candidate", () => {
    const plan = planJevReAdjudication(LIVE_AUTO_APPROVED_TENANTS, UNLIMITED);
    const supabase = plan.candidates.find((row) => row.sourceId === "ashby:supabase")!;

    expect(supabase.qualifiedRowsToClearWithoutJev).toBe(qualifiedRowsToClearWithoutJev(13, 48));
    expect(supabase.qualifiedRowsToClearWithoutJev!).toBeGreaterThan(0);
  });

  test("reports null for an unusable denominator instead of inventing a row count", () => {
    // An all-qualified cohort always clears the floor for any n >= 1, so the only
    // way the "more qualified rows" alternative is unreachable is a denominator
    // that cannot be scored at all.
    expect(qualifiedRowsToClearWithoutJev(1, 0)).toBeNull();
    expect(qualifiedRowsToClearWithoutJev(0, 0)).toBeNull();
    expect(qualifiedRowsToClearWithoutJev(1, 1)).toBe(0);
    expect(qualifiedRowsToClearWithoutJev(1, 2)).toBe(1);
  });

  test("every live held tenant clears with at most a handful of extra qualified rows", () => {
    const plan = planJevReAdjudication(LIVE_AUTO_APPROVED_TENANTS, UNLIMITED);
    const evidenceFirst = plan.candidates.filter((row) => row.disposition === "PLANNED");

    expect(evidenceFirst).toHaveLength(17);
    for (const row of evidenceFirst) {
      expect(row.qualifiedRowsToClearWithoutJev).not.toBeNull();
      expect(row.qualifiedRowsToClearWithoutJev!).toBeGreaterThan(0);
      expect(row.qualifiedRowsToClearWithoutJev!).toBeLessThanOrEqual(4);
    }
  });
});

describe("the plan is evidence production, never authority", () => {
  test("every planned tenant is still HOLD under the production gate before any verdict exists", () => {
    const plan = planJevReAdjudication(LIVE_AUTO_APPROVED_TENANTS, UNLIMITED);

    for (const row of plan.candidates.filter((candidate) => candidate.disposition === "PLANNED")) {
      const live = LIVE_AUTO_APPROVED_TENANTS.find((tenant) => tenant.sourceId === row.sourceId)!;
      expect(
        decideAutoPublish({
          sourceId: live.sourceId,
          totalJobs: live.jobCount,
          qualifiedReady: live.qualifiedReady,
          jevChoice: null,
          jevConfidence: null,
          inventory: null,
        }).action,
      ).toBe("HOLD");
      expect(row.decisionClass).toBe("L1_ADVISE");
      expect(row.aiCallPlanned).toBe(true);
    }
    expect(plan.summary.publicationEffect).toBe("NONE");
  });

  test("a confident verdict at the accepted floor is still only a verdict, never a publish", () => {
    const plan = planJevReAdjudication(LIVE_AUTO_APPROVED_TENANTS, UNLIMITED);
    const supabase = plan.candidates.find((row) => row.sourceId === "ashby:supabase")!;
    const live = LIVE_AUTO_APPROVED_TENANTS.find((tenant) => tenant.sourceId === "ashby:supabase")!;

    expect(JEV_MIN_CONFIDENCE).toBeGreaterThan(0);
    const withVerdict = decideAutoPublish({
      sourceId: live.sourceId,
      totalJobs: live.jobCount,
      qualifiedReady: live.qualifiedReady,
      jevChoice: "ADMIT",
      jevConfidence: JEV_MIN_CONFIDENCE,
      inventory: null,
    });

    // The plan does not carry or assert that verdict; it only says one is needed.
    expect(supabase.recordedVerdict).toBeNull();
    expect(withVerdict.action).toBe("PUBLISH");
    expect(plan.summary.publicationEffect).toBe("NONE");
  });

  test("an empty census plans nothing and claims nothing", () => {
    const plan = planJevReAdjudication([], UNLIMITED);

    expect(plan.candidates).toEqual([]);
    expect(plan.summary).toMatchObject({
      tenantsExamined: 0,
      eligibleTenants: 0,
      plannedTenants: 0,
      deferredTenants: 0,
      aiCallsPlanned: 0,
      pendingRowsBehindEligibleTenants: 0,
      publicationEffect: "NONE",
    });
  });
});
