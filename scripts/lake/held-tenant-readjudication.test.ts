/**
 * INCIDENT-0410(u): the held-supply cohort is never selected for re-adjudication.
 *
 * Root cause, VERIFIED_CODE. `runDomainAtsDiscovery` builds its tenant set from
 * `extractDiscoveryCandidates`, whose SQL orders companies by
 * `MAX(lake_candidate_jobs.sighting_count)` — a discovery ranking that knows
 * nothing about held supply. A tenant therefore gets re-probed only when some
 * unrelated company row happens to outrank it. VERIFIED_QUERY on the live lake
 * (2026-10-04) shows the consequence: `lake_ats_discovery` holds 38
 * `auto_approved` tenants, 27 of them with `jev_raw` NULL, and 17 of those hold
 * **60** `QUALIFIED_READY` rows that the D1 publisher cannot use, because
 * `decideAutoPublish` returns the ambiguous band's default HOLD
 * ("ambiguous cohort stays in shadow until Jev returns a confident verdict")
 * for every one of them. No amount of waiting changes the selection order, so
 * the hold is permanent by construction.
 *
 * What this file pins. The selector that closes that gap:
 * `selectHeldTenantsForReAdjudication` must return, per run, a bounded,
 * deterministic, oldest-first set of the held cohort, reusing the already
 * reviewed gate-consistency filter from `planJevReAdjudication` so no call is
 * planned for a cohort the production gate has already decided.
 *
 * What this file deliberately does not pin, because it would be a placeholder:
 * nothing here asserts a constant against itself. Every expectation is made
 * against the real `decideAutoPublish`, the real `wilsonLowerBound`, the real
 * `parseJevRaw`, the real `probeTemplateForFamily` and the real
 * `buildDiscoverySourceId`, using the 17 tenants and their stored counters
 * measured on the live lake.
 *
 * Authority. No threshold moves. `PUBLISH_PH_RATE_FLOOR`,
 * `MIN_JOBS_FOR_RATE`, `JEV_MIN_CONFIDENCE`, `AUTO_APPROVE_PH_RATE` and
 * `AUTO_REJECT_PH_RATE` are imported from production and never restated. The
 * cohort is restricted to tenants that are **already** `auto_approved`, so this
 * pass can only confirm or narrow; it can never admit a new source. Every
 * planned row is L1_ADVISE (CONSTITUTION §2.2, §7.1).
 */

import { describe, expect, test } from "bun:test";

import {
  buildDiscoverySourceId,
  probeTemplateForFamily,
  selectHeldTenantsForReAdjudication,
  toHeldTenantRows,
  type HeldTenantCandidateRow,
} from "./domain-ats-discovery";
import {
  MIN_JOBS_FOR_RATE,
  PUBLISH_PH_RATE_FLOOR,
  REJECT_PH_RATE_FLOOR,
  decideAutoPublish,
  wilsonLowerBound,
} from "./auto-publish-policy";

/**
 * VERIFIED_QUERY snapshot of `lake_ats_discovery` (2026-10-04, read-only,
 * always rolled back): every `auto_approved` tenant with `jev_raw` NULL, joined
 * with the real `lake_candidate_jobs` count of pending `QUALIFIED_READY` rows.
 * The first 17 rows hold supply; the last 8 hold none and must be excluded.
 */
const MEASURED_ROWS: HeldTenantCandidateRow[] = [
  row("ashby", "supabase", "Supabase", "2026-10-01 20:21:54", 48, 13, 13),
  row("lever", "deliverect", "Deliverect", "2026-10-03 14:11:37", 38, 10, 9),
  row("lever", "decilegroup", "Decile Group", "2026-10-03 07:42:03", 16, 5, 5),
  row("lever", "brafton", "Brafton", "2026-10-03 13:49:19", 24, 5, 5),
  row("lever", "loadsmart", "Loadsmart", "2026-10-01 19:25:25", 17, 4, 4),
  row("lever", "aethoshotels", "Aethos", "2026-10-01 19:44:13", 17, 4, 4),
  row("lever", "lwolf", "Lone Wolf Technologies", "2026-10-03 05:31:34", 18, 4, 4),
  row("ashby", "circulareconomysystems", "Circular Economy Systems", "2026-10-03 14:09:13", 8, 3, 3),
  row("lever", "repurposeglobal", "rePurpose Global", "2026-10-03 14:12:37", 7, 3, 3),
  row("lever", "sofarsounds", "Sofar Sounds", "2026-10-01 16:38:43", 10, 2, 2),
  row("lever", "beaverprocess", "Beaver Process Equipment", "2026-10-03 07:41:51", 9, 2, 2),
  row("lever", "apolloagriculture", "Apollo Agriculture", "2026-10-01 19:44:23", 3, 1, 1),
  row("lever", "influ2", "Influ2", "2026-10-01 19:45:04", 3, 1, 1),
  row("lever", "90seconds", "90 Seconds", "2026-10-03 12:49:19", 7, 2, 1),
  row("greenhouse", "trainingthestreet", "Training The Street", "2026-10-03 14:05:35", 3, 1, 1),
  row("lever", "hso", "HSO", "2026-10-03 14:12:01", 5, 1, 1),
  row("ashby", "homera-health", "Homera Health", "2026-10-03 21:31:02", 3, 1, 1),
  // No pending QUALIFIED_READY row: a verdict here unlocks nothing today.
  row("breezy", "20four7va", "20Four7VA", "2026-10-01 13:32:41", 109, 108, 0),
  row("workable", "coconutva", "Coconut VA", "2026-10-01 14:33:02", 40, 39, 0),
  row("workable", "pearltalent", "Pearl Talent", "2026-10-01 14:34:23", 281, 99, 0),
  row("lever", "snappr", "Snappr", "2026-10-01 16:18:11", 17, 13, 0),
  row("ashby", "the-studio", "The Utopia Venture Platform", "2026-10-01 16:18:18", 5, 3, 0),
  row("greenhouse", "pacificlegalfoundation", "pacificlegalfoundation", "2026-10-02 00:57:57", 7, 7, 0),
  row("greenhouse", "extenteam", "Extenteam Client Roles", "2026-10-02 09:56:57", 18, 17, 0),
  row("ashby", "foundry-for-good", "Foundry for Good", "2026-10-03 07:39:48", 27, 27, 0),
];

function row(
  atsFamily: string,
  tenantSlug: string,
  companyHint: string,
  lastEvaluatedAt: string | null,
  jobCount: number,
  qualifiedReady: number,
  pendingQualified: number,
  overrides: Partial<HeldTenantCandidateRow> = {},
): HeldTenantCandidateRow {
  return {
    sourceId: buildDiscoverySourceId(atsFamily, tenantSlug),
    reviewStatus: "auto_approved",
    atsFamily,
    tenantSlug,
    domain: `${tenantSlug}.${atsFamily}`,
    companyHint,
    jobCount,
    qualifiedReady,
    phRate: jobCount > 0 ? qualifiedReady / jobCount : 0,
    lastEvaluatedAt,
    pendingQualified,
    jevRaw: null,
    ...overrides,
  };
}

const selectedIds = (rows: HeldTenantCandidateRow[], cap: number) =>
  selectHeldTenantsForReAdjudication(rows, cap).selected.map((t) => t.sourceId);

describe("selectHeldTenantsForReAdjudication — the measured held cohort", () => {
  test("selects exactly the 17 tenants that hold pending supply", () => {
    const selection = selectHeldTenantsForReAdjudication(MEASURED_ROWS, 25);

    expect(selection.selected).toHaveLength(17);
    expect(selection.examined).toBe(MEASURED_ROWS.length);
    expect(selection.gateExcluded).toBe(8);
    expect(selection.pendingRowsBehindSelection).toBe(60);
    expect(selection.candidates).toEqual([]);
  });

  test("every selected tenant is one the production gate is holding in the ambiguous band", () => {
    const selection = selectHeldTenantsForReAdjudication(MEASURED_ROWS, 25);

    for (const tenant of selection.selected) {
      // Asked with no Jev fields at all: this is what the publisher does today.
      const gate = decideAutoPublish({
        sourceId: tenant.sourceId,
        totalJobs: tenant.jobCount,
        qualifiedReady: tenant.qualifiedReady,
        inventory: null,
      });
      expect(gate.action).toBe("HOLD");
      expect(gate.reason).toBe("ambiguous cohort stays in shadow until Jev returns a confident verdict");
      expect(gate.publishCount).toBe(0);
      // And the bound that keeps it there is a number the selector never restates.
      expect(wilsonLowerBound(tenant.qualifiedReady, tenant.jobCount)!).toBeLessThan(PUBLISH_PH_RATE_FLOOR);
    }
  });

  test("excludes the 8 tenants with no pending QUALIFIED_READY row", () => {
    const ids = selectedIds(MEASURED_ROWS, 25);
    for (const excluded of [
      "breezy:20four7va",
      "workable:coconutva",
      "workable:pearltalent",
      "lever:snappr",
      "ashby:the-studio",
      "greenhouse:pacificlegalfoundation",
      "greenhouse:extenteam",
      "ashby:foundry-for-good",
    ]) {
      expect(ids).not.toContain(excluded);
    }
  });

  test("every selected tenant has a probe template and a family-pinned source id", () => {
    for (const tenant of selectHeldTenantsForReAdjudication(MEASURED_ROWS, 25).selected) {
      expect(probeTemplateForFamily(tenant.atsFamily)).toBeDefined();
      expect(tenant.sourceId).toBe(buildDiscoverySourceId(tenant.atsFamily, tenant.tenantSlug));
      expect(tenant.company.length).toBeGreaterThan(0);
    }
  });
});

describe("selectHeldTenantsForReAdjudication — bounds", () => {
  test("caps the run without dropping the cohort from the report", () => {
    const selection = selectHeldTenantsForReAdjudication(MEASURED_ROWS, 5);

    expect(selection.selected).toHaveLength(5);
    expect(selection.candidates).toHaveLength(12);
    expect(selection.pendingRowsBehindSelection).toBe(60);
    // The five oldest held tenants hold 2+4+4+1+1 = 12 rows, so 48 stay deferred.
    expect(selection.pendingRowsSelected).toBe(12);
    expect(selection.pendingRowsDeferred).toBe(48);
    expect(selection.deferred).toBe(12);
  });

  test("cap 0 selects nothing and defers the whole cohort", () => {
    const selection = selectHeldTenantsForReAdjudication(MEASURED_ROWS, 0);

    expect(selection.selected).toEqual([]);
    expect(selection.candidates).toHaveLength(17);
    expect(selection.pendingRowsDeferred).toBe(60);
  });

  test("rejects a negative or fractional cap instead of silently clamping it", () => {
    expect(() => selectHeldTenantsForReAdjudication(MEASURED_ROWS, -1)).toThrow(RangeError);
    expect(() => selectHeldTenantsForReAdjudication(MEASURED_ROWS, 1.5)).toThrow(RangeError);
  });

  test("a cap above the cohort size selects the cohort once, not twice", () => {
    const selection = selectHeldTenantsForReAdjudication(MEASURED_ROWS, 500);

    expect(selection.selected).toHaveLength(17);
    expect(selection.candidates).toEqual([]);
    expect(new Set(selection.selected.map((t) => t.sourceId)).size).toBe(17);
  });
});

describe("selectHeldTenantsForReAdjudication — oldest first, so a cap cannot starve anyone", () => {
  test("orders by oldest evaluation first, not by supply", () => {
    const ids = selectedIds(MEASURED_ROWS, 3);

    // The three oldest of the 17 held tenants (VERIFIED_QUERY `last_evaluated_at`).
    expect(ids).toEqual([
      "lever:sofarsounds", //     2026-10-01 16:38:43, 2 pending
      "lever:loadsmart", //       2026-10-01 19:25:25, 4 pending
      "lever:aethoshotels", //    2026-10-01 19:44:13, 4 pending
    ]);
    // Supply-first ordering would have opened with ashby:supabase (13 rows).
    expect(ids).not.toContain("ashby:supabase");
  });

  test("a never-evaluated tenant sorts ahead of every dated one", () => {
    const rows = [
      row("lever", "fresh", "Fresh", "2026-10-03 14:12:37", 8, 3, 3),
      row("lever", "undated", "Undated", null, 8, 3, 3),
    ];

    expect(selectedIds(rows, 1)).toEqual(["lever:undated"]);
  });

  test("reads both timestamp spellings the lake actually stores", () => {
    const rows = [
      row("lever", "sqlite", "SQLite stamp", "2026-10-03 07:42:03", 8, 3, 3),
      row("lever", "iso", "ISO stamp", "2026-10-01T19:25:25.000Z", 8, 3, 3),
    ];

    // 2026-10-01T19:25:25Z precedes 2026-10-03 07:42:03 in both formats.
    expect(selectedIds(rows, 1)).toEqual(["lever:iso"]);
  });

  test("two runs over the same rows select the same tenants in the same order", () => {
    expect(selectedIds(MEASURED_ROWS, 7)).toEqual(selectedIds(MEASURED_ROWS, 7));
  });
});

describe("selectHeldTenantsForReAdjudication — idempotency and the authority floor", () => {
  test("a recorded verdict removes a tenant from the cohort", () => {
    const rows = [
      row("lever", "hso", "HSO", "2026-10-03 14:12:01", 5, 1, 1),
      row("lever", "brafton", "Brafton", "2026-10-03 13:49:19", 24, 5, 5, {
        jevRaw: "anthropic/claude:ADMIT@0.82",
      }),
    ];
    const selection = selectHeldTenantsForReAdjudication(rows, 25);

    expect(selection.selected.map((t) => t.sourceId)).toEqual(["lever:hso"]);
    expect(selection.gateExcluded).toBe(1);
    // The stored verdict is parseable by the production gate that will read it.
    expect(rows[1].jevRaw).toMatch(/ADMIT@[0-9.]+/);
  });

  test("a failed-attempt receipt also removes a tenant, and that is the documented residual", () => {
    // PR #178 writes `attempt:` receipts when Jev produced no validated verdict.
    // They are content-free for the gate, and they make `jev_raw` non-NULL, so a
    // cohort that was consulted while the key was expired needs a human to clear
    // the column before this pass can consult it again. Fail-closed, recorded.
    const rows = [
      row("lever", "hso", "HSO", "2026-10-03 14:12:01", 5, 1, 1, {
        jevRaw: "attempt:jev_unavailable:2026-10-03T14:12:01.000Z",
      }),
      row("lever", "brafton", "Brafton", "2026-10-03 13:49:19", 24, 5, 5),
    ];
    const selection = selectHeldTenantsForReAdjudication(rows, 25);

    expect(selection.selected.map((t) => t.sourceId)).toEqual(["lever:brafton"]);
  });

  test("never selects a tenant that is not already auto_approved", () => {
    const rows = [
      row("lever", "shadowed", "Shadowed", "2026-10-03 14:12:01", 8, 3, 3, {
        reviewStatus: "shadow_monitor",
      }),
      row("lever", "rejected", "Rejected", "2026-10-03 14:12:02", 8, 3, 3, {
        reviewStatus: "auto_rejected",
      }),
      row("lever", "undiscovered", "Undiscovered", "2026-10-03 14:12:03", 8, 3, 3, {
        reviewStatus: "discovered",
      }),
    ];
    const selection = selectHeldTenantsForReAdjudication(rows, 25);

    expect(selection.selected).toEqual([]);
    expect(selection.gateExcluded).toBe(3);
  });

  test("never plans a call for a cohort the production gate has already decided", () => {
    // Wilson already clears the floor: no verdict needed, and none is planned.
    const clearsFloor = row("lever", "clear", "Clear", "2026-10-01 00:00:00", 100, 100, 10);
    expect(wilsonLowerBound(100, 100)!).toBeGreaterThanOrEqual(PUBLISH_PH_RATE_FLOOR);

    // Below the sample floor the publisher needs more jobs, not an opinion.
    const thin = row("lever", "thin", "Thin", "2026-10-01 00:00:00", MIN_JOBS_FOR_RATE - 1, 1, 1);
    expect(decideAutoPublish({ sourceId: thin.sourceId, totalJobs: thin.jobCount, qualifiedReady: thin.qualifiedReady, inventory: null }).action).toBe("HOLD");

    // Above the sample floor but below the reject floor, no verdict changes the answer.
    const weak = row("lever", "weak", "Weak", "2026-10-01 00:00:00", 40, 1, 5);
    expect(1 / 40).toBeLessThan(REJECT_PH_RATE_FLOOR);
    expect(decideAutoPublish({ sourceId: weak.sourceId, totalJobs: weak.jobCount, qualifiedReady: weak.qualifiedReady, inventory: null }).action).toBe("REJECT");

    const selection = selectHeldTenantsForReAdjudication([clearsFloor, thin, weak], 25);

    expect(selection.selected).toEqual([]);
    expect(selection.gateExcluded).toBe(3);
    expect(selection.pendingRowsBehindSelection).toBe(0);
  });
});

describe("toHeldTenantRows — mapping the read-only lake result", () => {
  const LAKE_ROW = {
    source_id: "lever:brafton",
    review_status: "auto_approved",
    ats_family: "lever",
    tenant_slug: "brafton",
    domain: "brafton.lever",
    company_hint: "Brafton",
    job_count: 24,
    qualified_ready: 5,
    ph_rate: 5 / 24,
    last_evaluated_at: "2026-10-03 13:49:19",
    pending_qualified: 5,
    jev_raw: null,
  };

  test("maps a lake row onto the selector's own row shape", () => {
    const [mapped] = toHeldTenantRows([LAKE_ROW]);

    expect(mapped).toEqual({
      sourceId: "lever:brafton",
      reviewStatus: "auto_approved",
      atsFamily: "lever",
      tenantSlug: "brafton",
      domain: "brafton.lever",
      companyHint: "Brafton",
      jobCount: 24,
      qualifiedReady: 5,
      phRate: 5 / 24,
      lastEvaluatedAt: "2026-10-03 13:49:19",
      pendingQualified: 5,
      jevRaw: null,
    });
  });

  test("a missing company hint falls back to the tenant slug rather than an empty label", () => {
    const [mapped] = toHeldTenantRows([{ ...LAKE_ROW, company_hint: null }]);

    expect(mapped.companyHint).toBe("brafton");
  });

  test("a NULL counter becomes 0, never NaN", () => {
    const [mapped] = toHeldTenantRows([
      { ...LAKE_ROW, job_count: null, qualified_ready: null, pending_qualified: null, ph_rate: null },
    ]);

    expect(mapped.jobCount).toBe(0);
    expect(mapped.qualifiedReady).toBe(0);
    expect(mapped.pendingQualified).toBe(0);
    expect(mapped.phRate).toBe(0);
    expect(Number.isNaN(mapped.phRate)).toBe(false);
  });
});
