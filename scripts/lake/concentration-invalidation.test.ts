/**
 * SSAE-02 §5 "Concentration check replay" — the CEILING dimension, as executable
 * characterization. Labels: `MATH-08:` (concentration / correlated source risk)
 * and `MATH-10:` (change detection and cache invalidation).
 *
 * Three existing suites each cover one half of this row and none joins them:
 *
 * - `scripts/lake/ssae-02-replay-coverage.test.ts` F-RC-3 shows the ceiling is
 *   UNKNOWN without a persisted inventory snapshot, and that the gate is inert
 *   below `MIN_INVENTORY_FOR_CONCENTRATION`.
 * - `scripts/lake/decision-field-sensitivity.test.ts` F-DS-2 shows that all eight
 *   policy constants `decideAutoPublish` reads are covered by the binding digest,
 *   in both a tightening and a loosening direction — but it reaches that verdict
 *   by calling `classifyBindingDrift` on two bindings the *test* builds by hand.
 * - `scripts/lake/processing-modes.test.ts` and `session 2`'s SSAE-07 ladder tests
 *   key the POLICY dependency off the `policy_version` *string*.
 *
 * None of them asks the question the two share ceilings actually raise: **what
 * happens to a stored decision and a cached cohort when a share ceiling moves?**
 * The ceilings are read live from `scripts/ci/constitution-metrics.ts` at call
 * time, so they can move without any version label, any registry row or any
 * writer changing. This file runs all three systems over one cohort shape and
 * measures the answer.
 *
 * Honesty statement, read before citing anything here:
 *
 * - Test-only. No writer, gateway, network, database or clock import. No gate,
 *   threshold, accepted parameter, enum or publication path is added, and no
 *   ceiling is proposed, raised or lowered. Every ceiling is read live from its
 *   owning module and each expected value is derived from that live constant, so
 *   a future ceiling move invalidates the expectations instead of silently
 *   passing them.
 * - Every record is a synthetic fixture. No D1, lake, runtime or deployment
 *   evidence is claimed; all runtime invalidation and replay rates are UNKNOWN.
 * - Findings (F-CI-*) state reproducible CURRENT behaviour with the consequence
 *   named. F-CI-2 and F-CI-3 were characterized here and are now fixed in
 *   `scripts/lake/publish-hold-resolution.ts`, so their cases below are closure
 *   tests over the same fixtures; every other finding still states open current
 *   behaviour and needs its own authorized unit. None of these findings was ever
 *   production behaviour — no writer imports that module.
 * - SSAE-02 stays PROPOSED. Nothing here accepts SSAE-02, MATH-08 or MATH-10.
 */

import { describe, expect, it } from "bun:test";

import {
  concentrationAllowance,
  decideAutoPublish,
  MIN_INVENTORY_FOR_CONCENTRATION,
  type AutoPublishInput,
  type InventorySnapshot,
} from "./auto-publish-policy";

import {
  bindDecisionInputs,
  classifyBindingDrift,
  classifyDecisionReuse,
  currentPolicyBinding,
  deriveHoldResolution,
  describeConcentrationCeiling,
  describeConcentrationRelief,
  policyBindingDigest,
  type BoundDecision,
} from "./publish-hold-resolution";

import {
  TOP_PROVIDER_FAMILY_SHARE_MAX,
  TOP_SOURCE_SHARE_MAX,
  providerFamily,
} from "../ci/constitution-metrics";

import { CURRENT_VERSIONS, selectProcessingMode, type SourceMemoryRecord } from "./source-ranker";

// ─── Fixtures: one provider family holding two of the exact-six feeds ─────────
//
// `providerFamily` is the text before the first ":", so "jobicy:ph" and
// "jobicy:sg" share a family and each is separately a source. Every snapshot below
// satisfies sum(bySource.count) === activeTotal, which `concentrationAllowance`
// does not itself check (F-CI-4).

const COHORT: Omit<AutoPublishInput, "inventory"> = {
  sourceId: "jobicy:ph",
  // 40 of 100: the Wilson lower bound is 0.3094, above the 0.2 publish floor, so
  // the cohort reaches the concentration gate with no advisory input at all.
  totalJobs: 100,
  qualifiedReady: 40,
  jevChoice: null,
  jevConfidence: null,
};

/** Family well under both ceilings; the whole cohort publishes. */
const ROOMY: InventorySnapshot = {
  activeTotal: 400,
  bySource: [
    { sourceId: "jobicy:ph", count: 60 },
    { sourceId: "jobicy:sg", count: 40 },
    { sourceId: "we-work-remotely", count: 200 },
    { sourceId: "remotive", count: 100 },
  ],
};

/** The decision's own source sits exactly on `TOP_SOURCE_SHARE_MAX`. */
const SOURCE_AT_CEILING: InventorySnapshot = {
  activeTotal: 400,
  bySource: [
    { sourceId: "jobicy:ph", count: 100 },
    { sourceId: "jobicy:sg", count: 40 },
    { sourceId: "we-work-remotely", count: 201 },
    { sourceId: "remotive", count: 59 },
  ],
};

/** One row below the source ceiling. */
const ONE_BELOW_SOURCE_CEILING: InventorySnapshot = {
  activeTotal: 400,
  bySource: [
    { sourceId: "jobicy:ph", count: 99 },
    { sourceId: "jobicy:sg", count: 40 },
    { sourceId: "we-work-remotely", count: 201 },
    { sourceId: "remotive", count: 60 },
  ],
};

/** The family sits exactly on `TOP_PROVIDER_FAMILY_SHARE_MAX` while its own source is not at its ceiling. */
const FAMILY_AT_CEILING: InventorySnapshot = {
  activeTotal: 400,
  bySource: [
    { sourceId: "jobicy:ph", count: 50 },
    { sourceId: "jobicy:sg", count: 110 },
    { sourceId: "we-work-remotely", count: 180 },
    { sourceId: "remotive", count: 60 },
  ],
};

function withInput(inventory: InventorySnapshot | null): AutoPublishInput {
  return { ...COHORT, inventory };
}

/** No family over its ceiling anywhere: the same `binding: NONE` as ROOMY, no pressure. */
const UNPRESSURED: InventorySnapshot = {
  activeTotal: 400,
  bySource: [
    { sourceId: "jobicy:ph", count: 60 },
    { sourceId: "jobicy:sg", count: 40 },
    { sourceId: "we-work-remotely", count: 150 },
    { sourceId: "remotive", count: 150 },
  ],
};

/** The leading family sits exactly on `TOP_PROVIDER_FAMILY_SHARE_MAX`: 400 of 1000. */
const FAMILY_EXACTLY_AT_CEILING: InventorySnapshot = {
  activeTotal: 1000,
  bySource: [
    { sourceId: "jobicy:ph", count: 150 },
    { sourceId: "jobicy:sg", count: 150 },
    { sourceId: "we-work-remotely", count: 400 },
    { sourceId: "remotive", count: 300 },
  ],
};

/** One row more than the fixture above: the same board with real pressure. */
const FAMILY_ONE_ROW_OVER_CEILING: InventorySnapshot = {
  activeTotal: 1000,
  bySource: [
    { sourceId: "jobicy:ph", count: 150 },
    { sourceId: "jobicy:sg", count: 150 },
    { sourceId: "we-work-remotely", count: 401 },
    { sourceId: "remotive", count: 299 },
  ],
};

/** The cohort's OWN family is the one over its ceiling, so it is blocked, not relieved. */
const OWN_FAMILY_OVER_CEILING: InventorySnapshot = {
  activeTotal: 400,
  bySource: [
    { sourceId: "jobicy:ph", count: 90 },
    { sourceId: "jobicy:sg", count: 90 },
    { sourceId: "we-work-remotely", count: 170 },
    { sourceId: "remotive", count: 50 },
  ],
};

/** Below `MIN_INVENTORY_FOR_CONCENTRATION`: both ceilings are inert. */
const YOUNG_BOARD: InventorySnapshot = {
  activeTotal: 99,
  bySource: [{ sourceId: "jobicy:ph", count: 99 }],
};

const SINGLE_ROW_BOARD: InventorySnapshot = {
  activeTotal: 400,
  bySource: [{ sourceId: "jobicy:ph", count: 400 }],
};

function bound(input: AutoPublishInput): BoundDecision {
  return { binding: bindDecisionInputs(input), decision: decideAutoPublish(input) };
}

/** The parts of a decision the reuse verdict compares. */
function outcome(input: AutoPublishInput): string {
  const decision = decideAutoPublish(input);
  return `${decision.action}/${decision.publishCount}/${String(decision.wilsonLower)}/${decision.concentration}`;
}

/**
 * A source-memory record with every version, expiry and replay-coverage field in
 * its compatible state. Shape copied from the fixture in
 * `scripts/lake/decision-field-sensitivity.test.ts`, which is not exported.
 */
function sourceRecord(): SourceMemoryRecord {
  return {
    source_id: COHORT.sourceId,
    provider_id: "Jobicy",
    declared_capability: "rss_xml",
    endpoint_url: "https://example.com/feed",
    payload_kind: "xml",
    selected_processor: "rss_xml",
    routing_warnings: [],
    fetch_state: {
      etag: 'W/"abc"',
      last_modified: "Sat, 03 Oct 2026 00:00:00 GMT",
      last_body_hash: "body-1",
      last_fetch_at: "2026-10-04T01:00:00.000Z",
      last_fetch_ok: true,
      consecutive_failures: 0,
      backoff_until: null,
    },
    lake_state: {
      last_raw_observation_id: 10,
      last_candidate_count: 40,
      last_qualified_ready: 12,
      last_ingestion_at: "2026-10-04T01:00:00.000Z",
      last_sighting_at: "2026-10-04T01:00:00.000Z",
    },
    publication_state: {
      compliance_state: "allowed",
      operational_state: "active",
      policy_expiry: "2026-12-01T00:00:00.000Z",
      opt_out: false,
      lease_expiry: "2026-12-01T00:00:00.000Z",
      last_decision: "ADMIT",
      last_decision_at: "2026-10-04T01:00:00.000Z",
      last_publication_at: "2026-10-04T01:00:00.000Z",
      last_publication_count: 3,
      last_publication_mode: "unlimited",
      concentration_status: "OK",
    },
    health_rollup: {
      recent_success_rate: 0.98,
      recent_ph_rate: 0.6,
      recent_false_ph_rate: 0,
      last_quality_check_at: "2026-10-04T01:00:00.000Z",
      robots_last_checked_at: "2026-10-04T01:00:00.000Z",
      robots_allows: true,
    } as SourceMemoryRecord["health_rollup"],
    version_deps: { ...CURRENT_VERSIONS },
    retention: {
      raw_observation_ttl_days: 30,
      candidate_ttl_days: 30,
      sighting_ttl_days: 90,
      fetch_state_ttl_days: 7,
      publication_receipt_ttl_days: 365,
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
      content_hash: "body-1",
      description_hash: null,
      policy_hash: "pol-1",
    },
  };
}

// ─── The ceilings are load-bearing, and each blocks independently ─────────────

describe("MATH-08: both share ceilings bind, and one row of inventory flips them", () => {
  it("the source ceiling alone blocks, at exactly `TOP_SOURCE_SHARE_MAX` of the live inventory", () => {
    const room = concentrationAllowance(COHORT.sourceId, COHORT.qualifiedReady, SOURCE_AT_CEILING);
    expect(room).toEqual({ allowed: 0, concentration: "BLOCKED" });

    // The break-even is derived from the live constant, so the expectation moves
    // with the ceiling instead of pinning today's number.
    const breakEvenCount = TOP_SOURCE_SHARE_MAX * SOURCE_AT_CEILING.activeTotal;
    expect(SOURCE_AT_CEILING.bySource.find((row) => row.sourceId === COHORT.sourceId)?.count).toBe(breakEvenCount);

    // One row below the ceiling the same cohort publishes one row instead of
    // forty: the gate is a hard cap, not a nudge.
    const below = concentrationAllowance(COHORT.sourceId, COHORT.qualifiedReady, ONE_BELOW_SOURCE_CEILING);
    expect(below.allowed).toBe(1);
    expect(below.allowed).toBeLessThan(COHORT.qualifiedReady);
  });

  it("the family ceiling blocks on its own, with the source nowhere near its own ceiling", () => {
    const familyCeilingCount = TOP_PROVIDER_FAMILY_SHARE_MAX * FAMILY_AT_CEILING.activeTotal;
    const familyNow = FAMILY_AT_CEILING.bySource
      .filter((row) => providerFamily(row.sourceId) === providerFamily(COHORT.sourceId))
      .reduce((sum, row) => sum + row.count, 0);
    expect(familyNow).toBe(familyCeilingCount);

    const sourceNow = FAMILY_AT_CEILING.bySource.find((row) => row.sourceId === COHORT.sourceId)?.count ?? 0;
    expect(sourceNow).toBeLessThan(TOP_SOURCE_SHARE_MAX * FAMILY_AT_CEILING.activeTotal);

    const room = concentrationAllowance(COHORT.sourceId, COHORT.qualifiedReady, FAMILY_AT_CEILING);
    expect(room).toEqual({ allowed: 0, concentration: "BLOCKED" });
  });

  it("a roomy board publishes the cohort and records the relief", () => {
    expect(decideAutoPublish(withInput(ROOMY)).action).toBe("PUBLISH");
    const decision = decideAutoPublish(withInput(ROOMY));
    expect(decision.publishCount).toBe(COHORT.qualifiedReady);
    expect(decision.concentration).toBe("RELIEVES");
  });

  it("the ceiling is applied to the whole board after publication, so the label is measured, not asserted", () => {
    // The top family share before the publication is over the family ceiling and
    // the publication reduces it, which is exactly what "RELIEVES" names.
    const familyCeiling = TOP_PROVIDER_FAMILY_SHARE_MAX;
    const topBefore = ROOMY.bySource
      .filter((row) => providerFamily(row.sourceId) === providerFamily("we-work-remotely"))
      .reduce((sum, row) => sum + row.count, 0) / ROOMY.activeTotal;
    const decision = decideAutoPublish(withInput(ROOMY));
    const leadingFamilyNow = ROOMY.bySource
      .filter((row) => providerFamily(row.sourceId) === providerFamily("we-work-remotely"))
      .reduce((sum, row) => sum + row.count, 0);
    const topAfter = leadingFamilyNow / (ROOMY.activeTotal + decision.publishCount);
    expect(topBefore).toBeGreaterThan(familyCeiling);
    expect(topAfter).toBeLessThan(topBefore);
  });
});

// ─── F-CI-1: the binding half, closed. The ladder half is still open ───────────
//
// Pre-fix measurement, kept here because it is the reason for the change and the
// reason this file still has an OPEN case below: `classifyDecisionReuse` re-bound
// the current inputs under `stored.binding.policy`, so a decision was compared
// against the very rules that produced it. A binding stamped under
// `top_source_share_max * 2` came back `REUSABLE` with `UNCHANGED` and an empty
// `dimensions` list, while `classifyBindingDrift` on the same pair reported
// `POLICY_CONSTANTS_CHANGED`. Master §10B's "dependency invalidation selects the
// affected records … when a restrictive rule can change them" therefore had no
// trigger at all on this path.

describe("MATH-10: F-CI-1 the reuse path is bound at the live constants", () => {
  it("the reuse signature can now be handed the live policy, and defaults to it", () => {
    // Structural, restated after the change: `.length` is still 2 because the
    // policy parameter is defaulted, so a caller that omits it reads the live
    // constants and a caller that supplies one is no longer unable to.
    expect(classifyDecisionReuse.length).toBe(2);

    const live = currentPolicyBinding();
    const input = withInput(ROOMY);
    const stored = bound(input);

    // Omitting the policy compares against the live constants.
    expect(classifyDecisionReuse(stored, input).refusal).toBe("REUSABLE");

    // Supplying a different, looser policy is honoured rather than ignored.
    const looser = { ...live, top_source_share_max: live.top_source_share_max * 2 };
    const explicit = classifyDecisionReuse(stored, input, looser);
    expect(explicit.refusal).toBe("REFUSED_INPUT_DRIFT");
    expect(explicit.drift.class).toBe("POLICY_CONSTANTS_CHANGED");
  });

  it("a ceiling that moved since the decision was recorded now refuses reuse", () => {
    // Behavioural, restated after the change: the same pair that measured
    // `REUSABLE` / `UNCHANGED` / no `policy_digest` dimension now refuses, and
    // names the constant and its direction.
    const live = currentPolicyBinding();
    const stale = { ...live, top_source_share_max: live.top_source_share_max * 2 };
    const input = withInput(ROOMY);
    const stored: BoundDecision = { binding: bindDecisionInputs(input, stale), decision: decideAutoPublish(input) };

    expect(stored.binding.policy.top_source_share_max).not.toBe(live.top_source_share_max);

    const verdict = classifyDecisionReuse(stored, input);
    expect(verdict.refusal).toBe("REFUSED_INPUT_DRIFT");
    expect(verdict.drift.class).toBe("POLICY_CONSTANTS_CHANGED");
    expect(verdict.drift.dimensions).toContain("policy_digest");
    expect(verdict.drift.reusable).toBe(false);
    expect(verdict.floor_lowering_required).toBe(false);
    expect(verdict.reasons.join(" ")).toContain("top_source_share_max");
  });

  it("the refusal names direction, which one drift class cannot carry", () => {
    // The same `POLICY_CONSTANTS_CHANGED` class covers a tightening and a
    // loosening, so the reasons are what make a re-decision evaluable.
    const live = currentPolicyBinding();
    const input = withInput(ROOMY);

    const tightened: BoundDecision = {
      binding: bindDecisionInputs(input, { ...live, top_source_share_max: live.top_source_share_max / 2 }),
      decision: decideAutoPublish(input),
    };
    const loosened: BoundDecision = {
      binding: bindDecisionInputs(input, { ...live, top_source_share_max: live.top_source_share_max * 2 }),
      decision: decideAutoPublish(input),
    };

    const tighten = classifyDecisionReuse(tightened, input);
    const loosen = classifyDecisionReuse(loosened, input);

    // The class is identical, as measured before the change and unchanged by it.
    expect(tighten.drift.class).toBe("POLICY_CONSTANTS_CHANGED");
    expect(loosen.drift.class).toBe(tighten.drift.class);

    // The named constants differ, which is the part a consumer can act on.
    expect(tighten.reasons.join(" ")).toContain(
      `top_source_share_max ${live.top_source_share_max / 2} -> ${live.top_source_share_max}`,
    );
    expect(loosen.reasons.join(" ")).toContain(
      `top_source_share_max ${live.top_source_share_max * 2} -> ${live.top_source_share_max}`,
    );
  });

  it("the refusal describes the ceilings that hold now, not the ones that held then", () => {
    // The live ceilings block this cohort, so the recomputed decision is the
    // refusal the operator must act on. The stored text is whatever the code
    // produced when it ran: `decideAutoPublish` reads the live constants, so a
    // record stamped under a superseded ceiling can only come from a run before
    // the change — which is exactly why the binding has to carry the digest
    // rather than trust the decision's own words.
    const live = currentPolicyBinding();
    const input = withInput(SOURCE_AT_CEILING);
    const stale = { ...live, top_source_share_max: live.top_source_share_max * 2 };
    const stored: BoundDecision = { binding: bindDecisionInputs(input, stale), decision: decideAutoPublish(input) };

    expect(stored.binding.policy.top_source_share_max).toBe(live.top_source_share_max * 2);
    expect(stored.binding.policy_digest).not.toBe(policyBindingDigest(live));

    const verdict = classifyDecisionReuse(stored, input);
    expect(verdict.refusal).toBe("REFUSED_INPUT_DRIFT");
    expect(verdict.drift.class).toBe("POLICY_CONSTANTS_CHANGED");
    expect(verdict.current_decision!.action).toBe("HOLD");
    expect(verdict.current_decision!.concentration).toBe("BLOCKED");
    expect(verdict.current_decision!.publishCount).toBe(0);
  });

  it("an unchanged policy is still reusable, so the change costs nothing when nothing moved", () => {
    const stored = bound(withInput(ROOMY));
    const verdict = classifyDecisionReuse(stored, withInput(ROOMY));
    expect({ refusal: verdict.refusal, class: verdict.drift.class, dimensions: verdict.drift.dimensions })
      .toEqual({ refusal: "REUSABLE", class: "UNCHANGED", dimensions: [] });
  });

  it("OPEN, not closed by this unit: the SSAE-07 ladder still reuses the blocked cohort", () => {
    // The ladder keys its POLICY dependency off the `policy_version` string, so
    // with no label move it still returns REUSE for a cohort the live ceilings
    // refuse. The binding half of F-CI-1 is closed; this half is not, and this
    // assertion exists so the gap cannot be forgotten.
    expect(decideAutoPublish(withInput(SOURCE_AT_CEILING)).action).toBe("HOLD");
    expect(decideAutoPublish(withInput(SOURCE_AT_CEILING)).concentration).toBe("BLOCKED");

    const mode = selectProcessingMode(sourceRecord(), CURRENT_VERSIONS);
    expect(mode.mode).toBe("REUSE");
  });

  it("the inventory dimension, unlike the constants, invalidates as before", () => {
    // Contrast case, so the change is bounded: an input the binding covered
    // before it is still covered, and its class is unchanged.
    const stored = bound(withInput(ROOMY));
    const verdict = classifyDecisionReuse(stored, withInput(SOURCE_AT_CEILING));
    expect(verdict.refusal).toBe("REFUSED_INPUT_DRIFT");
    expect(verdict.drift.class).toBe("INVENTORY_INPUT_CHANGED");
    expect(verdict.drift.dimensions.some((d) => d.startsWith("inventory."))).toBe(true);
    expect(verdict.floor_lowering_required).toBe(false);
  });
});

// ─── F-CI-2 / F-CI-3 closed: what the concentration hold tells the next operator ─
//
// Session 11 characterised both defects against the previous behaviour of
// `deriveHoldResolution`. They are now fixed in that module, so the
// characterization is restated as a closure test over the same fixtures. The
// historical shape is recorded in `docs/SYSTEM_SAVEPOINT.md` (sessions 11 and 12);
// nothing else in this file changes, and the defects were never production
// behaviour — no writer imports the module.

describe("MATH-08: F-CI-2 closed — each missing-evidence pair is commensurable", () => {
  it("a source blocked at its own ceiling names that ceiling, share against share", () => {
    const input = withInput(SOURCE_AT_CEILING);
    const decision = decideAutoPublish(input);
    expect(decision.action).toBe("HOLD");

    const resolution = deriveHoldResolution(input, decision, "2026-10-04T03:00:00.000Z");
    expect(resolution.blocking_constraint).toBe("CONCENTRATION_CEILING");

    // Previously this pair was `{ observed: 400 rows, required: 0.4 }`: a count
    // measured against a share, which no caller can evaluate.
    const denominator = resolution.missing_evidence.find((item) => item.field === "inventory.active_total")!;
    expect(denominator.observed).toBe(SOURCE_AT_CEILING.activeTotal);
    expect(denominator.required).toBeNull();

    // The share pair is commensurable. The family is at 140/400 = 0.35, legitimately
    // under its own 0.40 ceiling, so it is correctly *not* named: under the old
    // behaviour the hold told the operator to bring the family down to the stricter
    // 0.25 *source* ceiling, which is not the constraint that bit and is not
    // required of a family.
    const source = resolution.missing_evidence.find((item) => item.field === "inventory.source_share")!;
    expect(resolution.missing_evidence.map((item) => item.field)).toEqual([
      "inventory.source_share",
      "inventory.active_total",
    ]);
    expect(source.observed).toBeCloseTo(100 / 400, 12);
    expect(source.required).toBe(TOP_SOURCE_SHARE_MAX);
    expect(resolution.concentration_ceiling.binding).toBe("TOP_SOURCE_SHARE_MAX");
    expect(resolution.concentration_ceiling.family_share!).toBeLessThan(TOP_PROVIDER_FAMILY_SHARE_MAX);
    expect(resolution.next_action!.produces_field).toBe("inventory.source_share");

    // Every named requirement is one the cohort is actually measured against, so
    // `observed >= required` is evaluable on all of them.
    for (const item of resolution.missing_evidence) {
      if (item.required === null) continue;
      expect(typeof item.observed).toBe(typeof item.required);
    }
  });

  it("a family blocked at its own ceiling names the family ceiling and not the source ceiling", () => {
    const input = withInput(FAMILY_AT_CEILING);
    const decision = decideAutoPublish(input);
    expect(decision.action).toBe("HOLD");
    expect(decision.concentration).toBe("BLOCKED");

    const resolution = deriveHoldResolution(input, decision, "2026-10-04T03:00:00.000Z");
    expect(resolution.concentration_ceiling.binding).toBe("TOP_PROVIDER_FAMILY_SHARE_MAX");
    expect(resolution.missing_evidence.map((item) => item.field)).toEqual([
      "inventory.family_share",
      "inventory.active_total",
    ]);
    const family = resolution.missing_evidence[0];
    expect(family.observed).toBeCloseTo(160 / 400, 12);
    expect(family.required).toBe(TOP_PROVIDER_FAMILY_SHARE_MAX);
    // The cohort's own source is well under the source ceiling, so naming it
    // would send the operator after a constraint that is not binding.
    expect(resolution.concentration_ceiling.source_share!).toBeLessThan(TOP_SOURCE_SHARE_MAX);
    expect(resolution.next_action!.produces_field).toBe("inventory.family_share");
  });

  it("the recomputed ceiling agrees with `concentrationAllowance` itself, not with a restatement", () => {
    // The guard against the duplication this fix introduces: `describeConcentrationCeiling`
    // recomputes both shares locally because `concentrationAllowance` does not
    // expose them. Over every fixture, "a ceiling left no room" must agree with
    // "the allowance granted nothing" — measured against the real function.
    const snapshots: InventorySnapshot[] = [
      ROOMY,
      SOURCE_AT_CEILING,
      ONE_BELOW_SOURCE_CEILING,
      FAMILY_AT_CEILING,
      { activeTotal: 99, bySource: [{ sourceId: "jobicy:ph", count: 99 }] },
      { activeTotal: 400, bySource: [{ sourceId: "jobicy:ph", count: 400 }] },
    ];
    for (const snapshot of snapshots) {
      const ceiling = describeConcentrationCeiling(COHORT.sourceId, snapshot);
      const allowance = concentrationAllowance(COHORT.sourceId, COHORT.qualifiedReady, snapshot);
      const blockedByACeiling = ceiling.binding !== "NONE";
      expect(blockedByACeiling).toBe(allowance.allowed === 0);
      if (blockedByACeiling) expect(allowance.concentration).toBe("BLOCKED");
      expect(ceiling.active_total).toBe(snapshot.activeTotal);
    }
    expect(describeConcentrationCeiling(COHORT.sourceId, null).binding).toBe("NONE");
  });

  it("F-CI-3 closed — the named producer is the share that must move, and this cohort cannot move it", () => {
    const input = withInput(SOURCE_AT_CEILING);
    const resolution = deriveHoldResolution(input, decideAutoPublish(input), "2026-10-04T03:00:00.000Z");

    // Unchanged and honest: nothing the cohort observes releases it, because more
    // postings from this source make the breach worse.
    expect(resolution.additional_observations_needed).toBe(0);
    expect(resolution.resolution_requires_new_observations).toBe(false);
    expect(resolution.floor_lowering_required).toBe(false);

    // Previously `produces_field` was `inventory.active_total` while the trigger
    // waited on a share change. It now names the share that must actually fall,
    // and the description names the real producers.
    expect(resolution.next_action?.produces_field).toBe("inventory.source_share");
    expect(resolution.next_action?.description).toContain("not further observations from this cohort");
    expect(resolution.next_action?.description).toContain("no share ceiling may be raised");
    expect(resolution.next_action?.description).toContain("re-measure both share ceilings");
  });

  it("F-CI-5 still open — the hold's own discipline check passes vacuously without a clock", () => {
    const input = withInput(SOURCE_AT_CEILING);
    const withClock = deriveHoldResolution(input, decideAutoPublish(input), "2026-10-04T03:00:00.000Z");
    const withoutClock = deriveHoldResolution(input, decideAutoPublish(input), null);

    // With a hold clock the repository's own check runs: the block IS named in the
    // decision's reason, and the only violation left is the missing next-evidence
    // action, because `projectDecisionAsObservation` leaves that field null as the
    // caller would supply it. Measured, not asserted as a pass.
    expect(withClock.hold_discipline.held).toBe(true);
    expect(withClock.hold_discipline.valid).toBe(false);
    expect(withClock.hold_discipline.reasons).toEqual(["HOLD_WITHOUT_NEXT_EVIDENCE_ACTION"]);

    // Without a hold clock the same held decision reports `valid: true`, because
    // `checkHoldDiscipline` short-circuits on `held_at === null`. A caller that
    // forgets the clock therefore sees a *passing* discipline check on a live hold.
    // UNFIXED: changing that is a change to `checkHoldDiscipline`, proposed.
    expect(withoutClock.hold_discipline.held).toBe(false);
    expect(withoutClock.hold_discipline.valid).toBe(true);
    expect(withoutClock.hold_discipline.reasons).toEqual([]);
    expect(withoutClock.blocking_constraint).toBe("CONCENTRATION_CEILING");
  });
});

// ─── F-CI-4: the snapshot itself is trusted, not verified ────────────────────

describe("MATH-08: F-CI-4 the allowance trusts `activeTotal` over its own rows", () => {
  it("rows that do not sum to `activeTotal` produce an allowance with no error", () => {
    const inconsistent: InventorySnapshot = {
      activeTotal: 400,
      bySource: [
        { sourceId: "jobicy:ph", count: 60 },
        { sourceId: "jobicy:sg", count: 40 },
        { sourceId: "we-work-remotely", count: 200 },
      ],
    };
    const rowsTotal = inconsistent.bySource.reduce((sum, row) => sum + row.count, 0);
    expect(rowsTotal).not.toBe(inconsistent.activeTotal);

    // VERIFIED_CODE: `concentrationAllowance` divides by `activeTotal` and never
    // compares it with the row sum, so the same source id, cohort and declared
    // total yields a decision even though the snapshot is internally
    // inconsistent. The alternative snapshot below is consistent and differs.
    expect(concentrationAllowance(COHORT.sourceId, COHORT.qualifiedReady, inconsistent)).toEqual(
      concentrationAllowance(COHORT.sourceId, COHORT.qualifiedReady, ROOMY),
    );

    // The binding does cover both halves, so an *inconsistency between two
    // bindings* is visible as drift. It is the decision-time check that is absent.
    const a = bindDecisionInputs(withInput(inconsistent));
    const b = bindDecisionInputs(withInput(ROOMY));
    expect(a.binding_digest).not.toBe(b.binding_digest);
    expect(classifyBindingDrift(a, b).class).toBe("INVENTORY_INPUT_CHANGED");
  });

  it("a snapshot below the live minimum is inert, so a young board escapes both ceilings", () => {
    const young = { activeTotal: 99, bySource: [{ sourceId: "jobicy:ph", count: 99 }] };
    expect(young.activeTotal).toBeLessThan(100);
    expect(concentrationAllowance(COHORT.sourceId, COHORT.qualifiedReady, young)).toEqual({
      allowed: COHORT.qualifiedReady,
      concentration: "UNKNOWN",
    });
  });

  it("the decision text distinguishes a cap from a block, which is the only record of which ceiling bit", () => {
    const capped = decideAutoPublish(withInput(ONE_BELOW_SOURCE_CEILING));
    const blocked = decideAutoPublish(withInput(SOURCE_AT_CEILING));
    expect(capped.action).toBe("PUBLISH");
    expect(capped.concentration).toBe("RELIEVES");
    expect(capped.reason).toContain(`Publishing ${capped.publishCount} of ${COHORT.qualifiedReady}`);
    expect(blocked.action).toBe("HOLD");
    expect(blocked.concentration).toBe("BLOCKED");
    expect(blocked.reason).toContain("Concentration ceiling blocks");
    // Neither reason names WHICH ceiling blocked, and `concentration` carries only
    // the four-value enum, so a stored decision cannot attribute its own block.
    expect(capped.reason).not.toContain(String(TOP_SOURCE_SHARE_MAX));
    expect(blocked.reason).not.toContain(String(TOP_PROVIDER_FAMILY_SHARE_MAX));
  });
});

// ─── F-CI-6: the relieving outcome was the one thing no projection named ──────
//
// `concentrationAllowance` produces exactly one positive concentration signal,
// `RELIEVES`, and before this unit nothing in the repository named what it means.
// `AutoPublishDecision.concentration` is a four-value enum with no family attached,
// the decision's `reason` prose reports only `Concentration RELIEVES`, and the
// ceiling projection (`describeConcentrationCeiling`, session 13) answers a
// different question — "which ceiling left no room" — so it returns `NONE` for a
// relieving publication. A board under concentration pressure that this publication
// helps, and a board with no pressure at all, were therefore indistinguishable.
//
// `describeConcentrationRelief` names it: which provider family is over its ceiling,
// by how many rows, and whether this publication reduces it.

describe("MATH-08: F-CI-6 a relieving publication is named, and named correctly", () => {
  it("the relieving case and the unpressured case were both `binding: NONE`, and only one relieves", () => {
    const relieving = withInput(ROOMY);
    const unpressured = withInput(UNPRESSURED);

    // Both publish the whole cohort and both look identical to the ceiling
    // projection: no ceiling left this publication any less room.
    expect(decideAutoPublish(relieving).action).toBe("PUBLISH");
    expect(decideAutoPublish(unpressured).action).toBe("PUBLISH");
    expect(describeConcentrationCeiling(COHORT.sourceId, ROOMY).binding).toBe("NONE");
    expect(describeConcentrationCeiling(COHORT.sourceId, UNPRESSURED).binding).toBe("NONE");

    // The real policy function already told them apart, in one enum value that
    // carries no family, no magnitude and no reason.
    expect(decideAutoPublish(relieving).concentration).toBe("RELIEVES");
    expect(decideAutoPublish(unpressured).concentration).toBe("OK");

    const relief = describeConcentrationRelief(COHORT.sourceId, COHORT.qualifiedReady, ROOMY);
    expect(relief.relieves).toBe(true);
    expect(relief.leading_family).toBe("we-work-remotely");
    expect(relief.over_ceiling).toBe(true);
    expect(relief.leading_family_rows).toBe(200);
    expect(relief.leading_family_share!).toBeCloseTo(200 / 400, 12);
    expect(relief.rows_over_ceiling).toBe(200 - TOP_PROVIDER_FAMILY_SHARE_MAX * 400);
    expect(relief.publishes_rows).toBe(COHORT.qualifiedReady);
    // Relief comes from the larger denominator: this publication's rows land in the
    // jobicy family, so the leading family's share falls without it publishing less.
    expect(relief.leading_family_share_after!).toBeCloseTo(200 / (400 + COHORT.qualifiedReady), 12);
    expect(relief.leading_family_share_after!).toBeLessThan(relief.leading_family_share!);
    expect(relief.not_relieved_because).toBeNull();

    const calm = describeConcentrationRelief(COHORT.sourceId, COHORT.qualifiedReady, UNPRESSURED);
    expect(calm.relieves).toBe(false);
    expect(calm.over_ceiling).toBe(false);
    expect(calm.rows_over_ceiling).toBe(0);
    expect(calm.not_relieved_because).toContain("nothing to relieve");
    expect(calm.publishes_rows).toBe(COHORT.qualifiedReady);
  });

  it("the projection agrees with `concentrationAllowance` over every fixture, not with a restatement", () => {
    // The guard against the duplication this projection introduces: it recomputes
    // both shares locally, so its `relieves` must equal the real function's
    // `RELIEVES` and its `publishes_rows` must equal the real `allowed` — measured
    // against `concentrationAllowance` itself on every fixture in this file.
    const snapshots: InventorySnapshot[] = [
      ROOMY,
      UNPRESSURED,
      SOURCE_AT_CEILING,
      ONE_BELOW_SOURCE_CEILING,
      FAMILY_AT_CEILING,
      FAMILY_EXACTLY_AT_CEILING,
      FAMILY_ONE_ROW_OVER_CEILING,
      OWN_FAMILY_OVER_CEILING,
      YOUNG_BOARD,
      SINGLE_ROW_BOARD,
    ];
    for (const snapshot of snapshots) {
      const allowance = concentrationAllowance(COHORT.sourceId, COHORT.qualifiedReady, snapshot);
      const relief = describeConcentrationRelief(COHORT.sourceId, COHORT.qualifiedReady, snapshot);
      expect(relief.relieves).toBe(allowance.concentration === "RELIEVES");
      expect(relief.publishes_rows).toBe(allowance.allowed);
      expect(relief.denominator).toBe(snapshot.activeTotal);
      expect(relief.denominator_matches_rows).toBe(true);
      // Relief is never claimed where there is no room to publish anything.
      if (relief.relieves) expect(relief.publishes_rows).toBeGreaterThan(0);
    }

    // A missing snapshot is inert in both functions, and neither invents a share.
    const absent = describeConcentrationRelief(COHORT.sourceId, COHORT.qualifiedReady, null);
    expect(absent.measurable).toBe(false);
    expect(absent.relieves).toBe(false);
    expect(absent.leading_family_share).toBeNull();
    expect(absent.leading_family_share_after).toBeNull();
    expect(absent.not_relieved_because).toContain(String(MIN_INVENTORY_FOR_CONCENTRATION));
    expect(concentrationAllowance(COHORT.sourceId, COHORT.qualifiedReady, null).concentration).toBe("UNKNOWN");
  });

  it("a family exactly on its ceiling is not relieved, and one row more is", () => {
    // The RELIEVES branch tests `topBefore > TOP_PROVIDER_FAMILY_SHARE_MAX`, so
    // equality is not pressure. Both fixtures are internally consistent, and they
    // differ by one row in the leading family.
    const at = describeConcentrationRelief(COHORT.sourceId, COHORT.qualifiedReady, FAMILY_EXACTLY_AT_CEILING);
    const over = describeConcentrationRelief(COHORT.sourceId, COHORT.qualifiedReady, FAMILY_ONE_ROW_OVER_CEILING);

    expect(at.leading_family_share).toBeCloseTo(TOP_PROVIDER_FAMILY_SHARE_MAX, 12);
    expect(at.over_ceiling).toBe(false);
    expect(at.relieves).toBe(false);
    expect(at.rows_over_ceiling).toBe(0);
    expect(decideAutoPublish(withInput(FAMILY_EXACTLY_AT_CEILING)).concentration).toBe("OK");

    expect(over.leading_family_share!).toBeGreaterThan(TOP_PROVIDER_FAMILY_SHARE_MAX);
    expect(over.over_ceiling).toBe(true);
    expect(over.relieves).toBe(true);
    expect(over.rows_over_ceiling).toBe(1);
    expect(decideAutoPublish(withInput(FAMILY_ONE_ROW_OVER_CEILING)).concentration).toBe("RELIEVES");
  });

  it("an over-ceiling family has zero share room, so a blocked cohort relieves nothing", () => {
    // The reason `not_relieved_because` has no "it is my own family" case: the
    // family ceiling gives an over-ceiling family exactly zero room, so the
    // allowance blocks before any relief can be reported. Measured, not assumed.
    const own = describeConcentrationRelief(COHORT.sourceId, COHORT.qualifiedReady, OWN_FAMILY_OVER_CEILING);
    expect(own.leading_family).toBe(providerFamily(COHORT.sourceId));
    expect(own.leading_family_share!).toBeGreaterThan(TOP_PROVIDER_FAMILY_SHARE_MAX);
    expect(own.over_ceiling).toBe(true);
    expect(own.publishes_rows).toBe(0);
    expect(own.relieves).toBe(false);
    expect(own.leading_family_share_after).toBeNull();
    expect(own.not_relieved_because).toContain("no room");

    const decision = decideAutoPublish(withInput(OWN_FAMILY_OVER_CEILING));
    expect(decision.action).toBe("HOLD");
    expect(decision.concentration).toBe("BLOCKED");
  });

  it("the hold projection carries the relief, so a caller cannot read `NONE` as no pressure", () => {
    // `deriveHoldResolution` is called for every action, so the relieving case is
    // reachable: the cohort is not held at all here, yet its concentration relief is
    // exactly the fact a caller would want and previously had nowhere to read.
    const input = withInput(ROOMY);
    const resolution = deriveHoldResolution(input, decideAutoPublish(input), "2026-10-04T03:00:00.000Z");

    expect(resolution.action).toBe("PUBLISH");
    expect(resolution.blocking_constraint).toBe("NOT_HELD");
    expect(resolution.missing_evidence).toEqual([]);
    expect(resolution.concentration_ceiling.binding).toBe("NONE");
    expect(resolution.concentration_relief.relieves).toBe(true);
    expect(resolution.concentration_relief.leading_family).toBe("we-work-remotely");

    // Nothing about the decision itself moved: the relief projection is additive,
    // reports no new threshold and grants no publication authority of its own.
    expect(resolution.floor_lowering_required).toBe(false);
    expect(resolution.concentration_relief.publishes_rows).toBe(
      concentrationAllowance(COHORT.sourceId, COHORT.qualifiedReady, ROOMY).allowed,
    );
    expect(resolution.next_action).toBeNull();
  });

  it("F-CI-4 support: the denominator is reported, so an inconsistent snapshot is visible", () => {
    // The shares are computed on `activeTotal`, which `concentrationAllowance` never
    // compares with the row sum. The projection records both so a caller can see the
    // inconsistency rather than inherit it; it changes no allowance.
    const inconsistent: InventorySnapshot = {
      activeTotal: 400,
      bySource: [
        { sourceId: "jobicy:ph", count: 60 },
        { sourceId: "jobicy:sg", count: 40 },
        { sourceId: "we-work-remotely", count: 200 },
      ],
    };
    const relief = describeConcentrationRelief(COHORT.sourceId, COHORT.qualifiedReady, inconsistent);
    expect(relief.row_sum).toBe(300);
    expect(relief.denominator).toBe(400);
    expect(relief.denominator_matches_rows).toBe(false);
    // Still agrees with the real function on this snapshot too, inconsistency and all.
    expect(relief.relieves).toBe(
      concentrationAllowance(COHORT.sourceId, COHORT.qualifiedReady, inconsistent).concentration === "RELIEVES",
    );
  });
});