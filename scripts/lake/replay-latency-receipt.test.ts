/**
 * SSAE-06 measurement-contract adoption — one versioned replay-and-latency receipt.
 *
 * Every case exercises real repo code: `replay-latency-receipt.ts` on top of
 * `job-delta-replay.ts` (SSAE-09), `stage-latency.ts` (v6.5 measurement contract),
 * `observation-clocks.ts` (MATH-09/10 clocks), `source-ranker.ts` version deps and
 * `packages/scraper/contentHash.ts`. Fixtures are built by folding real sightings
 * through the real clock layer, so the retained clocks and digests were produced by
 * repo code rather than hand-written. No constant is asserted against another
 * constant, and no fixture is offered as live evidence.
 *
 * Run: bun test scripts/lake/replay-latency-receipt.test.ts
 */

import { describe, expect, test } from "bun:test";

import {
  buildReplayLatencyReceipt,
  findingsBySeverity,
  formatReplayLatencyReceipt,
  receiptDigest,
  REPLAY_LATENCY_RECEIPT_VERSION,
  verifyReceiptDigest,
  type ReplayLatencyReceipt,
} from "./replay-latency-receipt";
import {
  emptyReplayRecord,
  planExactBoundedReplay,
  type ExactReplayCursor,
  type ReplayRecord,
  type RecordCohort,
} from "./job-delta-replay";
import {
  applySighting,
  emptyClocks,
  type JobMaterialFacts,
} from "./observation-clocks";
import { buildLatencyReceipt, type LatencyObservation } from "./stage-latency";
import { CURRENT_VERSIONS, type VersionDeps } from "./source-ranker";

// Reference clock: one complete Asia/Manila day under test, 10:00 Manila.
const NOW = new Date("2026-10-04T02:00:00.000Z");
const NOW_ISO = NOW.toISOString();
const DAY = "2026-10-04";
const REPORTED = "2026-10-04T01:00:00.000Z";
const POSTED = "2026-10-03T20:00:00.000Z";
const DEADLINE = "2026-10-10T20:00:00.000Z";

function facts(overrides: Partial<JobMaterialFacts> = {}): JobMaterialFacts {
  return {
    title: "Virtual Assistant — Freelance",
    location_raw: "Remote (Philippines)",
    remote: "remote",
    description_digest: "desc-1",
    apply_url: "https://example.test/jobs/1",
    posted_at: "2026-10-01T00:00:00.000Z",
    safety: "clear",
    ...overrides,
  };
}

const CLEAN_VERSIONS: VersionDeps = { ...CURRENT_VERSIONS };

interface RecordOptions {
  identity?: string;
  cohort?: RecordCohort;
  retained?: JobMaterialFacts | null;
  observed?: JobMaterialFacts | null;
  decision_versions?: VersionDeps | null;
  opt_out?: boolean;
}

/** One canonical job built by folding a permitted sighting through the clock layer. */
function record(options: RecordOptions = {}): ReplayRecord {
  const identity = options.identity ?? "id-1";
  const built = emptyReplayRecord(identity, options.cohort ?? "PUBLIC");
  built.source_id = `source:${identity}`;
  built.decision_versions =
    options.decision_versions === undefined ? { ...CLEAN_VERSIONS } : options.decision_versions;
  built.source_authority = {
    opt_out: options.opt_out ?? false,
    policy_expiry: null,
    lease_expiry: null,
  };
  const retained = options.retained === undefined ? facts() : options.retained;
  if (retained !== null) {
    const sighting = applySighting(emptyClocks(identity), {
      observed_at: "2026-09-30T00:00:00.000Z",
      identity_hash: identity,
      facts: retained,
    });
    if (!sighting.ok) throw new Error(`fixture sighting failed: ${sighting.errors.join(", ")}`);
    built.clocks = sighting.clocks;
  }
  built.observed_facts = options.observed === undefined ? retained : options.observed;
  return built;
}

/** A fully observed fresh first-publication item; `i` varies the stage times. */
function observed(i: number, overrides: Partial<LatencyObservation> = {}): LatencyObservation {
  const probeOffset = 120_000 + i * 30_000;
  const qualifyOffset = probeOffset + 150_000 + i * 20_000;
  const decideOffset = qualifyOffset + 900_000;
  const visibleOffset = qualifyOffset + 1_200_000 + i * 60_000;
  const at = (offset: number): string => new Date(Date.parse(REPORTED) + offset).toISOString();
  return {
    identity_hash: `id-${i}`,
    source_id: `source:id-${i}`,
    service_class: "OWNER_PH_VA",
    cohort: "FRESH_DISCOVERY",
    terminal_state: "VISIBLE",
    reported_at: REPORTED,
    first_probe_at: at(probeOffset),
    qualified_at: at(qualifyOffset),
    publication_decided_at: at(decideOffset),
    d1_synced_at: at(decideOffset + 60_000),
    public_visible_at: at(visibleOffset),
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
    ...overrides,
  };
}

function cohort(count: number, overrides: Partial<LatencyObservation> = {}): LatencyObservation[] {
  return Array.from({ length: count }, (_, i) => observed(i, overrides));
}

interface Scenario {
  records?: ReplayRecord[];
  changed?: string[];
  budget?: number;
  cursor?: ExactReplayCursor | null;
  expected?: readonly string[] | null;
  observations?: LatencyObservation[];
  /** Observations used only to build the aggregate, when they must differ. */
  aggregateFrom?: LatencyObservation[];
  /** Identities reported to the receipt as the replay snapshot's contents. */
  replayIdentities?: readonly string[];
  windowDay?: string;
}

function receiptFor(scenario: Scenario): ReplayLatencyReceipt {
  const observations = scenario.observations ?? cohort(3);
  // By default the replay covers exactly the window's population, so a scenario's
  // population mismatch has to be asked for explicitly.
  const records =
    scenario.records ??
    [...new Set(observations.map((o) => o.identity_hash))]
      .sort()
      .map((identity) => geoAffectingRecord(identity));
  const expected =
    scenario.expected === undefined ? records.map((r) => r.identity_hash) : scenario.expected;
  const plan = planExactBoundedReplay({
    records,
    changed_dependencies: scenario.changed ?? ["GEO"],
    current_versions: CLEAN_VERSIONS,
    now: NOW,
    version_transition: "geo_gate:2026-10-04.1",
    budget: { max_records: scenario.budget ?? 10 },
    cursor: scenario.cursor ?? null,
    expected_identities: expected,
  });
  const latencyReceipt = buildLatencyReceipt(scenario.windowDay ?? DAY, observations, {
    nowTimestamp: NOW_ISO,
    generatedAt: NOW_ISO,
  });
  return buildReplayLatencyReceipt({
    window_manila_day: scenario.windowDay ?? DAY,
    replay_plan: plan,
    replay_identities: scenario.replayIdentities ?? records.map((r) => r.identity_hash),
    expected_identities: expected,
    latency_observations: observations,
    latency_receipt: latencyReceipt,
    now_timestamp: NOW_ISO,
    generated_at: NOW_ISO,
  });
}

/** A GEO change over an unversioned-unchanged record leaves it affected by version keys. */
function geoAffectingRecord(identity: string): ReplayRecord {
  return record({
    identity,
    decision_versions: { ...CLEAN_VERSIONS, geo_gate_version: "geo-gate-2026-09-01.0" },
  });
}

describe("SSAE-06 receipt: one definition bound to three existing ones", () => {
  test("records the three existing contract versions rather than restating them", () => {
    const receipt = receiptFor({});
    expect(receipt.receipt_version).toBe(REPLAY_LATENCY_RECEIPT_VERSION);
    expect(receipt.versions.stage_latency).toBe(1);
    expect(receipt.versions.ssae_09_contract).toBe(1);
    expect(receipt.versions.observation_clocks).toBe(1);
    expect(receipt.versions.replay_latency_receipt).toBe(REPLAY_LATENCY_RECEIPT_VERSION);
  });

  test("is content-addressed and deterministic over identical evidence", () => {
    const a = receiptFor({ records: [geoAffectingRecord("id-0"), geoAffectingRecord("id-1")] });
    const b = receiptFor({ records: [geoAffectingRecord("id-0"), geoAffectingRecord("id-1")] });
    expect(a.digest).toBe(b.digest);
    expect(verifyReceiptDigest(a)).toBe(true);
    expect(verifyReceiptDigest(b)).toBe(true);
  });

  test("a changed window changes the digest, so two truths cannot share an address", () => {
    const a = receiptFor({});
    const b = receiptFor({ windowDay: "2026-10-05" });
    expect(receiptDigest(a)).not.toBe(receiptDigest(b));
    expect(verifyReceiptDigest(b)).toBe(true);
  });

  test("a tampered receipt fails its own digest check", () => {
    const receipt = receiptFor({});
    expect(receipt.evidence_grade).toBe("END_TO_END_MEASURED");
    const tampered: ReplayLatencyReceipt = { ...receipt, evidence_grade: "WITHHELD" };
    expect(verifyReceiptDigest(tampered)).toBe(false);
  });
});

describe("SSAE-06 receipt: clean evidence grades and permits only what it measured", () => {
  test("a complete snapshot over the same population grades END_TO_END_MEASURED", () => {
    const receipt = receiptFor({});
    expect(receipt.coverage.complete).toBe(true);
    expect(receipt.coverage.coverage_unknown).toBe(false);
    expect(receipt.coverage.population).toBe("SAME");
    expect(receipt.coverage.snapshot_proof_reproducible).toBe(true);
    expect(findingsBySeverity(receipt, "high")).toHaveLength(0);
    expect(receipt.evidence_grade).toBe("END_TO_END_MEASURED");
    expect(receipt.latency.aggregate_reproducible).toBe(true);
    expect(receipt.latency.end_to_end_observed).toBeGreaterThan(0);
    expect(receipt.latency.end_to_end_denominator).toBeGreaterThan(0);
  });

  test("it reports the end-to-end distribution it recomputed, with its denominator", () => {
    const receipt = receiptFor({});
    const samples = cohort(3).map((o) => Date.parse(o.public_visible_at!) - Date.parse(o.reported_at!));
    expect(receipt.latency.end_to_end!.n).toBe(samples.length);
    expect(receipt.latency.end_to_end!.p50).toBe(samples[1]);
    expect(receipt.latency.end_to_end!.p95).toBe(samples[samples.length - 1]);
    expect(receipt.latency.end_to_end!.unit).toBe("ms");
  });

  test("it names the definitions, window, cohort and denominator of the permitted claim", () => {
    const receipt = receiptFor({});
    const permitted = receipt.claims_permitted.join(" | ");
    expect(permitted).toContain(`Manila day ${DAY}`);
    expect(permitted).toContain("SAME");
    expect(permitted).toContain(`denominator ${receipt.latency.end_to_end_denominator}`);
    expect(permitted).toContain(receipt.replay.cohort_digest);
  });

  test("it claims no SLO, no cadence and no authority", () => {
    const receipt = receiptFor({});
    expect(receipt.slo_status).toBe("PROPOSED_UNACCEPTED");
    const forbidden = receipt.claims_forbidden.join(" | ");
    expect(forbidden).toContain("does not establish any latency target");
    expect(forbidden).toContain("does not grant, widen or satisfy publication authority");
    expect(forbidden).toContain("does not resolve a MATH or SSAE card");
  });

  test("a replayed cohort's distribution is never reported as fresh flow", () => {
    const receipt = receiptFor({
      observations: cohort(3).map((o) => ({ ...o, cohort: "REPLAY_RECOVERY" as const })),
    });
    expect(receipt.latency.cohorts).toEqual(["REPLAY_RECOVERY"]);
    expect(receipt.latency.end_to_end_observed).toBe(3);
    expect(receipt.latency.fresh_first_publications).toBe(0);
    expect(receipt.claims_forbidden.join(" | ")).toContain(
      "REPLAY_RECOVERY are not fresh flow",
    );
    expect(receipt.claims_forbidden.join(" | ")).toContain("only 0 fresh first-publication(s)");
  });
});

describe("SSAE-06 receipt: coverage is the gate, not a score", () => {
  test("unknown coverage grades UNKNOWN even with end-to-end samples present", () => {
    const receipt = receiptFor({ expected: null });
    expect(receipt.coverage.coverage_unknown).toBe(true);
    expect(receipt.latency.end_to_end_observed).toBeGreaterThan(0);
    expect(receipt.evidence_grade).toBe("UNKNOWN");
    expect(receipt.coverage.population).toBe("UNKNOWN");
    expect(receipt.claims_forbidden.join(" | ")).toContain(
      "no end-to-end latency claim is permitted",
    );
    expect(receipt.claims_permitted.join(" | ")).not.toContain("report-to-verified-visibility");
  });

  test("unknown coverage never permits an absence-derived write", () => {
    const receipt = receiptFor({ expected: null });
    expect(receipt.coverage.absence_derived_actions_permitted).toBe(false);
    expect(receipt.replay.absence_derived_actions_permitted).toBe(false);
    expect(findingsBySeverity(receipt, "high").map((f) => f.code)).toContain("COVERAGE_UNKNOWN");
  });

  test("an incomplete snapshot names the missing identities and blocks a coverage claim", () => {
    const receipt = receiptFor({
      records: [geoAffectingRecord("id-0"), geoAffectingRecord("id-1")],
      expected: ["id-0", "id-1", "id-2"],
    });
    expect(receipt.coverage.complete).toBe(false);
    expect(receipt.coverage.replay_missing_identities).toEqual(["id-2"]);
    expect(receipt.evidence_grade).toBe("PARTIAL");
    expect(receipt.claims_forbidden.join(" | ")).toContain("no replay coverage claim is permitted");
    const finding = findingsBySeverity(receipt, "high").find((f) => f.code === "SNAPSHOT_INCOMPLETE");
    expect(finding?.identities).toEqual(["id-2"]);
    expect(finding?.affected_count).toBe(1);
  });

  test("a coverage proof that does not match its own snapshot is not trusted", () => {
    const receipt = receiptFor({ replayIdentities: ["id-0", "id-1", "id-2", "id-9"] });
    expect(receipt.coverage.snapshot_proof_reproducible).toBe(false);
    expect(receipt.evidence_grade).not.toBe("END_TO_END_MEASURED");
    expect(findingsBySeverity(receipt, "high").map((f) => f.code)).toContain(
      "SNAPSHOT_PROOF_NOT_REPRODUCIBLE",
    );
  });
});

describe("SSAE-06 receipt: the two populations must be the same", () => {
  test("an extra identity in the window is a population disagreement, not a wider sample", () => {
    const receipt = receiptFor({
      records: [geoAffectingRecord("id-0"), geoAffectingRecord("id-1"), geoAffectingRecord("id-2")],
      observations: [...cohort(3), observed(9)],
    });
    expect(receipt.coverage.population).toBe("WINDOW_EXCEEDS_REPLAY");
    expect(receipt.coverage.only_in_window).toEqual(["id-9"]);
    expect(receipt.coverage.only_in_replay).toHaveLength(0);
    expect(receipt.evidence_grade).toBe("PARTIAL");
    expect(findingsBySeverity(receipt, "high").map((f) => f.code)).toContain("POPULATION_DISAGREEMENT");
    expect(receipt.claims_forbidden.join(" | ")).toContain("no replay coverage claim is permitted");
  });

  test("no shared identity is named as disjoint rather than merged into one number", () => {
    const receipt = receiptFor({
      records: [geoAffectingRecord("id-7")],
      observations: cohort(3),
    });
    expect(receipt.coverage.only_in_replay).toEqual(["id-7"]);
    expect(receipt.coverage.only_in_window).toEqual(["id-0", "id-1", "id-2"]);
    expect(receipt.coverage.population).toBe("DISJOINT");
    expect(findingsBySeverity(receipt, "high").map((f) => f.code)).toContain("POPULATION_DISJOINT");
  });
});

describe("SSAE-06 receipt: an aggregate must be reproducible from its observations", () => {
  test("an aggregate built from different observations is refused as evidence", () => {
    const records = [geoAffectingRecord("id-0"), geoAffectingRecord("id-1"), geoAffectingRecord("id-2")];
    const observations = cohort(3);
    const identities = records.map((r) => r.identity_hash);
    const plan = planExactBoundedReplay({
      records,
      changed_dependencies: ["GEO"],
      current_versions: CLEAN_VERSIONS,
      now: NOW,
      version_transition: "geo_gate:2026-10-04.1",
      budget: { max_records: 10 },
      cursor: null,
      expected_identities: identities,
    });
    const receipt = buildReplayLatencyReceipt({
      window_manila_day: DAY,
      replay_plan: plan,
      replay_identities: identities,
      expected_identities: identities,
      latency_observations: observations,
      // Aggregated over a different, much faster cohort than the observations supplied.
      latency_receipt: buildLatencyReceipt(DAY, cohort(6, { identity_hash: "other" }), {
        nowTimestamp: NOW_ISO,
        generatedAt: NOW_ISO,
      }),
      now_timestamp: NOW_ISO,
      generated_at: NOW_ISO,
    });
    expect(receipt.coverage.population).toBe("SAME");
    expect(receipt.latency.aggregate_reproducible).toBe(false);
    expect(receipt.evidence_grade).toBe("PARTIAL");
    expect(findingsBySeverity(receipt, "high").map((f) => f.code)).toContain(
      "LATENCY_AGGREGATE_NOT_REPRODUCIBLE",
    );
    expect(receipt.claims_permitted.join(" | ")).not.toContain("report-to-verified-visibility");
  });

  test("no end-to-end sample withholds the distribution instead of reporting zero", () => {
    const receipt = receiptFor({
      observations: cohort(3).map((o) => ({
        ...o,
        terminal_state: "PENDING" as const,
        public_visible_at: null,
        visibility_verified: false,
      })),
    });
    expect(receipt.latency.end_to_end).toBeNull();
    expect(receipt.latency.end_to_end_observed).toBe(0);
    expect(receipt.evidence_grade).toBe("WITHHELD");
    expect(findingsBySeverity(receipt, "medium").map((f) => f.code)).toContain(
      "END_TO_END_UNMEASURED",
    );
    expect(formatReplayLatencyReceipt(receipt)).toContain("WITHHELD (no sample)");
  });

  test("component timings are not summed into an end-to-end number", () => {
    const receipt = receiptFor({
      observations: cohort(3).map((o) => ({
        ...o,
        public_visible_at: null,
        visibility_verified: false,
        terminal_state: "NOT_VISIBLE" as const,
      })),
    });
    // Probe and qualification were both observed, yet nothing end-to-end exists.
    expect(receipt.latency.items).toBeGreaterThan(0);
    expect(receipt.latency.end_to_end).toBeNull();
    expect(receipt.evidence_grade).toBe("WITHHELD");
  });
});

describe("SSAE-06 receipt: publication is never inferred from a store write", () => {
  test("a D1 sync with no verified visibility is surfaced and refused as publication", () => {
    const receipt = receiptFor({
      observations: [
        observed(0, {
          terminal_state: "NOT_VISIBLE" as const,
          public_visible_at: null,
          visibility_verified: false,
        }),
      ],
    });
    expect(receipt.latency.d1_synced_not_visible).toBe(1);
    expect(findingsBySeverity(receipt, "info").map((f) => f.code)).toContain(
      "SERVING_STORE_WRITE_NOT_VISIBILITY",
    );
    expect(receipt.claims_forbidden.join(" | ")).toContain(
      "a serving-store write is not public visibility",
    );
  });

  test("a fully verified visible item is not counted as a sync-without-visibility", () => {
    const receipt = receiptFor({});
    expect(receipt.latency.d1_synced_not_visible).toBe(0);
  });

  test("a re-report that would reset freshness is refused and named", () => {
    const receipt = receiptFor({
      observations: cohort(3).map((o, i) =>
        i === 1 ? { ...o, first_report_at: new Date(Date.parse(REPORTED) - 86_400_000).toISOString() } : o,
      ),
    });
    expect(receipt.latency.freshness_reset_attempts).toBe(1);
    expect(receipt.latency.freshness_reset_identities).toEqual(["id-1"]);
    expect(receipt.latency.refused_rediscovery).toBe(1);
    expect(findingsBySeverity(receipt, "high").map((f) => f.code)).toContain(
      "FRESHNESS_RESET_ATTEMPT",
    );
    expect(receipt.claims_forbidden.join(" | ")).toContain(
      "must not be reported as a new first-report latency",
    );
  });

  test("expired-before-visible items are reported as inventory, never as flow", () => {
    const receipt = receiptFor({
      observations: cohort(3).map((o) => ({
        ...o,
        freshness_deadline_at: "2026-10-02T00:00:00.000Z",
      })),
    });
    expect(receipt.latency.expired_before_visible).toBe(3);
    expect(findingsBySeverity(receipt, "medium").map((f) => f.code)).toContain(
      "EXPIRED_BEFORE_VISIBLE",
    );
    expect(receipt.claims_forbidden.join(" | ")).toContain("are inventory, never fresh flow");
  });

  test("an unknown freshness deadline stays unknown rather than passing", () => {
    const receipt = receiptFor({
      observations: cohort(3).map((o) => ({ ...o, freshness_deadline_at: null })),
    });
    expect(receipt.latency.expired_deadline_unknown).toBe(3);
    expect(findingsBySeverity(receipt, "medium").map((f) => f.code)).toContain(
      "FRESHNESS_DEADLINE_UNKNOWN",
    );
  });
});

describe("SSAE-06 receipt: holds carry their gap and a route to resolution", () => {
  test("a bounded hold names its field gap and is reported as a hold", () => {
    const receipt = receiptFor({
      records: [
        record({
          identity: "id-0",
          retained: facts(),
          observed: facts({ location_raw: null }),
          decision_versions: { ...CLEAN_VERSIONS, geo_gate_version: "geo-gate-2026-09-01.0" },
        }),
      ],
    });
    expect(receipt.holds.replay_holds).toBe(1);
    expect(receipt.holds.named_gaps).toEqual(["location_raw"]);
    expect(receipt.holds.gaps_taken_from_closure).toBe(false);
    expect(receipt.claims_permitted.join(" | ")).toContain("held for missing evidence on");
  });

  test("a closure-wide invalidation keeps the field scope from the closure and marks it", () => {
    const receipt = receiptFor({ changed: ["PARSER"] });
    expect(receipt.holds.replay_holds).toBeGreaterThan(0);
    expect(receipt.holds.named_gaps).toHaveLength(7);
    expect(receipt.holds.gaps_taken_from_closure).toBe(true);
    expect(findingsBySeverity(receipt, "high")).toHaveLength(0);
  });

  test("a held record absent from the window is named instead of silently ignored", () => {
    const receipt = receiptFor({
      records: [
        record({
          identity: "id-3",
          retained: facts(),
          observed: facts({ location_raw: null }),
          decision_versions: { ...CLEAN_VERSIONS, geo_gate_version: "geo-gate-2026-09-01.0" },
        }),
      ],
      observations: cohort(3),
    });
    expect(receipt.holds.replay_holds).toBe(1);
    expect(receipt.holds.holds_in_window).toBe(0);
    expect(receipt.holds.holds_absent_from_window).toEqual(["id-3"]);
    expect(findingsBySeverity(receipt, "medium").map((f) => f.code)).toContain(
      "REPLAY_HOLD_NOT_IN_WINDOW",
    );
  });

  test("a held record measured with no next evidence action is a high-severity defect", () => {
    const receipt = receiptFor({
      records: [
        record({
          identity: "id-0",
          retained: facts(),
          observed: facts({ location_raw: null }),
          decision_versions: { ...CLEAN_VERSIONS, geo_gate_version: "geo-gate-2026-09-01.0" },
        }),
      ],
      observations: [
        observed(0, {
          held_at: new Date(Date.parse(REPORTED) + 60_000).toISOString(),
          hold_reason: null,
          next_evidence_action: null,
          next_evidence_at: null,
          terminal_state: "PENDING" as const,
          public_visible_at: null,
          visibility_verified: false,
        }),
      ],
    });
    expect(receipt.holds.holds_in_window).toBe(1);
    expect(receipt.holds.holds_without_next_action).toEqual(["id-0"]);
    expect(findingsBySeverity(receipt, "high").map((f) => f.code)).toContain(
      "REPLAY_HOLD_WITHOUT_NEXT_EVIDENCE_ACTION",
    );
  });

  test("a held record with a named gap and a next action is measured, not flagged", () => {
    const heldAt = new Date(Date.parse(REPORTED) + 60_000).toISOString();
    const receipt = receiptFor({
      records: [
        record({
          identity: "id-0",
          retained: facts(),
          observed: facts({ location_raw: null }),
          decision_versions: { ...CLEAN_VERSIONS, geo_gate_version: "geo-gate-2026-09-01.0" },
        }),
      ],
      observations: [
        observed(1, {
          held_at: heldAt,
          hold_reason: "geo gate needs the tenant's country list for this posting",
          next_evidence_action: "re-fetch the posting's location field under the current geo gate",
          next_evidence_at: new Date(Date.parse(REPORTED) + 600_000).toISOString(),
          terminal_state: "PENDING" as const,
          public_visible_at: null,
          visibility_verified: false,
        }),
      ],
    });
    expect(receipt.holds.holds_without_next_action).toHaveLength(0);
    expect(receipt.holds.replay_holds).toBe(1);
    expect(receipt.latency.accepted).toBe(1);
    expect(receipt.latency.end_to_end_observed).toBe(0);
  });
});

describe("SSAE-06 receipt: a plan that refuses itself cannot support a claim", () => {
  test("zero budget refuses the plan and forbids a replay coverage claim", () => {
    const receipt = receiptFor({ records: [geoAffectingRecord("id-0"), geoAffectingRecord("id-1")], budget: 0 });
    expect(receipt.replay.permitted).toBe(false);
    expect(findingsBySeverity(receipt, "medium").map((f) => f.code)).toContain(
      "REPLAY_NOT_PERMITTED",
    );
    expect(receipt.claims_forbidden.join(" | ")).toContain("no replay coverage claim is permitted");
  });

  test("an open cursor with an empty batch is named rather than treated as complete", () => {
    const receipt = receiptFor({ records: [geoAffectingRecord("id-0"), geoAffectingRecord("id-1")], budget: 0 });
    expect(receipt.replay.batch_size).toBe(0);
    expect(receipt.replay.complete).toBe(false);
    expect(receipt.replay.cursor_open_without_remaining_batch).toBe(true);
    expect(findingsBySeverity(receipt, "medium").map((f) => f.code)).toContain(
      "CURSOR_OPEN_WITH_EMPTY_BATCH",
    );
  });

  test("a resumable cursor is carried into the receipt with its position and total", () => {
    const records = [geoAffectingRecord("id-0"), geoAffectingRecord("id-1"), geoAffectingRecord("id-2")];
    const first = planExactBoundedReplay({
      records,
      changed_dependencies: ["GEO"],
      current_versions: CLEAN_VERSIONS,
      now: NOW,
      version_transition: "geo_gate:2026-10-04.1",
      budget: { max_records: 2 },
      cursor: null,
      expected_identities: records.map((r) => r.identity_hash),
    });
    expect(first.next_cursor).not.toBeNull();
    const receipt = buildReplayLatencyReceipt({
      window_manila_day: DAY,
      replay_plan: first,
      replay_identities: records.map((r) => r.identity_hash),
      expected_identities: records.map((r) => r.identity_hash),
      latency_observations: cohort(3),
      latency_receipt: buildLatencyReceipt(DAY, cohort(3), { nowTimestamp: NOW_ISO, generatedAt: NOW_ISO }),
      now_timestamp: NOW_ISO,
      generated_at: NOW_ISO,
    });
    expect(receipt.replay.complete).toBe(false);
    expect(receipt.replay.cursor_position).toBe(2);
    expect(receipt.replay.cursor_total).toBe(3);
    expect(receipt.replay.cursor_id).toBe(first.next_cursor!.cursor_id);
    expect(receipt.replay.cursor_open_without_remaining_batch).toBe(false);
    expect(findingsBySeverity(receipt, "medium").map((f) => f.code)).not.toContain(
      "CURSOR_OPEN_WITH_EMPTY_BATCH",
    );
  });
});

describe("SSAE-06 receipt: rendering never prints a withheld number", () => {
  test("renders the versions, population, grade, findings and digest", () => {
    const receipt = receiptFor({});
    const text = formatReplayLatencyReceipt(receipt);
    expect(text).toContain(`replay-latency receipt v${REPLAY_LATENCY_RECEIPT_VERSION}`);
    expect(text).toContain(`population=SAME`);
    expect(text).toContain(`grade: ${receipt.evidence_grade}`);
    expect(text).toContain("slo_status: PROPOSED_UNACCEPTED");
    expect(text).toContain(`digest: ${receipt.digest}`);
    expect(text).toContain("p95=");
  });

  test("renders identity lists only through the finding counts it actually measured", () => {
    const receipt = receiptFor({
      records: [geoAffectingRecord("id-0"), geoAffectingRecord("id-1"), geoAffectingRecord("id-2")],
      observations: [...cohort(3), observed(9)],
    });
    const text = formatReplayLatencyReceipt(receipt);
    const finding = findingsBySeverity(receipt, "high").find((f) => f.code === "POPULATION_DISAGREEMENT");
    expect(finding?.identities).toEqual(["id-9"]);
    expect(text).toContain("[high] POPULATION_DISAGREEMENT (1 identity/identities)");
  });
});
