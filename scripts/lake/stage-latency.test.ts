/**
 * Tests for the v6.5 stage-transition latency contract — scripts/lake/stage-latency.test.ts
 *
 * Every case exercises the real module. The governing claims under test are the
 * ones the v6.5 bootloader states and the repository previously had no code for:
 * named stage transitions with p50/p90/p95 and named denominators; pending
 * (right-censored) versus missing (unknown); oldest-ready age; D1 sync/decision
 * is not public visibility; component p95s do not imply an end-to-end p95;
 * cohort separation and expired-before-visible; hold discipline; and no SLO
 * verdict, because no latency target exists in ACCEPTED_PARAMETERS.yaml.
 */

import { describe, expect, it } from "bun:test";

import {
  buildLatencyReceipt,
  checkHoldDiscipline,
  checkObservation,
  formatLatencyReceipt,
  isEndToEndTransition,
  refuseComponentRollup,
  refuseSyncAsVisibility,
  STAGE_LATENCY_VERSION,
  STAGE_TRANSITIONS,
  summarize,
  type LatencyObservation,
  type StageTransition,
} from "./stage-latency";

// Window under test: a complete Asia/Manila day. Reference "now" is 10:00 Manila
// on that day; it is only ever used to age items that are still pending.
const DAY = "2026-10-04";
const NOW = "2026-10-04T02:00:00.000Z"; // 10:00 Asia/Manila
const REPORTED = "2026-10-04T01:00:00.000Z";
const POSTED = "2026-10-03T20:00:00.000Z";
const DEADLINE = "2026-10-10T20:00:00.000Z"; // 7-day window, not expired

/** One fully observed fresh first-publication item; `i` varies the stage times. */
function observed(i: number): LatencyObservation {
  const probeOffset = 120_000 + i * 30_000;
  const qualifyOffset = probeOffset + 150_000 + i * 20_000;
  const decideOffset = qualifyOffset + 900_000;
  const at = (offset: number): string => new Date(Date.parse(REPORTED) + offset).toISOString();
  return {
    identity_hash: `id-${i}`,
    source_id: `wwr-${i % 2 === 0 ? "a" : "b"}`,
    service_class: "OWNER_PH_VA",
    cohort: "FRESH_DISCOVERY",
    terminal_state: "VISIBLE",
    reported_at: REPORTED,
    first_probe_at: at(probeOffset),
    qualified_at: at(qualifyOffset),
    publication_decided_at: at(decideOffset),
    d1_synced_at: at(decideOffset + 60_000),
    public_visible_at: at(qualifyOffset + 1_200_000 + i * 60_000),
    visibility_verified: true,
    first_report_at: REPORTED,
    held_at: null,
    hold_reason: null,
    next_evidence_action: null,
    next_evidence_at: null,
    posted_at: POSTED,
    freshness_deadline_at: DEADLINE,
    failure_stage: null,
    failed_attempts: 0,
  };
}

function cohort(count: number): LatencyObservation[] {
  return Array.from({ length: count }, (_, i) => observed(i));
}

describe("v6.5-LATENCY: stage-latency v1 exposes exactly the five named v6.5 transitions", () => {
  it("names report->probe, probe->qualification, qualification->visibility, report->visibility and hold->next evidence", () => {
    expect(STAGE_TRANSITIONS).toEqual([
      "REPORT_TO_PROBE",
      "PROBE_TO_QUALIFICATION",
      "QUALIFICATION_TO_VISIBILITY",
      "REPORT_TO_VISIBILITY",
      "HOLD_TO_NEXT_EVIDENCE",
    ]);
  });

  it("marks only report->visibility as end-to-end", () => {
    const endToEnd = STAGE_TRANSITIONS.filter(isEndToEndTransition);
    expect(endToEnd).toEqual(["REPORT_TO_VISIBILITY"]);
    for (const transition of STAGE_TRANSITIONS) {
      expect(isEndToEndTransition(transition)).toBe(transition === "REPORT_TO_VISIBILITY");
    }
  });

  it("version-stamps the contract", () => {
    expect(STAGE_LATENCY_VERSION).toBe(1);
  });
});

describe("v6.5-LATENCY: percentiles are nearest-rank and null rather than zero when unreported", () => {
  it("sorts before ranking and reports n with every quantile", () => {
    const summary = summarize([30, 10, 20]);
    expect(summary).not.toBeNull();
    expect(summary!.n).toBe(3);
    expect(summary!.p50).toBe(20);
    expect(summary!.p90).toBe(30);
    expect(summary!.p95).toBe(30);
    expect(summary!.unit).toBe("ms");
  });

  it("reads p95 of one hundred samples as the ninety-fifth sample, not the maximum", () => {
    const summary = summarize(Array.from({ length: 100 }, (_, i) => i + 1));
    expect(summary!.p50).toBe(50);
    expect(summary!.p90).toBe(90);
    expect(summary!.p95).toBe(95);
  });

  it("returns null for an empty sample so an unreported quantile is never read as a fast one", () => {
    expect(summarize([])).toBeNull();
  });
});

describe("v6.5-LATENCY: D1 sync and a publication decision are not public visibility", () => {
  it("refuses a visibility clock with no verified public receipt", () => {
    const item = { ...observed(0), visibility_verified: false };
    const check = checkObservation(item);
    expect(check.accepted).toBe(false);
    expect(check.reasons).toContain("VISIBILITY_WITHOUT_VERIFIED_PUBLIC_RECEIPT");
  });

  it("refuses a visibility clock that precedes the serving-store write", () => {
    const item = {
      ...observed(0),
      public_visible_at: new Date(Date.parse(observed(0).d1_synced_at) - 60_000).toISOString(),
    };
    const check = checkObservation(item);
    expect(check.accepted).toBe(false);
    expect(check.reasons).toContain("VISIBILITY_PRECEDES_SERVING_STORE_WRITE");
  });

  it("refuses a visibility clock that precedes the source posting date", () => {
    const item = { ...observed(0), posted_at: "2026-10-04T01:45:00.000Z" };
    const check = checkObservation(item);
    expect(check.accepted).toBe(false);
    expect(check.reasons).toContain("VISIBILITY_PRECEDES_SOURCE_POSTING_DATE");
  });

  it("names the refusal a caller gets when only a decision or sync clock exists", () => {
    const decidedOnly = {
      ...observed(0),
      public_visible_at: null,
      visibility_verified: false,
      terminal_state: "NOT_VISIBLE" as const,
    };
    expect(checkObservation(decidedOnly).accepted).toBe(true);

    const claimedVisible = { ...decidedOnly, terminal_state: "VISIBLE" as const };
    const refusal = refuseSyncAsVisibility(claimedVisible);
    expect(refusal.refused).toBe(true);
    expect(refusal.reasons).toContain("VISIBLE_WITHOUT_A_PUBLIC_VISIBILITY_CLOCK");
  });

  it("accepts a verified public receipt without refusing it", () => {
    expect(refuseSyncAsVisibility(observed(0)).refused).toBe(false);
  });
});

describe("v6.5-LATENCY: observation admission refuses incoherent clock orderings", () => {
  it("accepts a fully observed, ordered, verified item", () => {
    expect(checkObservation(observed(0))).toEqual({ accepted: true, reasons: [] });
  });

  it("refuses a probe before its report and a qualification before its probe", () => {
    const earlyProbe = checkObservation({ ...observed(0), first_probe_at: "2026-10-04T00:30:00.000Z" });
    expect(earlyProbe.reasons).toContain("PROBE_PRECEDES_REPORT");
    const earlyQual = checkObservation({ ...observed(0), qualified_at: observed(0).reported_at });
    expect(earlyQual.reasons).toContain("QUALIFICATION_PRECEDES_PROBE");
  });

  it("refuses a hold recorded after the item was already visible", () => {
    const item = { ...observed(0), held_at: "2026-10-04T01:59:00.000Z", hold_reason: "needs review", next_evidence_action: "check feed" };
    expect(checkObservation(item).reasons).toContain("HOLD_AFTER_VISIBILITY");
  });

  it("refuses unknown cohort, terminal state and failure stage instead of coercing them", () => {
    const item = {
      ...observed(0),
      cohort: "MADE_UP" as LatencyObservation["cohort"],
      terminal_state: "SORT_OF" as LatencyObservation["terminal_state"],
      failure_stage: "vibe_check" as LatencyObservation["failure_stage"],
    };
    const reasons = checkObservation(item).reasons;
    expect(reasons).toContain("UNKNOWN_COHORT");
    expect(reasons).toContain("UNKNOWN_TERMINAL_STATE");
    expect(reasons).toContain("UNKNOWN_FAILURE_STAGE");
  });

  it("refuses an item with no identity or source", () => {
    const reasons = checkObservation({ ...observed(0), identity_hash: "", source_id: "" }).reasons;
    expect(reasons).toContain("IDENTITY_REQUIRED");
    expect(reasons).toContain("SOURCE_REQUIRED");
  });
});

describe("v6.5-LATENCY: a rediscovery cannot become a new latency origin", () => {
  it("refuses a report clock that differs from the first-report clock", () => {
    const replayed = { ...observed(0), reported_at: "2026-10-04T01:45:00.000Z" };
    const check = checkObservation(replayed);
    expect(check.accepted).toBe(false);
    expect(check.reasons).toContain("REDISCOVERY_REPORT_CANNOT_RESET_LATENCY");
  });

  it("excludes a refused rediscovery from every sample and denominator, and counts it", () => {
    const replayed = { ...observed(0), identity_hash: "id-replay", reported_at: "2026-10-04T01:45:00.000Z" };
    const receipt = buildLatencyReceipt(DAY, [...cohort(3), replayed], { nowTimestamp: NOW });
    const endToEnd = receipt.transitions.find((r) => r.transition === "REPORT_TO_VISIBILITY")!;
    expect(receipt.refused_rediscovery).toBe(1);
    expect(endToEnd.observed).toBe(3);
    expect(endToEnd.denominator).toBe(3);
    expect(receipt.limitations.join(" ")).toContain("non-first report clock");
  });
});

describe("v6.5-LATENCY: hold discipline — a HOLD names missing evidence and a next evidence action", () => {
  const held = {
    ...observed(0),
    terminal_state: "PENDING" as const,
    public_visible_at: null,
    qualified_at: null,
    held_at: "2026-10-04T01:10:00.000Z",
    hold_reason: "PH eligibility unclear from the posting text",
    next_evidence_action: "fetch the ATS location restriction field",
    next_evidence_at: "2026-10-04T01:40:00.000Z",
  };

  it("accepts a hold that names both the missing evidence and the next evidence action", () => {
    expect(checkHoldDiscipline(held)).toEqual({ held: true, valid: true, reasons: [] });
    expect(checkObservation(held).accepted).toBe(true);
  });

  it("reports a hold with no named missing evidence as a defect", () => {
    const result = checkHoldDiscipline({ ...held, hold_reason: "   " });
    expect(result.held).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain("HOLD_MISSING_EVIDENCE_NOT_NAMED");
  });

  it("reports a hold with no next evidence-producing action as a defect", () => {
    const result = checkHoldDiscipline({ ...held, next_evidence_action: null });
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain("HOLD_WITHOUT_NEXT_EVIDENCE_ACTION");
  });

  it("reports both defects when the hold names neither", () => {
    const result = checkHoldDiscipline({ ...held, hold_reason: null, next_evidence_action: null });
    expect(result.reasons).toHaveLength(2);
  });

  it("does not treat an unheld item as a hold", () => {
    expect(checkHoldDiscipline(observed(0))).toEqual({ held: false, valid: true, reasons: [] });
  });

  it("counts the defect and keeps the defective hold out of every sample", () => {
    const defective = { ...held, hold_reason: null, next_evidence_action: null };
    const receipt = buildLatencyReceipt(DAY, [...cohort(2), defective], { nowTimestamp: NOW });
    expect(receipt.hold_discipline_defects).toBe(1);
    expect(receipt.refused_inconsistent).toBe(1);
    const holdRow = receipt.transitions.find((r) => r.transition === "HOLD_TO_NEXT_EVIDENCE")!;
    expect(holdRow.summary).toBeNull();
    expect(receipt.limitations.join(" ")).toContain("hold-discipline defect");
  });
});

describe("v6.5-LATENCY: component percentiles never become an end-to-end percentile", () => {
  it("refuses to derive report->visibility from component percentiles and names the required basis", () => {
    const components = {
      REPORT_TO_PROBE: summarize([120_000, 180_000]),
      PROBE_TO_QUALIFICATION: summarize([180_000, 240_000]),
      QUALIFICATION_TO_VISIBILITY: summarize([1_500_000, 1_560_000]),
    };
    const rollup = refuseComponentRollup("REPORT_TO_VISIBILITY", components);
    expect(rollup.usable).toBe(false);
    expect(rollup.reason).toContain("component p95s do not imply an end-to-end p95");
    expect(rollup.required_basis).toContain("reported_at");
    expect(rollup.required_basis).toContain("public_visible_at");
    expect(Object.keys(rollup)).not.toContain("p95");
  });

  it("still withholds the end-to-end p95 when the observed cohort is partial", () => {
    const pending = {
      ...observed(9),
      identity_hash: "id-pending",
      terminal_state: "PENDING" as const,
      qualified_at: null,
      publication_decided_at: null,
      d1_synced_at: null,
      public_visible_at: null,
      visibility_verified: false,
    };
    const receipt = buildLatencyReceipt(DAY, [...cohort(3), pending], { nowTimestamp: NOW });
    const endToEnd = receipt.transitions.find((r) => r.transition === "REPORT_TO_VISIBILITY")!;
    expect(endToEnd.end_to_end).toBe(true);
    expect(endToEnd.observed).toBe(3);
    expect(endToEnd.pending).toBe(1);
    expect(endToEnd.denominator).toBe(4);
    expect(endToEnd.coverage_ratio).toBeCloseTo(0.75, 10);
    expect(endToEnd.withheld_reason).toContain("END_TO_END_SAMPLE_IS_PARTIAL");
  });
});

describe("v6.5-LATENCY: measured distributions for a fully observed fresh cohort", () => {
  const receipt = buildLatencyReceipt(DAY, cohort(3), { nowTimestamp: NOW, generatedAt: NOW });

  it("stamps the window, the item count and the contract version", () => {
    expect(receipt.window_manila_day).toBe(DAY);
    expect(receipt.items).toBe(3);
    expect(receipt.contract_version).toBe(STAGE_LATENCY_VERSION);
    expect(receipt.generated_at).toBe(NOW);
  });

  it("reports report->probe at p50/p90/p95 over the observed sample", () => {
    const row = receipt.transitions.find((r) => r.transition === "REPORT_TO_PROBE")!;
    // 120s / 150s / 180s for the three items.
    expect(row.summary).toEqual({ unit: "ms", n: 3, p50: 150_000, p90: 180_000, p95: 180_000 });
    expect(row.observed).toBe(3);
    expect(row.denominator).toBe(3);
    expect(row.coverage_ratio).toBe(1);
    expect(row.withheld_reason).toBeNull();
  });

  it("reports probe->qualification separately from the other components", () => {
    const row = receipt.transitions.find((r) => r.transition === "PROBE_TO_QUALIFICATION")!;
    // 150s / 170s / 190s.
    expect(row.summary).toEqual({ unit: "ms", n: 3, p50: 170_000, p90: 190_000, p95: 190_000 });
    expect(row.end_to_end).toBe(false);
  });

  it("reports qualification->visibility as a component, not the end-to-end value", () => {
    const row = receipt.transitions.find((r) => r.transition === "QUALIFICATION_TO_VISIBILITY")!;
    // 20m / 21m / 22m.
    expect(row.summary).toEqual({ unit: "ms", n: 3, p50: 1_260_000, p90: 1_320_000, p95: 1_320_000 });
    expect(row.end_to_end).toBe(false);
    expect(row.summary!.p95).toBeLessThan(
      receipt.transitions.find((r) => r.transition === "REPORT_TO_VISIBILITY")!.summary!.p95,
    );
  });

  it("reports report->visibility as the only end-to-end distribution", () => {
    const row = receipt.transitions.find((r) => r.transition === "REPORT_TO_VISIBILITY")!;
    // 24m30s / 26m20s / 28m10s.
    expect(row.summary).toEqual({ unit: "ms", n: 3, p50: 1_580_000, p90: 1_690_000, p95: 1_690_000 });
    expect(row.end_to_end).toBe(true);
    expect(row.withheld_reason).toBeNull();
  });

  it("reports no hold->next-evidence distribution for items that were never held", () => {
    const row = receipt.transitions.find((r) => r.transition === "HOLD_TO_NEXT_EVIDENCE")!;
    expect(row.summary).toBeNull();
    expect(row.withheld_reason).toContain("NO_OBSERVED_SAMPLES");
    expect(row.missing).toBe(3);
    expect(row.pending).toBe(0);
  });

  it("refuses to evaluate any SLO, because no latency target is accepted", () => {
    expect(receipt.slo_status).toBe("PROPOSED_UNACCEPTED");
    expect(receipt.limitations.join(" ")).toContain("ACCEPTED_PARAMETERS.yaml");
    expect(Object.keys(receipt)).not.toContain("slo_met");
  });
});

describe("v6.5-LATENCY: pending is right-censored, missing is unknown, and neither is zero", () => {
  const inFlight = {
    ...observed(0),
    identity_hash: "id-inflight",
    terminal_state: "PENDING" as const,
    qualified_at: null,
    publication_decided_at: null,
    d1_synced_at: null,
    public_visible_at: null,
    visibility_verified: false,
  };

  it("ages a started item against the reference time and names the oldest one", () => {
    const receipt = buildLatencyReceipt(DAY, [inFlight], { nowTimestamp: NOW });
    const row = receipt.transitions.find((r) => r.transition === "REPORT_TO_VISIBILITY")!;
    expect(row.pending).toBe(1);
    expect(row.missing).toBe(0);
    expect(row.observed).toBe(0);
    expect(row.summary).toBeNull();
    // Reported 01:00Z, reference 02:00Z.
    expect(row.oldest_pending_ms).toBe(3_600_000);
    expect(row.oldest_pending_identity).toBe("id-inflight");
  });

  it("keeps the oldest pending item by age, not by arrival order", () => {
    const older = {
      ...inFlight,
      identity_hash: "id-older",
      reported_at: "2026-10-04T00:30:00.000Z",
      first_report_at: "2026-10-04T00:30:00.000Z",
    };
    const receipt = buildLatencyReceipt(DAY, [inFlight, older], { nowTimestamp: NOW });
    const row = receipt.transitions.find((r) => r.transition === "REPORT_TO_VISIBILITY")!;
    expect(row.oldest_pending_identity).toBe("id-older");
    expect(row.oldest_pending_ms).toBe(5_400_000);
  });

  it("calls a started item unknown rather than aged when no reference time is supplied", () => {
    const receipt = buildLatencyReceipt(DAY, [inFlight], { nowTimestamp: null });
    const row = receipt.transitions.find((r) => r.transition === "REPORT_TO_VISIBILITY")!;
    expect(row.pending).toBe(0);
    expect(row.missing).toBe(1);
    expect(row.oldest_pending_ms).toBeNull();
    expect(receipt.limitations.join(" ")).toContain("right-censored");
  });

  it("calls an item with no origin clock missing, not pending", () => {
    const noOrigin = {
      ...inFlight,
      identity_hash: "id-no-origin",
      reported_at: null,
      first_report_at: null,
    };
    const receipt = buildLatencyReceipt(DAY, [noOrigin], { nowTimestamp: NOW });
    const row = receipt.transitions.find((r) => r.transition === "REPORT_TO_VISIBILITY")!;
    expect(row.missing).toBe(1);
    expect(row.pending).toBe(0);
  });
});

describe("v6.5-LATENCY: blocked and failed items appear in the denominator, never in a sample", () => {
  it("counts an authority/permission refusal as blocked for every transition", () => {
    const blocked: LatencyObservation = {
      ...observed(0),
      identity_hash: "id-blocked",
      source_id: "blocked-register-example",
      terminal_state: "BLOCKED",
      reported_at: REPORTED,
      first_probe_at: null,
      qualified_at: null,
      publication_decided_at: null,
      d1_synced_at: null,
      public_visible_at: null,
      visibility_verified: false,
    };
    const receipt = buildLatencyReceipt(DAY, [blocked], { nowTimestamp: NOW });
    for (const transition of STAGE_TRANSITIONS) {
      const row = receipt.transitions.find((r) => r.transition === transition)!;
      expect(row.blocked).toBe(1);
      expect(row.observed).toBe(0);
      expect(row.summary).toBeNull();
      expect(row.coverage_ratio).toBe(0);
    }
  });

  it("counts a technical failure at its pipeline stage", () => {
    const failed: LatencyObservation = {
      ...observed(0),
      identity_hash: "id-failed",
      terminal_state: "FAILED",
      first_probe_at: null,
      qualified_at: null,
      publication_decided_at: null,
      d1_synced_at: null,
      public_visible_at: null,
      visibility_verified: false,
      failure_stage: "fetch",
      failed_attempts: 2,
    };
    const receipt = buildLatencyReceipt(DAY, [failed], { nowTimestamp: NOW });
    expect(receipt.failures).toEqual([{ stage: "fetch", failures: 1 }]);
    const row = receipt.transitions.find((r) => r.transition === "REPORT_TO_PROBE")!;
    expect(row.failed).toBe(1);
    expect(row.observed).toBe(0);
  });

  it("records an unattributed failure under NONE rather than dropping it", () => {
    const failed: LatencyObservation = {
      ...observed(0),
      identity_hash: "id-failed-2",
      terminal_state: "FAILED",
      failure_stage: null,
      failed_attempts: 1,
    };
    const receipt = buildLatencyReceipt(DAY, [failed], { nowTimestamp: NOW });
    expect(receipt.failures).toEqual([{ stage: "NONE", failures: 1 }]);
  });

  it("keeps the named denominator equal to observed + pending + blocked + failed + missing", () => {
    const blocked: LatencyObservation = {
      ...observed(0),
      identity_hash: "id-blocked-2",
      terminal_state: "BLOCKED",
      public_visible_at: null,
      visibility_verified: false,
    };
    const failed: LatencyObservation = {
      ...observed(0),
      identity_hash: "id-failed-3",
      terminal_state: "FAILED",
      public_visible_at: null,
      visibility_verified: false,
      failure_stage: "geo_gate",
      failed_attempts: 1,
    };
    const inFlight = {
      ...observed(0),
      identity_hash: "id-inflight-2",
      terminal_state: "PENDING" as const,
      public_visible_at: null,
      visibility_verified: false,
    };
    const receipt = buildLatencyReceipt(DAY, [...cohort(2), blocked, failed, inFlight], { nowTimestamp: NOW });
    for (const row of receipt.transitions) {
      expect(row.denominator).toBe(row.observed + row.pending + row.blocked + row.failed + row.missing);
      expect(row.denominator).toBe(5);
    }
  });
});

describe("v6.5-LATENCY: stage dwell uses only directly observed, ordered stage pairs", () => {
  it("sums each stage from the ordered clock pairs actually present", () => {
    const receipt = buildLatencyReceipt(DAY, cohort(3), { nowTimestamp: NOW });
    const fetch = receipt.stage_dwell.find((r) => r.stage === "fetch")!;
    // report -> probe is 120s / 150s / 180s.
    expect(fetch.observations).toBe(3);
    expect(fetch.total_ms).toBe(450_000);
    expect(fetch.mean_ms).toBeCloseTo(150_000, 6);
    expect(fetch.p95_ms).toBe(180_000);

    const publish = receipt.stage_dwell.find((r) => r.stage === "publish")!;
    // publication decision -> D1 sync is a fixed 60s.
    expect(publish.observations).toBe(3);
    expect(publish.total_ms).toBe(180_000);
    expect(publish.p95_ms).toBe(60_000);
  });

  it("contributes nothing for an unknown stage endpoint rather than assuming zero duration", () => {
    const partial = { ...observed(0), qualified_at: null };
    const receipt = buildLatencyReceipt(DAY, [partial], { nowTimestamp: NOW });
    const qualify = receipt.stage_dwell.find((r) => r.stage === "qualify")!;
    expect(qualify.observations).toBe(0);
    expect(qualify.total_ms).toBe(0);
    expect(qualify.mean_ms).toBeNull();
    expect(qualify.p95_ms).toBeNull();
  });

  it("excludes an inverted stage pair instead of reporting a negative dwell", () => {
    const inverted = {
      ...observed(0),
      d1_synced_at: new Date(Date.parse(observed(0).publication_decided_at) - 60_000).toISOString(),
    };
    const receipt = buildLatencyReceipt(DAY, [inverted], { nowTimestamp: NOW });
    expect(receipt.stage_dwell.some((r) => r.stage === "publish" && r.observations > 0)).toBe(false);
  });
});

describe("v6.5-LATENCY: cohort separation — stock, backlog, replay and reactivation are not fresh flow", () => {
  it("counts only verified, unexpired fresh discoveries as fresh first publications", () => {
    const expired = { ...observed(0), identity_hash: "id-expired", freshness_deadline_at: "2026-10-03T21:00:00.000Z" };
    const replayed: LatencyObservation = { ...observed(1), identity_hash: "id-replay", cohort: "REPLAY_RECOVERY" };
    const backlog: LatencyObservation = { ...observed(2), identity_hash: "id-backlog", cohort: "BACKLOG_IMPORT" };
    const reactivated: LatencyObservation = { ...observed(3), identity_hash: "id-reactivation", cohort: "REACTIVATION" };

    const receipt = buildLatencyReceipt(DAY, [...cohort(3), expired, replayed, backlog, reactivated], {
      nowTimestamp: NOW,
    });
    const fresh = receipt.cohorts.find((c) => c.cohort === "FRESH_DISCOVERY")!;
    expect(fresh.observations).toBe(4);
    expect(fresh.visible).toBe(4);
    expect(fresh.fresh_first_publication).toBe(3);

    for (const cohortName of ["REPLAY_RECOVERY", "BACKLOG_IMPORT", "REACTIVATION"] as const) {
      const row = receipt.cohorts.find((c) => c.cohort === cohortName)!;
      expect(row.visible).toBe(1);
      expect(row.fresh_first_publication).toBe(0);
    }
  });

  it("counts a visibility past its freshness deadline as expired-before-visible, never as fresh supply", () => {
    const late = {
      ...observed(0),
      identity_hash: "id-late",
      freshness_deadline_at: "2026-10-04T01:10:00.000Z",
    };
    const receipt = buildLatencyReceipt(DAY, [late], { nowTimestamp: NOW });
    expect(receipt.expired_before_visible).toBe(1);
    expect(receipt.cohorts.find((c) => c.cohort === "FRESH_DISCOVERY")!.fresh_first_publication).toBe(0);
  });

  it("reports an unknown freshness deadline as unknown eligibility, not as a pass", () => {
    const unknown = { ...observed(0), identity_hash: "id-unknown-deadline", freshness_deadline_at: null };
    const receipt = buildLatencyReceipt(DAY, [unknown], { nowTimestamp: NOW });
    expect(receipt.expired_deadline_unknown).toBe(1);
    expect(receipt.expired_before_visible).toBe(0);
    expect(receipt.limitations.join(" ")).toContain("unknown freshness deadline");
  });

  it("does not require an unknown posting date to be replaced with a processing time", () => {
    const noDate = { ...observed(0), identity_hash: "id-no-date", posted_at: null };
    expect(checkObservation(noDate).accepted).toBe(true);
    const receipt = buildLatencyReceipt(DAY, [noDate], { nowTimestamp: NOW });
    expect(receipt.transitions.find((r) => r.transition === "REPORT_TO_VISIBILITY")!.observed).toBe(1);
  });
});

describe("v6.5-LATENCY: reporting is deterministic, additive and non-mutating", () => {
  it("does not mutate the observations it aggregates", () => {
    const items = cohort(2);
    const snapshot = JSON.stringify(items);
    buildLatencyReceipt(DAY, items, { nowTimestamp: NOW });
    expect(JSON.stringify(items)).toBe(snapshot);
  });

  it("produces the same receipt for the same inputs", () => {
    const a = buildLatencyReceipt(DAY, cohort(3), { nowTimestamp: NOW });
    const b = buildLatencyReceipt(DAY, cohort(3), { nowTimestamp: NOW });
    expect(a).toEqual(b);
  });

  it("reports every transition, the expired counters and the limitations in the text form", () => {
    const text = formatLatencyReceipt(buildLatencyReceipt(DAY, cohort(2), { nowTimestamp: NOW }));
    for (const transition of STAGE_TRANSITIONS) {
      expect(text).toContain(transition);
    }
    expect(text).toContain("end-to-end");
    expect(text).toContain("denominator=");
    expect(text).toContain("expired_before_visible=0");
    expect(text).toContain("ACCEPTED_PARAMETERS.yaml");
  });

  it("names the hold->next-evidence distribution when a hold resolved", () => {
    const held: LatencyObservation = {
      ...observed(0),
      identity_hash: "id-held",
      terminal_state: "VISIBLE",
      held_at: "2026-10-04T01:10:00.000Z",
      hold_reason: "PH eligibility unclear from the posting text",
      next_evidence_action: "fetch the ATS location restriction field",
      next_evidence_at: "2026-10-04T01:20:00.000Z",
    };
    const receipt = buildLatencyReceipt(DAY, [held], { nowTimestamp: NOW });
    const row = receipt.transitions.find((r) => r.transition === "HOLD_TO_NEXT_EVIDENCE")!;
    expect(row.observed).toBe(1);
    expect(row.summary!.p50).toBe(600_000);
    expect(row.summary!.p50).toBeLessThan(
      receipt.transitions.find((r) => r.transition === "REPORT_TO_VISIBILITY")!.summary!.p50,
    );
  });

  it("handles an empty window without inventing a distribution", () => {
    const receipt = buildLatencyReceipt(DAY, [], { nowTimestamp: NOW });
    expect(receipt.items).toBe(0);
    for (const row of receipt.transitions) {
      expect(row.summary).toBeNull();
      expect(row.denominator).toBe(0);
      expect(row.coverage_ratio).toBeNull();
      expect(row.withheld_reason).toContain("NO_OBSERVED_SAMPLES");
    }
    expect(formatLatencyReceipt(receipt)).toContain("no observed samples");
  });
});

describe("v6.5-LATENCY: MATH-13 does not gain a verdict from this module", () => {
  it("exposes no comparison against any latency target", () => {
    const receipt = buildLatencyReceipt(DAY, cohort(1), { nowTimestamp: NOW });
    const keys = [
      ...Object.keys(receipt),
      ...receipt.transitions.flatMap((row) => Object.keys(row)),
    ].map((key) => key.toLowerCase());
    for (const forbidden of ["target", "threshold", "budget_ms", "slo_met", "within_slo", "pass"]) {
      expect(keys.some((key) => key.includes(forbidden))).toBe(false);
    }
    // The receipt states that no target is accepted rather than silently omitting one.
    expect(receipt.limitations.join(" ")).toContain("No latency target exists");
    expect(receipt.slo_status).toBe("PROPOSED_UNACCEPTED");
  });

  it("keeps every transition name stable against the declared list", () => {
    const receipt = buildLatencyReceipt(DAY, cohort(1), { nowTimestamp: NOW });
    const names = receipt.transitions.map((r) => r.transition as StageTransition);
    expect(names).toEqual([...STAGE_TRANSITIONS]);
  });
});