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
 *   named. None is fixed here; each needs its own authorized unit, and the fix
 *   that would work is on the MERGE_RUBRIC §4.3 hold list, so it is proposed.
 * - SSAE-02 stays PROPOSED. Nothing here accepts SSAE-02, MATH-08 or MATH-10.
 */

import { describe, expect, it } from "bun:test";

import {
  concentrationAllowance,
  decideAutoPublish,
  type AutoPublishInput,
  type InventorySnapshot,
} from "./auto-publish-policy";

import {
  bindDecisionInputs,
  classifyBindingDrift,
  classifyDecisionReuse,
  currentPolicyBinding,
  deriveHoldResolution,
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

// ─── F-CI-1: a cohort the live ceilings now block is still REUSE and REUSABLE ──

describe("MATH-10: F-CI-1 a share-ceiling move produces no invalidation verdict", () => {
  it("the ceiling blocks the decision the ladder still calls REUSE", () => {
    // The restrictive rule moved: this cohort is now refused by the live ceilings.
    expect(decideAutoPublish(withInput(SOURCE_AT_CEILING)).action).toBe("HOLD");
    expect(decideAutoPublish(withInput(SOURCE_AT_CEILING)).concentration).toBe("BLOCKED");

    // Nothing in the record changed, and no version label moved, so the SSAE-07
    // ladder still reuses the cached cohort.
    const mode = selectProcessingMode(sourceRecord(), CURRENT_VERSIONS);
    expect(mode.mode).toBe("REUSE");

    // The decision binding likewise sees identical inputs.
    const verdict = classifyDecisionReuse(bound(withInput(SOURCE_AT_CEILING)), withInput(SOURCE_AT_CEILING));
    expect(verdict.refusal).toBe("REUSABLE");
    expect(verdict.drift.class).toBe("UNCHANGED");
    expect(verdict.drift.dimensions).toEqual([]);
  });

  it("the reuse path cannot see the live policy, by signature and by behaviour", () => {
    // Structural: the second parameter is the input record, not a policy, so no
    // caller can hand the live constants to the reuse check.
    expect(classifyDecisionReuse.length).toBe(2);

    // Behavioural: a binding stamped under a superseded ceiling is compared under
    // that same superseded ceiling, so the move is invisible on the reuse path.
    const live = currentPolicyBinding();
    const stale = { ...live, top_source_share_max: live.top_source_share_max * 2 };
    const input = withInput(ROOMY);
    const stored: BoundDecision = { binding: bindDecisionInputs(input, stale), decision: decideAutoPublish(input) };

    expect(stored.binding.policy.top_source_share_max).not.toBe(live.top_source_share_max);
    const verdict = classifyDecisionReuse(stored, input);
    expect(verdict.refusal).toBe("REUSABLE");
    expect(verdict.drift.class).toBe("UNCHANGED");
    expect(verdict.drift.dimensions).not.toContain("policy_digest");

    // The same comparison made the way the existing suites make it does name the
    // move. So the finding is about the reuse path, not about the binding.
    expect(classifyBindingDrift(stored.binding, bindDecisionInputs(input)).class).toBe("POLICY_CONSTANTS_CHANGED");
  });

  it("the ceiling is a ceiling in both directions, and the stored text hides which one bit", () => {
    // Tightening: the same cohort and inventory, a lower source ceiling.
    const live = currentPolicyBinding();
    const tightened = { ...live, top_source_share_max: live.top_source_share_max / 2 };
    const input = withInput(ROOMY);
    const stored: BoundDecision = { binding: bindDecisionInputs(input, tightened), decision: decideAutoPublish(input) };
    expect(classifyBindingDrift(stored.binding, bindDecisionInputs(input)).class).toBe("POLICY_CONSTANTS_CHANGED");

    // A single drift class covers a tightening and a loosening, and neither says
    // which direction moved, so a consumer cannot infer that re-decision is safe.
    const loosened: BoundDecision = { binding: bindDecisionInputs(input, { ...live, top_source_share_max: live.top_source_share_max * 2 }), decision: decideAutoPublish(input) };
    const tightenDrift = classifyBindingDrift(stored.binding, bindDecisionInputs(input));
    const loosenDrift = classifyBindingDrift(loosened.binding, bindDecisionInputs(input));
    expect(tightenDrift.class).toBe(loosenDrift.class);
    expect(tightenDrift.dimensions).toEqual(loosenDrift.dimensions);
  });

  it("the inventory dimension, unlike the constants, does invalidate", () => {
    // Contrast case, so F-CI-1 is bounded: an input the binding *does* cover is
    // caught. The concentration row's gap is specific to the ceiling constants
    // and is separate from F-RC-3's missing-snapshot gap.
    const stored = bound(withInput(ROOMY));
    const verdict = classifyDecisionReuse(stored, withInput(SOURCE_AT_CEILING));
    expect(verdict.refusal).toBe("REFUSED_INPUT_DRIFT");
    expect(verdict.drift.class).toBe("INVENTORY_INPUT_CHANGED");
    expect(verdict.drift.dimensions.some((d) => d.startsWith("inventory."))).toBe(true);
    expect(verdict.floor_lowering_required).toBe(false);
  });
});

// ─── F-CI-2 / F-CI-3: what the concentration hold tells the next operator ──────

describe("MATH-08: F-CI-2 the concentration hold names a share where it measured a count", () => {
  it("the missing-evidence pairs are incommensurable, and the family share is given the wrong ceiling", () => {
    const input = withInput(SOURCE_AT_CEILING);
    const decision = decideAutoPublish(input);
    expect(decision.action).toBe("HOLD");

    const resolution = deriveHoldResolution(input, decision, "2026-10-04T03:00:00.000Z");
    expect(resolution.blocking_constraint).toBe("CONCENTRATION_CEILING");
    expect(resolution.missing_evidence.map((item) => item.field)).toEqual(["inventory.active_total", "family.share"]);

    const [countItem, shareItem] = resolution.missing_evidence;
    // The first item observed a *count* of active rows and states its requirement
    // as a *share*, so no caller can evaluate `observed >= required` on it.
    expect(countItem.observed).toBe(SOURCE_AT_CEILING.activeTotal);
    expect(countItem.required).toBe(TOP_PROVIDER_FAMILY_SHARE_MAX);

    // The second item is about the family's share, and the value it must reach is
    // the *source* ceiling. A family is legitimately allowed up to the family
    // ceiling, so this target is wrong for the constraint that actually blocked.
    expect(shareItem.observed).toBe(providerFamily(COHORT.sourceId));
    expect(shareItem.required).toBe(TOP_SOURCE_SHARE_MAX);
    expect(shareItem.required).not.toBe(TOP_PROVIDER_FAMILY_SHARE_MAX);

    // In this fixture the family ceiling is the one that bit, yet the hold's own
    // stated target for the family is the stricter source ceiling.
    const familyNow = SOURCE_AT_CEILING.bySource
      .filter((row) => providerFamily(row.sourceId) === providerFamily(COHORT.sourceId))
      .reduce((sum, row) => sum + row.count, 0) / SOURCE_AT_CEILING.activeTotal;
    expect(familyNow).toBeLessThan(TOP_PROVIDER_FAMILY_SHARE_MAX);
    expect(shareItem.required).toBeLessThan(TOP_PROVIDER_FAMILY_SHARE_MAX);
  });

  it("F-CI-3 — the hold needs no observation from this cohort, and the next action names the wrong producer", () => {
    const input = withInput(SOURCE_AT_CEILING);
    const resolution = deriveHoldResolution(input, decideAutoPublish(input), "2026-10-04T03:00:00.000Z");

    // Nothing the cohort can observe releases it: more postings from this source
    // make the breach worse, not better.
    expect(resolution.additional_observations_needed).toBe(0);
    expect(resolution.resolution_requires_new_observations).toBe(false);
    expect(resolution.floor_lowering_required).toBe(false);

    // The named producer is `inventory.active_total`, i.e. other rows leaving the
    // active board — an inventory fact, not an observation this cohort produces.
    expect(resolution.next_action?.produces_field).toBe("inventory.active_total");
    expect(resolution.missing_evidence.map((item) => item.field)).toContain("inventory.active_total");
  });

  it("F-CI-5 — the hold's own discipline check is measured, and passes vacuously without a clock", () => {
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