/**
 * v6.5 priority case C (resolution half) and MATH-10 decision-input binding.
 *
 * These tests exercise real repository code:
 * `scripts/lake/auto-publish-policy.ts` (`decideAutoPublish`,
 * `concentrationAllowance`, `wilsonLowerBound`, its exported floors),
 * `scripts/ci/constitution-metrics.ts` (`providerFamily`, the share ceilings),
 * `scripts/lake/stage-latency.ts` (`checkHoldDiscipline`, `LatencyObservation`)
 * and `packages/scraper/contentHash.ts` (`hashString`). No constant is compared
 * against another constant of the same value: every expected number is either
 * recomputed from the owning module or is an independently derived value such as
 * a Wilson bound on a hand-checked cohort.
 *
 * Nothing here proves a runtime effect, publishes anything, lowers a floor or
 * reads a threshold as authority.
 *
 * Labels: "v6.5-CASES:" + MATH id.
 */

import { describe, expect, it } from "bun:test";
import {
  decideAutoPublish,
  wilsonLowerBound,
  concentrationAllowance,
  MIN_JOBS_FOR_RATE,
  PUBLISH_PH_RATE_FLOOR,
  JEV_MIN_CONFIDENCE,
  type AutoPublishInput,
} from "./auto-publish-policy";
import { TOP_PROVIDER_FAMILY_SHARE_MAX, TOP_SOURCE_SHARE_MAX, providerFamily } from "../ci/constitution-metrics";
import {
  bindDecisionInputs,
  classifyBindingDrift,
  classifyDecisionReuse,
  currentPolicyBinding,
  deriveHoldResolution,
  normalizeInventory,
  normalizeSample,
  policyBindingDigest,
  projectDecisionAsObservation,
  characterizeDecisionBinding,
  DECISION_BINDING_SCHEMA_VERSION,
  type BoundDecision,
  type PolicyBinding,
} from "./publish-hold-resolution";
import { checkHoldDiscipline } from "./stage-latency";

// ─── Fixtures ────────────────────────────────────────────────────────────────

/** 10 observed, 8 qualified: the Wilson lower bound clears the publish floor. */
const CLEARING: AutoPublishInput = {
  sourceId: "clearing-source",
  totalJobs: 10,
  qualifiedReady: 8,
  jevChoice: null,
  jevConfidence: null,
  inventory: null,
};

/** A cohort the sample floor cannot clear, with a confident advisory verdict. */
const SMALL_SAMPLE: AutoPublishInput = {
  sourceId: "small-sample-source",
  totalJobs: 2,
  qualifiedReady: 2,
  jevChoice: "ADMIT",
  jevConfidence: 0.99,
  inventory: null,
};

/** Sample floor met, Wilson floor not met, reject floor not crossed: the band. */
const AMBIGUOUS: AutoPublishInput = {
  sourceId: "ambiguous-band-source",
  totalJobs: 30,
  qualifiedReady: 8,
  jevChoice: null,
  jevConfidence: null,
  inventory: null,
};

/** Raw PH rate under the reject floor: an outright refusal, not a hold. */
const REFUSED: AutoPublishInput = {
  sourceId: "refused-source",
  totalJobs: 25,
  qualifiedReady: 1,
  jevChoice: null,
  jevConfidence: null,
  inventory: null,
};

function bound(input: AutoPublishInput): BoundDecision {
  return { binding: bindDecisionInputs(input), decision: decideAutoPublish(input) };
}

// ─── Binding: every input the decision reads, and nothing it does not ─────────

describe("v6.5-CASES: MATH-10 the binding covers every decision input", () => {
  it("changes the digest when the cohort denominator changes", () => {
    const base = bindDecisionInputs(CLEARING);
    const wider = bindDecisionInputs({ ...CLEARING, totalJobs: 11 });

    expect(wider.binding_digest).not.toBe(base.binding_digest);
    expect(base.binding_digest).toHaveLength(16);
  });

  it("changes the digest when the qualified numerator changes", () => {
    const base = bindDecisionInputs(CLEARING);
    const fewer = bindDecisionInputs({ ...CLEARING, qualifiedReady: 7 });

    expect(fewer.binding_digest).not.toBe(base.binding_digest);
  });

  it("changes the digest when the advisory verdict or its confidence changes", () => {
    const base = bindDecisionInputs(AMBIGUOUS);
    const withChoice = bindDecisionInputs({ ...AMBIGUOUS, jevChoice: "ADMIT" });
    const withConfidence = bindDecisionInputs({ ...AMBIGUOUS, jevChoice: "ADMIT", jevConfidence: 0.7 });
    const belowFloor = bindDecisionInputs({ ...AMBIGUOUS, jevChoice: "ADMIT", jevConfidence: 0.69 });

    expect(new Set([base.binding_digest, withChoice.binding_digest, withConfidence.binding_digest, belowFloor.binding_digest]).size).toBe(4);
  });

  it("changes the digest when an opt-out flips, so a withdrawal cannot reuse a publish", () => {
    const active = bindDecisionInputs(CLEARING);
    const optedOut = bindDecisionInputs({ ...CLEARING, optOut: true });

    expect(optedOut.binding_digest).not.toBe(active.binding_digest);
    expect(decideAutoPublish({ ...CLEARING, optOut: true }).action).toBe("REJECT");
  });

  it("changes the digest when the inventory snapshot appears or shifts", () => {
    const none = bindDecisionInputs(CLEARING);
    const small = bindDecisionInputs({
      ...CLEARING,
      inventory: { activeTotal: 100, bySource: [{ sourceId: "clearing-source", count: 100 }] },
    });
    const large = bindDecisionInputs({
      ...CLEARING,
      inventory: { activeTotal: 400, bySource: [{ sourceId: "clearing-source", count: 100 }] },
    });

    expect(new Set([none.binding_digest, small.binding_digest, large.binding_digest]).size).toBe(3);
    expect(none.inventory.present).toBe(false);
    expect(small.inventory.present).toBe(true);
  });

  it("ignores a difference that cannot change the decision, because the policy normalizes it", () => {
    const integral = bindDecisionInputs({ ...CLEARING, totalJobs: 10 });
    const fractional = bindDecisionInputs({ ...CLEARING, totalJobs: 10.9 });

    expect(normalizeSample({ ...CLEARING, totalJobs: 10.9 }).total_jobs).toBe(10);
    expect(fractional.binding_digest).toBe(integral.binding_digest);
  });

  it("records the sample the decision was computed over, which the decision object does not", () => {
    const decision = decideAutoPublish(CLEARING);
    const binding = bindDecisionInputs(CLEARING);

    expect(binding.sample.total_jobs).toBe(CLEARING.totalJobs);
    expect(binding.sample.qualified_ready).toBe(CLEARING.qualifiedReady);
    expect(binding.sample.wilson_lower).toBeCloseTo(decision.wilsonLower!, 12);
    expect(Object.keys(decision)).not.toContain("total_jobs");
  });

  it("orders inventory rows so an unordered snapshot is the same input", () => {
    const a = normalizeInventory({
      activeTotal: 200,
      bySource: [
        { sourceId: "alpha-source", count: 10 },
        { sourceId: "beta-source", count: 20 },
      ],
    });
    const b = normalizeInventory({
      activeTotal: 200,
      bySource: [
        { sourceId: "beta-source", count: 20 },
        { sourceId: "alpha-source", count: 10 },
      ],
    });

    expect(a.rows).toEqual(b.rows);
    expect(providerFamily("alpha-source")).toBe(providerFamily("alpha-source"));
  });
});

// ─── Policy binding: a mirrored constant move is visible drift ────────────────

describe("v6.5-CASES: MATH-10 the binding includes the constants the decision reads", () => {
  it("reads the floors from the modules that own them rather than restating them", () => {
    const policy = currentPolicyBinding();

    expect(policy.min_jobs_for_rate).toBe(MIN_JOBS_FOR_RATE);
    expect(policy.publish_ph_rate_floor).toBe(PUBLISH_PH_RATE_FLOOR);
    expect(policy.jev_min_confidence).toBe(JEV_MIN_CONFIDENCE);
    expect(policy.top_source_share_max).toBe(TOP_SOURCE_SHARE_MAX);
  });

  it("gives a different digest to a policy whose floor moved", () => {
    const current = currentPolicyBinding();
    const moved: PolicyBinding = { ...current, publish_ph_rate_floor: current.publish_ph_rate_floor + 0.01 };

    expect(policyBindingDigest(moved)).not.toBe(policyBindingDigest(current));
  });

  it("refuses reuse of a decision recorded under different constants", () => {
    const stored = bound(CLEARING);
    const driftedPolicy: PolicyBinding = { ...currentPolicyBinding(), min_jobs_for_rate: MIN_JOBS_FOR_RATE + 1 };
    const moved = bindDecisionInputs(CLEARING, driftedPolicy);

    const check = classifyBindingDrift(stored.binding, moved);

    expect(check.class).toBe("POLICY_CONSTANTS_CHANGED");
    expect(check.reusable).toBe(false);
  });
});

// ─── Reuse: the stored decision cannot see its own staleness ─────────────────

describe("v6.5-CASES: MATH-10 a PUBLISH is reusable only over the sample it cleared", () => {
  it("reuses an unchanged decision over identical inputs", () => {
    const stored = bound(CLEARING);
    const verdict = classifyDecisionReuse(stored, CLEARING);

    expect(verdict.refusal).toBe("REUSABLE");
    expect(verdict.drift.reusable).toBe(true);
    expect(verdict.floor_lowering_required).toBe(false);
  });

  it("refuses a stored PUBLISH after the cohort shrinks, even though its text is unchanged", () => {
    const stored = bound(CLEARING);
    expect(stored.decision.action).toBe("PUBLISH");

    const shrunk: AutoPublishInput = { ...CLEARING, qualifiedReady: 1 };
    const verdict = classifyDecisionReuse(stored, shrunk);

    expect(verdict.refusal).toBe("REFUSED_INPUT_DRIFT");
    expect(verdict.drift.class).toBe("COHORT_INPUT_CHANGED");
    expect(verdict.drift.dimensions).toContain("sample.qualified_ready");
    expect(stored.decision.reason).toContain("No human approval");
    expect(verdict.current_decision!.action).toBe("HOLD");
    expect(verdict.floor_lowering_required).toBe(false);
  });

  it("turns the shrink into a silent hold rather than a refusal, which is why drift must be detected", () => {
    const shrunk = decideAutoPublish({ ...CLEARING, qualifiedReady: 1 });

    // 1/10 is above the reject floor, so the cohort is neither published nor
    // refused: it stops, with publishCount 0 and no rejection on record.
    expect(shrunk.action).toBe("HOLD");
    expect(shrunk.publishCount).toBe(0);
    expect(shrunk.concentration).toBe("UNKNOWN");
  });

  it("still refuses a cohort whose raw rate falls under the reject floor", () => {
    const refused = decideAutoPublish(REFUSED);

    expect(refused.action).toBe("REJECT");
    expect(refused.publishCount).toBe(0);
    expect(REFUSED.qualifiedReady / REFUSED.totalJobs).toBeLessThan(0.05);
  });

  it("refuses any decision that carries no binding at all", () => {
    const verdict = classifyDecisionReuse(null, CLEARING);

    expect(verdict.refusal).toBe("REFUSED_NO_BINDING");
    expect(verdict.current_decision!.action).toBe("PUBLISH");
    expect(verdict.floor_lowering_required).toBe(false);
  });

  it("refuses a stored decision that does not reproduce over identical inputs", () => {
    const stored = bound(CLEARING);
    const tampered: BoundDecision = {
      binding: stored.binding,
      decision: { ...stored.decision, action: "HOLD", publishCount: 0 },
    };

    const verdict = classifyDecisionReuse(tampered, CLEARING);

    expect(verdict.refusal).toBe("REFUSED_DECISION_NOT_REPRODUCIBLE");
    expect(verdict.drift.drift).toBe(false);
    expect(verdict.current_decision!.action).toBe("PUBLISH");
  });

  it("refuses a binding whose digest does not match its own declared inputs", () => {
    const stored = bound(CLEARING);
    const inconsistent: BoundDecision = {
      binding: { ...stored.binding, binding_digest: "0000000000000000" },
      decision: stored.decision,
    };

    const verdict = classifyDecisionReuse(inconsistent, CLEARING);

    // No declared input differs, so the cause cannot be named: refuse as drift.
    expect(verdict.refusal).toBe("REFUSED_INPUT_DRIFT");
    expect(verdict.drift.class).toBe("NOT_COMPARABLE");
    expect(verdict.drift.dimensions).toEqual(["binding_digest"]);
    expect(verdict.current_decision!.action).toBe("PUBLISH");
  });

  it("refuses a binding recorded under a different contract version", () => {
    const stored = bound(CLEARING);
    const otherVersion: BoundDecision = {
      binding: { ...stored.binding, contract_version: DECISION_BINDING_SCHEMA_VERSION + 1 },
      decision: stored.decision,
    };

    const verdict = classifyDecisionReuse(otherVersion, CLEARING);

    expect(verdict.drift.class).toBe("NOT_COMPARABLE");
    expect(verdict.refusal).toBe("REFUSED_INPUT_DRIFT");
  });

  it("classifies an opt-out that appears after a publish as evidence drift, not a cohort change", () => {
    const stored = bound(CLEARING);
    const check = classifyBindingDrift(stored.binding, bindDecisionInputs({ ...CLEARING, optOut: true }));

    expect(check.class).toBe("EVIDENCE_INPUT_CHANGED");
    expect(check.dimensions).toEqual(["opted_out"]);
  });
});

// ─── Null inventory: an unbounded publish that records nothing about it ───────

describe("v6.5-CASES: MATH-08 a null inventory publishes without a share ceiling", () => {
  it("returns the whole cohort as allowed and reports concentration UNKNOWN", () => {
    const room = concentrationAllowance("clearing-source", 8, null);

    expect(room.allowed).toBe(8);
    expect(room.concentration).toBe("UNKNOWN");
  });

  it("binds a null-inventory publish to an absent inventory, not to an empty one", () => {
    const absent = bindDecisionInputs(CLEARING);
    const empty = bindDecisionInputs({
      ...CLEARING,
      inventory: { activeTotal: 0, bySource: [] },
    });

    expect(absent.inventory.present).toBe(false);
    expect(empty.inventory.present).toBe(true);
    expect(absent.binding_digest).not.toBe(empty.binding_digest);
  });

  it("publishes the whole cohort when the inventory is below the concentration minimum", () => {
    const room = concentrationAllowance("clearing-source", 8, {
      activeTotal: 5,
      bySource: [{ sourceId: "clearing-source", count: 5 }],
    });

    expect(room.allowed).toBe(8);
    expect(room.concentration).toBe("UNKNOWN");
  });

  it("caps the same cohort once a real inventory exists", () => {
    const saturated = concentrationAllowance("clearing-source", 8, {
      activeTotal: 100,
      bySource: [{ sourceId: "clearing-source", count: 100 }],
    });

    expect(saturated.allowed).toBe(0);
    expect(saturated.concentration).toBe("BLOCKED");
  });

  it("records UNKNOWN rather than OK when the allowance was never computed", () => {
    const decision = decideAutoPublish(AMBIGUOUS);

    expect(decision.action).toBe("HOLD");
    expect(decision.concentration).toBe("UNKNOWN");
  });
});

// ─── Case C resolution half: the hold names evidence and a next action ───────

describe("v6.5-CASES: MATH-05 case C resolution — a small-sample hold names its gap", () => {
  it("classifies the small-sample hold as a sample-floor block", () => {
    const decision = decideAutoPublish(SMALL_SAMPLE);
    const resolution = deriveHoldResolution(SMALL_SAMPLE, decision, "2026-10-04T03:00:00Z");

    expect(decision.action).toBe("HOLD");
    expect(resolution.blocking_constraint).toBe("SAMPLE_FLOOR");
    expect(resolution.missing_evidence.map((item) => item.field)).toEqual(["cohort.total_jobs"]);
    expect(resolution.missing_evidence[0].required).toBe(MIN_JOBS_FOR_RATE);
    expect(resolution.missing_evidence[0].observed).toBe(SMALL_SAMPLE.totalJobs);
  });

  it("names the observations still needed, from the existing floor rather than a new one", () => {
    const resolution = deriveHoldResolution(SMALL_SAMPLE, decideAutoPublish(SMALL_SAMPLE), "2026-10-04T03:00:00Z");

    expect(resolution.additional_observations_needed).toBe(MIN_JOBS_FOR_RATE - SMALL_SAMPLE.totalJobs);
    expect(resolution.additional_observations_needed).toBeGreaterThan(0);
    expect(resolution.resolution_requires_new_observations).toBe(true);
  });

  it("never resolves a hold by lowering a floor", () => {
    const resolution = deriveHoldResolution(SMALL_SAMPLE, decideAutoPublish(SMALL_SAMPLE), "2026-10-04T03:00:00Z");

    expect(resolution.floor_lowering_required).toBe(false);
    expect(resolution.next_action!.description).toContain("do not lower the sample floor");
    expect(resolution.next_action!.owner_role).toBe("MAINTAINER");
  });

  it("keeps the hold a hold after the gap is named: naming evidence is not clearance", () => {
    const decision = decideAutoPublish(SMALL_SAMPLE);
    const resolution = deriveHoldResolution(SMALL_SAMPLE, decision, "2026-10-04T03:00:00Z");

    expect(resolution.action).toBe("HOLD");
    expect(resolution.publish_count).toBe(0);
  });

  it("measures that the real hold fails the repository's own hold discipline", () => {
    const decision = decideAutoPublish(SMALL_SAMPLE);
    const resolution = deriveHoldResolution(SMALL_SAMPLE, decision, "2026-10-04T03:00:00Z");

    expect(resolution.hold_discipline.held).toBe(true);
    expect(resolution.hold_discipline.valid).toBe(false);
    expect(resolution.hold_discipline.reasons).toEqual(["HOLD_WITHOUT_NEXT_EVIDENCE_ACTION"]);
  });

  it("shows the policy's own reason passes the named-evidence check only as prose, not as a field", () => {
    const decision = decideAutoPublish(SMALL_SAMPLE);
    const discipline = checkHoldDiscipline(
      projectDecisionAsObservation(SMALL_SAMPLE.sourceId, decision, "2026-10-04T03:00:00Z"),
    );
    const resolution = deriveHoldResolution(SMALL_SAMPLE, decision, "2026-10-04T03:00:00Z");

    // The reason string is non-empty, so only the next-action half is caught.
    expect(decision.reason.length).toBeGreaterThan(0);
    expect(discipline.reasons).not.toContain("HOLD_MISSING_EVIDENCE_NOT_NAMED");
    // The field is named only by this slice's derivation, not by the decision.
    expect(resolution.missing_evidence[0].field).toBe("cohort.total_jobs");
    expect(decision.reason).not.toContain("cohort.total_jobs");
  });

  it("clears the discipline check once a next evidence action is supplied", () => {
    const decision = decideAutoPublish(SMALL_SAMPLE);
    const projection = projectDecisionAsObservation(SMALL_SAMPLE.sourceId, decision, "2026-10-04T03:00:00Z");
    const withAction = checkHoldDiscipline({ ...projection, next_evidence_action: "observe 1 more permitted posting" });

    expect(withAction.valid).toBe(true);
    expect(withAction.reasons).toEqual([]);
  });

  it("never holds a publish or a refusal", () => {
    const publish = deriveHoldResolution(CLEARING, decideAutoPublish(CLEARING), "2026-10-04T03:00:00Z");
    const refused = deriveHoldResolution(REFUSED, decideAutoPublish(REFUSED), "2026-10-04T03:00:00Z");

    expect(publish.blocking_constraint).toBe("NOT_HELD");
    expect(publish.missing_evidence).toEqual([]);
    expect(publish.next_action).toBeNull();
    expect(publish.hold_discipline.held).toBe(false);
    expect(refused.blocking_constraint).toBe("NOT_HELD");
    expect(refused.hold_discipline.held).toBe(false);
  });

  it("treats an opt-out as a refusal with no evidence route, not as a hold", () => {
    const optedOut = { ...CLEARING, optOut: true };
    const resolution = deriveHoldResolution(optedOut, decideAutoPublish(optedOut), "2026-10-04T03:00:00Z");

    expect(decideAutoPublish(optedOut).action).toBe("REJECT");
    expect(resolution.blocking_constraint).toBe("NOT_HELD");
    expect(resolution.missing_evidence).toEqual([]);
    expect(resolution.next_action).toBeNull();
  });
});

// ─── Case C resolution half: the ambiguous band names both gaps ──────────────

describe("v6.5-CASES: MATH-05 case C resolution — the ambiguous band names both gaps", () => {
  it("is genuinely in the band the policy describes", () => {
    const decision = decideAutoPublish(AMBIGUOUS);

    expect(AMBIGUOUS.totalJobs).toBeGreaterThanOrEqual(MIN_JOBS_FOR_RATE);
    expect(decision.wilsonLower!).toBeLessThan(PUBLISH_PH_RATE_FLOOR);
    expect(decision.action).toBe("HOLD");
  });

  it("names the sample gap and the absent advisory verdict separately", () => {
    const resolution = deriveHoldResolution(AMBIGUOUS, decideAutoPublish(AMBIGUOUS), "2026-10-04T03:00:00Z");

    expect(resolution.blocking_constraint).toBe("WILSON_AMBIGUOUS_BAND");
    expect(resolution.missing_evidence.map((item) => item.field)).toEqual(["cohort.qualified_ready", "jev.choice"]);
    expect(resolution.missing_evidence[1].required).toBe(JEV_MIN_CONFIDENCE);
    expect(resolution.additional_observations_needed).toBe(0);
    expect(resolution.resolution_requires_new_observations).toBe(false);
  });

  it("routes the band to one advisory action rather than to a floor change", () => {
    const resolution = deriveHoldResolution(AMBIGUOUS, decideAutoPublish(AMBIGUOUS), "2026-10-04T03:00:00Z");

    expect(resolution.next_action!.produces_field).toBe("jev.choice");
    expect(resolution.next_action!.trigger.length).toBeGreaterThan(0);
    expect(resolution.floor_lowering_required).toBe(false);
  });

  it("drops the advisory gap once a confident verdict is recorded", () => {
    const judged: AutoPublishInput = { ...AMBIGUOUS, jevChoice: "ADMIT", jevConfidence: JEV_MIN_CONFIDENCE };
    const decision = decideAutoPublish(judged);

    expect(decision.action).toBe("PUBLISH");
    expect(deriveHoldResolution(judged, decision, "2026-10-04T03:00:00Z").blocking_constraint).toBe("NOT_HELD");
  });

  it("keeps the band a hold when the advisory confidence sits below the floor", () => {
    const weak: AutoPublishInput = { ...AMBIGUOUS, jevChoice: "ADMIT", jevConfidence: JEV_MIN_CONFIDENCE - 0.01 };
    const decision = decideAutoPublish(weak);

    expect(decision.action).toBe("HOLD");
    expect(deriveHoldResolution(weak, decision, "2026-10-04T03:00:00Z").missing_evidence.map((i) => i.field)).toContain("jev.choice");
  });

  it("computes the ambiguous cohort's Wilson bound independently of the policy", () => {
    // 8/30: ph = 8/30, z = 1.96, n = 30.
    const ph = 8 / 30;
    const z = 1.96;
    const n = 30;
    const expected = (ph + (z * z) / (2 * n) - z * Math.sqrt((ph * (1 - ph)) / n + (z * z) / (4 * n * n)))
      / (1 + (z * z) / n);

    expect(wilsonLowerBound(8, 30)).toBeCloseTo(expected, 12);
    expect(decideAutoPublish(AMBIGUOUS).wilsonLower).toBeCloseTo(expected, 12);
    expect(expected).toBeLessThan(PUBLISH_PH_RATE_FLOOR);
  });
});

// ─── Concentration hold names the ceiling it is waiting on ───────────────────

describe("v6.5-CASES: MATH-08 a concentration hold names the ceiling", () => {
  const saturated: AutoPublishInput = {
    sourceId: "saturated-source",
    totalJobs: 10,
    qualifiedReady: 10,
    jevChoice: null,
    jevConfidence: null,
    inventory: { activeTotal: 100, bySource: [{ sourceId: "saturated-source", count: 100 }] },
  };

  it("holds rather than publishing when the allowance is zero", () => {
    const decision = decideAutoPublish(saturated);

    expect(decision.action).toBe("HOLD");
    expect(decision.publishCount).toBe(0);
    expect(decision.concentration).toBe("BLOCKED");
  });

  it("names the inventory and the family share as the missing facts", () => {
    const resolution = deriveHoldResolution(saturated, decideAutoPublish(saturated), "2026-10-04T03:00:00Z");

    expect(resolution.blocking_constraint).toBe("CONCENTRATION_CEILING");
    expect(resolution.missing_evidence.map((item) => item.field)).toEqual(["inventory.active_total", "family.share"]);
    expect(resolution.missing_evidence[1].observed).toBe(providerFamily("saturated-source"));
    expect(resolution.missing_evidence[0].required).toBe(TOP_PROVIDER_FAMILY_SHARE_MAX);
    expect(resolution.missing_evidence[1].required).toBe(TOP_SOURCE_SHARE_MAX);
  });

  it("resolves by re-checking the allowance, never by raising a ceiling", () => {
    const resolution = deriveHoldResolution(saturated, decideAutoPublish(saturated), "2026-10-04T03:00:00Z");

    expect(resolution.next_action!.description).toContain("no share ceiling may be raised");
    expect(resolution.floor_lowering_required).toBe(false);
  });
});

// ─── Findings characterization ───────────────────────────────────────────────

describe("v6.5-CASES: MATH-05 characterized findings, not fixes", () => {
  it("reports every finding against the current policy function", () => {
    const findings = characterizeDecisionBinding(AMBIGUOUS, currentPolicyBinding(), "2026-10-04T03:00:00Z");

    expect(findings.decision_object_records_no_sample).toBe(true);
    expect(findings.decision_object_records_no_policy_digest).toBe(true);
    expect(findings.hold_names_no_missing_evidence_or_next_action).toBe(true);
    expect(findings.hold_discipline_unmeasurable).toBe(false);
    expect(findings.limitations.length).toBeGreaterThan(0);
  });

  it("asserts no hold finding when no hold clock exists to check", () => {
    const findings = characterizeDecisionBinding(AMBIGUOUS);

    expect(findings.hold_names_no_missing_evidence_or_next_action).toBe(false);
    expect(findings.hold_discipline_unmeasurable).toBe(true);
    expect(findings.limitations.some((line) => line.includes("unmeasurable"))).toBe(true);
  });

  it("reports cohort-shrink instability only where a real publish exists to shrink", () => {
    expect(characterizeDecisionBinding(CLEARING).publish_is_unstable_under_cohort_shrink).toBe(true);
    expect(characterizeDecisionBinding(AMBIGUOUS).publish_is_unstable_under_cohort_shrink).toBe(false);
  });

  it("reports the unbounded null-inventory publish only when the inventory really is null", () => {
    expect(characterizeDecisionBinding(CLEARING).null_inventory_publishes_unbounded_by_share_ceilings).toBe(true);
    expect(
      characterizeDecisionBinding({
        ...CLEARING,
        inventory: { activeTotal: 1000, bySource: [{ sourceId: "clearing-source", count: 1 }] },
      }).null_inventory_publishes_unbounded_by_share_ceilings,
    ).toBe(false);
  });

  it("records the policy digest it read, so the finding is tied to this SHA's constants", () => {
    const policy = currentPolicyBinding();
    const findings = characterizeDecisionBinding(AMBIGUOUS, policy, "2026-10-04T03:00:00Z");

    expect(findings.limitations.some((line) => line.includes(policyBindingDigest(policy)))).toBe(true);
  });
});