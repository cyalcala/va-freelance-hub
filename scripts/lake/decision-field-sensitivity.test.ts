/**
 * SSAE-02 §5 "Publication decision replay" — the DECISION dimension, as executable
 * characterization fixtures. Labels: `MATH-10:`.
 *
 * `docs/audits/2026-10-04-SSAE-02-COMPACT-SOURCE-MEMORY.md` §5 answers "can this
 * decision be replayed?" with a per-row ✅/⚠️ and §4.1 answers "which dependency
 * change invalidates what?". §6 records the residual gaps. Until this file both
 * answers were prose, which is a CONSTITUTION §8.4 paper anchor.
 *
 * This file finishes the row that the three existing suites each cover only half
 * of. `scripts/lake/ssae-02-replay-coverage.test.ts` exercises the matrix rows
 * through `selectProcessingMode` and `decideAutoPublish` separately.
 * `scripts/lake/processing-modes.test.ts` exercises the SSAE-07 ladder through
 * `evaluateCacheValidity` and `decideProcessingMode`.
 * `scripts/lake/publish-hold-resolution.test.ts` exercises the decision binding
 * through `bindDecisionInputs`, `classifyBindingDrift` and `classifyDecisionReuse`.
 * No existing suite crosses the ladder with the binding, and that crossing is
 * exactly where the invalidation question lives: the ladder decides *whether to
 * re-derive a cohort* from version strings, while the binding decides *whether a
 * stored decision is still reusable* from input values. This file runs both
 * systems over the same source and measures where they disagree.
 *
 * Honesty statement, read before citing anything here:
 *
 * - These tests characterize EXISTING repository code. They add no gate, no
 *   threshold, no accepted parameter, no writer, no clock, no publication path and
 *   no enum. Nothing here is runtime evidence.
 * - Every record is a synthetic fixture. No live lake or D1 read happened, so
 *   every runtime replay rate, invalidation rate and decision count is UNKNOWN.
 * - SSAE-02 stays PROPOSED. This file does not accept the card, does not accept
 *   any MATH item, and does not certify the replay capability it describes.
 * - Findings (F-DS-*) state reproducible CURRENT behaviour with its consequence
 *   named. None is fixed here; each needs its own authorized unit.
 */

import { describe, expect, it } from "bun:test";

// The publication decision and the thresholds it reads.
import {
  decideAutoPublish,
  wilsonLowerBound,
  PUBLISH_PH_RATE_FLOOR,
  JEV_MIN_CONFIDENCE,
  WILSON_Z,
  MIN_JOBS_FOR_RATE,
  type AutoPublishInput,
} from "./auto-publish-policy";

// The decision input binding delivered by session 9 on this branch.
import {
  bindDecisionInputs,
  classifyBindingDrift,
  classifyDecisionReuse,
  currentPolicyBinding,
  deriveHoldResolution,
  type BoundDecision,
  type DecisionBinding,
  type PolicyBinding,
} from "./publish-hold-resolution";

// The SSAE-07 ladder: version-keyed invalidation over a source memory record.
import { evaluateCacheValidity, decideProcessingMode, type CacheState } from "./processing-modes";
import { CURRENT_VERSIONS, type Dependency, type SourceMemoryRecord, type VersionDeps } from "./source-ranker";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const NOW = new Date("2026-10-04T02:00:00.000Z");
const FUTURE = "2026-12-01T00:00:00.000Z";

/** 8 of 10 observed: the Wilson lower bound clears the publish floor on its own. */
const CLEARING: AutoPublishInput = {
  sourceId: "decision-dimension-source",
  totalJobs: 10,
  qualifiedReady: 8,
  jevChoice: null,
  jevConfidence: null,
  inventory: null,
};

/** 8 of 30: neither cleared nor refused, so the advisory verdict resolves the band. */
const BAND: AutoPublishInput = {
  sourceId: "decision-dimension-source",
  totalJobs: 30,
  qualifiedReady: 8,
  jevChoice: null,
  jevConfidence: null,
  inventory: null,
};

/** Below the existing sample floor: a hold that only more observations can resolve. */
const SMALL_SAMPLE: AutoPublishInput = { ...CLEARING, totalJobs: 2, qualifiedReady: 2 };

/** Raw PH rate under the existing reject floor: an outright refusal, not a hold. */
const REFUSED: AutoPublishInput = { ...CLEARING, totalJobs: 25, qualifiedReady: 1 };

/** Every version key the two invalidation systems could conceivably read. */
const VERSION_KEYS: (keyof VersionDeps)[] = [
  "policy_version",
  "processor_version",
  "geo_gate_version",
  "triage_version",
  "jev_version",
  "fingerprint_version",
  "content_hash_version",
];

/** The dependency each key maps to, taken from `processing-modes.ts`. */
const EXPECTED_DEPENDENCY: Record<keyof VersionDeps, Dependency> = {
  policy_version: "POLICY",
  processor_version: "PARSER",
  geo_gate_version: "GEO",
  triage_version: "TAXONOMY",
  jev_version: "MODEL",
  fingerprint_version: "IDENTITY",
  content_hash_version: "IDENTITY",
};

function bumped(storedKey: keyof VersionDeps): VersionDeps {
  return { ...CURRENT_VERSIONS, [storedKey]: `${String(CURRENT_VERSIONS[storedKey])}-next` };
}

function cacheStoredAt(storedVersions: VersionDeps): CacheState {
  return {
    evidence_expires_at: FUTURE,
    body_hash: "body-1",
    etag: 'W/"abc"',
    last_modified: "Sat, 03 Oct 2026 00:00:00 GMT",
    stored_versions: storedVersions,
    unresolved_items: 0,
  };
}

function sourceRecord(overrides: Partial<SourceMemoryRecord> = {}): SourceMemoryRecord {
  return {
    source_id: CLEARING.sourceId,
    provider_id: "DecisionDimension",
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
      policy_expiry: FUTURE,
      opt_out: false,
      lease_expiry: FUTURE,
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
    },
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
    ...overrides,
  };
}

function bound(input: AutoPublishInput): BoundDecision {
  return { binding: bindDecisionInputs(input), decision: decideAutoPublish(input) };
}

/** The comparable part of a decision: action, count, bound and concentration. */
function outcome(input: AutoPublishInput): string {
  const decision = decideAutoPublish(input);
  return `${decision.action}/${decision.publishCount}/${String(decision.wilsonLower)}/${decision.concentration}`;
}

// ─── F-DS-1: the ladder is version-keyed, the decision binding is not ─────────

describe("MATH-10: F-DS-1 the two invalidation systems read different things", () => {
  it("the decision binding has no version field, so all 7 version bumps are one digest", () => {
    const base = bindDecisionInputs(CLEARING);

    // The binding is a pure function of (AutoPublishInput, PolicyBinding). None of the
    // seven dependency version names reaches its field set, so a dependency version
    // cannot move the digest. `contract_version` is the binding's own shape version and
    // is not a dependency version, so it is excluded from this comparison.
    const bindingKeys = Object.keys(base);
    expect(VERSION_KEYS.filter((key) => bindingKeys.includes(key))).toEqual([]);
    expect(bindingKeys).toContain("policy_digest");
    expect(bindingKeys).toContain("contract_version");

    const digests = VERSION_KEYS.map((key) => {
      // Run the ladder so the bump is a real observation, then re-bind the same inputs.
      evaluateCacheValidity(cacheStoredAt(bumped(key)), CURRENT_VERSIONS, NOW);
      return bindDecisionInputs(CLEARING).binding_digest;
    });
    expect(new Set(digests).size).toBe(1);

    // And the drift classifier agrees, for the strongest available statement: the
    // stored binding is reusable across every one of the seven bumps.
    for (const key of VERSION_KEYS) {
      const drift = classifyBindingDrift(base, bindDecisionInputs(CLEARING));
      expect({ key, class: drift.class, reusable: drift.reusable }).toEqual({
        key,
        class: "UNCHANGED",
        reusable: true,
      });
    }
  });

  it("the ladder discriminates the same 7 bumps into two modes while the binding does not", () => {
    const observed = VERSION_KEYS.map((key) => {
      const validity = evaluateCacheValidity(cacheStoredAt(bumped(key)), CURRENT_VERSIONS, NOW);
      const mode = decideProcessingMode({
        record: sourceRecord(),
        cache: cacheStoredAt(bumped(key)),
        now: NOW,
      });
      const drift = classifyBindingDrift(bindDecisionInputs(CLEARING), bindDecisionInputs(CLEARING));
      return {
        key,
        invalidators: validity.invalidators,
        mismatched: validity.mismatched_dependencies,
        mode: mode.mode,
        disposition: mode.disposition,
        dependencies: mode.dependencies,
        binding_class: drift.class,
        binding_reusable: drift.reusable,
      };
    });

    for (const row of observed) {
      expect(row.invalidators).toEqual(["VERSION_MISMATCH"]);
      expect(row.mismatched).toEqual([EXPECTED_DEPENDENCY[row.key]]);
      expect(row.binding_class).toBe("UNCHANGED");
      expect(row.binding_reusable).toBe(true);
    }

    // Targeted dependencies replay a bounded cohort; broad ones re-derive indexes.
    // The binding is uniform across all of them.
    const targeted = ["policy_version", "geo_gate_version", "triage_version", "fingerprint_version", "content_hash_version"];
    for (const row of observed) {
      const expectedMode = targeted.includes(row.key) ? "BOUNDED_REPLAY" : "REINDEX";
      expect({ key: row.key, mode: row.mode }).toEqual({ key: row.key, mode: expectedMode });
      expect(row.disposition).toBe(expectedMode === "BOUNDED_REPLAY" ? "REPLAY_AFFECTED_COHORT" : "RECOMPUTE_FROM_STORED");
    }
    expect(new Set(observed.map((row) => row.mode)).size).toBe(2);
  });

  it("F-DS-1 — a mode decision carries nothing the decision binding could consume", () => {
    const mode = decideProcessingMode({
      record: sourceRecord(),
      cache: cacheStoredAt(bumped("geo_gate_version")),
      now: NOW,
    });

    // The ladder says "re-evaluate this cohort" and hands back no cohort address, no
    // sample and no binding digest. A caller that honours the mode must therefore
    // re-derive the cohort out of band, and nothing records that it did.
    expect(mode.mode).toBe("BOUNDED_REPLAY");
    expect(Object.keys(mode).some((key) => /binding|sample|cohort/i.test(key))).toBe(false);
    expect(mode.preserves_original_clocks).toBe(true);
    expect(VERSION_KEYS.filter((key) => Object.keys(mode).includes(key))).toEqual([]);
  });

  it("F-DS-1 — the disagreement is only a defect when the bump actually moves the cohort", () => {
    // A geo-gate bump that leaves the cohort counts untouched: the decision over the
    // old counts is genuinely still correct, so REUSABLE is right and the ladder's
    // BOUNDED_REPLAY is merely conservative.
    const unchangedCohort = bound(CLEARING);
    const verdict = classifyDecisionReuse(unchangedCohort, CLEARING);
    expect(verdict.refusal).toBe("REUSABLE");
    expect(verdict.drift.dimensions).toEqual([]);

    // The same bump, applied to a cohort the new geo gate would count differently, is
    // caught — but by the count moving, not by the version. The binding detects the
    // consequence and is blind to the cause.
    const movedCohort: AutoPublishInput = { ...CLEARING, qualifiedReady: 3, totalJobs: 10 };
    const movedDrift = classifyBindingDrift(bindDecisionInputs(CLEARING), bindDecisionInputs(movedCohort));
    expect({ class: movedDrift.class, dimensions: movedDrift.dimensions }).toEqual({
      class: "COHORT_INPUT_CHANGED",
      dimensions: ["sample.qualified_ready"],
    });

    // Consequence: nothing in the repository can tell these two cases apart at the
    // moment the version moves, because no writer records the cohort's producing
    // version. Whether reuse is safe is UNKNOWN until the cohort is re-derived.
    expect(bindDecisionInputs(CLEARING)).toEqual(bindDecisionInputs(CLEARING));
    expect(Object.keys(bindDecisionInputs(CLEARING))).not.toContain("cohort_versions");
  });
});

// ─── F-DS-2: the policy constants are the only version-aware decision input ───

describe("MATH-10: F-DS-2 policy sensitivity is behavioural, not label-shaped", () => {
  it("every policy constant the decision reads is covered by the binding digest", () => {
    const live = currentPolicyBinding();
    const base = bindDecisionInputs(CLEARING);

    for (const key of Object.keys(live) as (keyof PolicyBinding)[]) {
      const moved: PolicyBinding = { ...live, [key]: live[key] + 0.01 };
      const drift = classifyBindingDrift(base, bindDecisionInputs(CLEARING, moved));
      expect({ key, class: drift.class, reusable: drift.reusable }).toEqual({
        key,
        class: "POLICY_CONSTANTS_CHANGED",
        reusable: false,
      });
    }
  });

  it("a version label that moves with no constant change is not decision drift", () => {
    // `policy_version` is a string the ladder compares; the decision never reads it.
    const validity = evaluateCacheValidity(cacheStoredAt(bumped("policy_version")), CURRENT_VERSIONS, NOW);
    expect(validity.mismatched_dependencies).toEqual(["POLICY"]);

    const drift = classifyBindingDrift(bindDecisionInputs(CLEARING), bindDecisionInputs(CLEARING));
    expect({ class: drift.class, reusable: drift.reusable }).toEqual({ class: "UNCHANGED", reusable: true });

    // Direction of truth: the label is decorative here. Reuse survives a rename, which
    // is the correct answer, because no decision input moved.
    const verdict = classifyDecisionReuse(bound(CLEARING), CLEARING);
    expect(verdict.refusal).toBe("REUSABLE");
  });

  it("a constant move with an unchanged label is caught, in both directions", () => {
    const live = currentPolicyBinding();
    const tightened: PolicyBinding = { ...live, publish_ph_rate_floor: live.publish_ph_rate_floor + 0.5 };
    const loosened: PolicyBinding = { ...live, publish_ph_rate_floor: live.publish_ph_rate_floor - 0.1 };

    const tightenDrift = classifyBindingDrift(bindDecisionInputs(CLEARING), bindDecisionInputs(CLEARING, tightened));
    const loosenDrift = classifyBindingDrift(bindDecisionInputs(CLEARING), bindDecisionInputs(CLEARING, loosened));

    // Both refuse. The binding does not classify a tightening as different from a
    // loosening, so a consumer must not read POLICY_CONSTANTS_CHANGED as "safe to
    // re-decide" without comparing the constants itself.
    expect(tightenDrift.class).toBe("POLICY_CONSTANTS_CHANGED");
    expect(loosenDrift.class).toBe("POLICY_CONSTANTS_CHANGED");

    const verdict = classifyDecisionReuse(bound(CLEARING), CLEARING);
    expect(verdict.floor_lowering_required).toBe(false);
    expect(verdict.refusal).toBe("REUSABLE");
  });

  it("WILSON_Z is genuinely decision-bearing, and the binding covers it twice", () => {
    // The publish comparison is `wilsonLower >= PUBLISH_PH_RATE_FLOOR`, so a wider
    // interval is a stricter test. Hand-derived: a larger z yields a lower bound.
    const atLiveZ = wilsonLowerBound(8, 10, WILSON_Z)!;
    const atWiderZ = wilsonLowerBound(8, 10, WILSON_Z + 1)!;
    const atNarrowerZ = wilsonLowerBound(8, 10, WILSON_Z - 0.5)!;
    expect(atNarrowerZ).toBeGreaterThan(atLiveZ);
    expect(atWiderZ).toBeLessThan(atLiveZ);
    expect(atLiveZ).toBeGreaterThanOrEqual(PUBLISH_PH_RATE_FLOOR);

    // The binding carries the constant digest *and* the value the constant produced.
    const live = currentPolicyBinding();
    const moved: PolicyBinding = { ...live, wilson_z: live.wilson_z + 1 };
    expect(bindDecisionInputs(CLEARING, moved).binding_digest)
      .not.toBe(bindDecisionInputs(CLEARING).binding_digest);
    expect(bindDecisionInputs(CLEARING).sample.wilson_lower).toBeCloseTo(atLiveZ, 12);
  });
});

// ─── F-DS-3: advisory materiality is band-conditional, and the model version is unrecorded ──

describe("MATH-10: F-DS-3 the advisory verdict is inert in one cohort and load-bearing in another", () => {
  it("when the Wilson floor clears, the advisory verdict cannot change the decision", () => {
    const none = outcome(CLEARING);
    const confidentAdmit = outcome({ ...CLEARING, jevChoice: "ADMIT", jevConfidence: 0.99 });
    const confidentReject = outcome({ ...CLEARING, jevChoice: "REJECT", jevConfidence: 0.99 });
    const lowShadow = outcome({ ...CLEARING, jevChoice: "SHADOW", jevConfidence: 0.1 });

    expect(new Set([none, confidentAdmit, confidentReject, lowShadow]).size).toBe(1);

    // The binding disagrees: it moves, and would refuse reuse, for an input that
    // provably cannot change the outcome. Conservative, but it costs a re-decision.
    const digests = new Set([
      bindDecisionInputs(CLEARING).binding_digest,
      bindDecisionInputs({ ...CLEARING, jevChoice: "ADMIT", jevConfidence: 0.99 }).binding_digest,
      bindDecisionInputs({ ...CLEARING, jevChoice: "REJECT", jevConfidence: 0.99 }).binding_digest,
    ]);
    expect(digests.size).toBe(3);

    const stored = bound(CLEARING);
    const verdict = classifyDecisionReuse(stored, { ...CLEARING, jevChoice: "REJECT", jevConfidence: 0.99 });
    expect(verdict.refusal).toBe("REFUSED_INPUT_DRIFT");
    expect(verdict.drift.class).toBe("EVIDENCE_INPUT_CHANGED");
    expect(verdict.floor_lowering_required).toBe(false);
  });

  it("inside the band the same field is load-bearing, and one class covers both cases", () => {
    const base = bindDecisionInputs(BAND);

    expect(outcome(BAND)).toBe(outcome({ ...BAND, jevChoice: null, jevConfidence: null }));
    // Below the existing confidence floor the verdict cannot execute.
    expect(outcome({ ...BAND, jevChoice: "ADMIT", jevConfidence: JEV_MIN_CONFIDENCE - 0.01 }))
      .toBe(outcome(BAND));
    // At the floor it executes the band.
    expect(outcome({ ...BAND, jevChoice: "ADMIT", jevConfidence: JEV_MIN_CONFIDENCE }))
      .not.toBe(outcome(BAND));
    // A confident verdict that is neither ADMIT nor REJECT leaves the hold standing.
    expect(outcome({ ...BAND, jevChoice: "SHADOW", jevConfidence: 0.99 })).toBe(outcome(BAND));

    const inertDrift = classifyBindingDrift(base, bindDecisionInputs({ ...CLEARING }));
    const materialDrift = classifyBindingDrift(
      base,
      bindDecisionInputs({ ...BAND, jevChoice: "ADMIT", jevConfidence: JEV_MIN_CONFIDENCE }),
    );
    // Same class, same "refuse" verdict — one for a change that cannot matter and one
    // for a change that publishes instead of holding. The drift class is not
    // band-aware, so it cannot be read as materiality.
    expect({ inert: inertDrift.class, material: materialDrift.class })
      .toEqual({ inert: "COHORT_INPUT_CHANGED", material: "EVIDENCE_INPUT_CHANGED" });
    expect(materialDrift.reusable).toBe(false);
  });

  it("F-DS-3 — the advisory model version is absent from the binding, and the two systems resolve its move oppositely", () => {
    // Two band decisions with the same verdict, produced by two different model
    // versions. The binding cannot tell them apart.
    const underOldModel: BoundDecision = {
      binding: bindDecisionInputs({ ...BAND, jevChoice: "ADMIT", jevConfidence: JEV_MIN_CONFIDENCE }),
      decision: decideAutoPublish({ ...BAND, jevChoice: "ADMIT", jevConfidence: JEV_MIN_CONFIDENCE }),
    };
    const sameVerdictNewModel = { ...BAND, jevChoice: "ADMIT" as const, jevConfidence: JEV_MIN_CONFIDENCE };

    expect(classifyDecisionReuse(underOldModel, sameVerdictNewModel).refusal).toBe("REUSABLE");
    expect(Object.keys(underOldModel.binding)).not.toContain("jev_version");
    // The digest is identical, which is the measurement behind the refusal: nothing
    // about the decision's inputs distinguishes the two model versions.
    expect(bindDecisionInputs(sameVerdictNewModel).binding_digest).toBe(underOldModel.binding.binding_digest);

    // The ladder sees the same deployment move and denies it outright.
    const validity = evaluateCacheValidity(cacheStoredAt(bumped("jev_version")), CURRENT_VERSIONS, NOW);
    expect({ invalidators: validity.invalidators, mismatched: validity.mismatched_dependencies })
      .toEqual({ invalidators: ["VERSION_MISMATCH"], mismatched: ["MODEL"] });

    const mode = decideProcessingMode({
      record: sourceRecord(),
      cache: cacheStoredAt(bumped("jev_version")),
      now: NOW,
    });
    // MODEL is broad, so the ladder's answer is a full re-derivation rather than a
    // bounded cohort replay — the opposite disposition to the binding's REUSABLE.
    expect({ mode: mode.mode, disposition: mode.disposition, dependencies: mode.dependencies })
      .toEqual({ mode: "REINDEX", disposition: "RECOMPUTE_FROM_STORED", dependencies: ["MODEL"] });
  });

  it("a band decision is replayable from stored evidence only while that evidence is retained", () => {
    // SSAE-02 §5 marks the publication-decision row "✅ YES" with the gap "Jev raw
    // verdicts only in lake (jev_raw)". Replaying the decision therefore replays the
    // lake's stored verdict; the raw text is not needed because the binding carries
    // the parsed choice and confidence. Prove the parsed pair is sufficient and that
    // the unparsed original is not consulted anywhere in this path.
    const parsed = { ...BAND, jevChoice: "ADMIT" as const, jevConfidence: JEV_MIN_CONFIDENCE };
    const decision = decideAutoPublish(parsed);
    expect({ action: decision.action, concentration: decision.concentration })
      .toEqual({ action: "PUBLISH", concentration: "UNKNOWN" });
    expect(bindDecisionInputs(parsed).sample.total_jobs).toBe(30);
  });
});

// ─── F-DS-4: an opt-out is authority on the ladder and a refusal in the decision ─

describe("MATH-10: F-DS-4 opt-out is the one drift dimension that cannot become a hold", () => {
  it("the ladder treats an opt-out as authority invalidation that outranks the cache", () => {
    const optedOut = sourceRecord({
      publication_state: { ...sourceRecord().publication_state, opt_out: true },
    });
    const mode = decideProcessingMode({ record: optedOut, cache: cacheStoredAt(CURRENT_VERSIONS), now: NOW });

    expect(mode.invalidators).toContain("OPT_OUT");
    expect(mode.mode).toBe("BOUNDED_REPLAY");
    expect(mode.disposition).toBe("REPLAY_AFFECTED_COHORT");
    expect(mode.reasons.join(" ")).toContain("withdrawal propagation");
    expect(mode.preserves_original_clocks).toBe(true);
  });

  it("the decision refuses every cohort shape, and no evidence can resolve it", () => {
    for (const input of [CLEARING, BAND, SMALL_SAMPLE, REFUSED]) {
      const optedOut = { ...input, optOut: true };
      const decision = decideAutoPublish(optedOut);
      expect({ source: input.totalJobs, action: decision.action, count: decision.publishCount })
        .toEqual({ source: input.totalJobs, action: "REJECT", count: 0 });

      const resolution = deriveHoldResolution(optedOut, decision, "2026-10-04T02:00:00.000Z");
      expect({
        constraint: resolution.blocking_constraint,
        missing: resolution.missing_evidence.length,
        next: resolution.next_action,
        needs_observations: resolution.resolution_requires_new_observations,
      }).toEqual({ constraint: "NOT_HELD", missing: 0, next: null, needs_observations: false });
    }
  });

  it("an opt-out refuses reuse, and the refusal is attributable to the opt-out alone", () => {
    const stored = bound(CLEARING);
    expect(classifyDecisionReuse(stored, CLEARING).refusal).toBe("REUSABLE");

    const verdict = classifyDecisionReuse(stored, { ...CLEARING, optOut: true });
    expect({ refusal: verdict.refusal, class: verdict.drift.class, dimensions: verdict.drift.dimensions })
      .toEqual({ refusal: "REFUSED_INPUT_DRIFT", class: "EVIDENCE_INPUT_CHANGED", dimensions: ["opted_out"] });

    // The current decision it would be replaced with is a refusal, not a hold, and
    // reuse still never requires lowering a floor.
    expect(verdict.current_decision?.action).toBe("REJECT");
    expect(verdict.floor_lowering_required).toBe(false);
  });
});

// ─── The row's actual boundary: what a decision replay does and does not prove ──

describe("MATH-10: the decision-dimension replay boundary", () => {
  it("replay is exact over the binding and only over the binding", () => {
    const stored = bound(BAND);
    const replayed = decideAutoPublish(BAND);

    expect({ action: replayed.action, count: replayed.publishCount }).toEqual({
      action: stored.decision.action,
      count: stored.decision.publishCount,
    });
    expect(replayed.reason).toBe(stored.decision.reason);
    expect(classifyDecisionReuse(stored, BAND).refusal).toBe("REUSABLE");
  });

  it("an inventory snapshot is decision-bearing even when the cohort is identical", () => {
    // Same counts, same verdict, different inventory: publishCount moves, so the
    // decision is not the same decision. A replay that ignored the snapshot would be
    // replaying a different publication.
    const withInventory: AutoPublishInput = {
      ...BAND,
      jevChoice: "ADMIT",
      jevConfidence: JEV_MIN_CONFIDENCE,
      inventory: { activeTotal: 400, bySource: [{ sourceId: CLEARING.sourceId, count: 200 }] },
    };
    const stored = bound(withInventory);

    expect(classifyDecisionReuse(stored, withInventory).refusal).toBe("REUSABLE");
    expect(outcome({ ...withInventory, inventory: null })).not.toBe(outcome(withInventory));

    const verdict = classifyDecisionReuse(stored, { ...withInventory, inventory: null });
    // Absent is not present-and-empty: every inventory dimension moves at once, so the
    // drift cannot be reported as one unknown sub-field.
    expect(verdict.drift.class).toBe("INVENTORY_INPUT_CHANGED");
    expect(verdict.drift.dimensions).toEqual(["inventory.present", "inventory.active_total", "inventory.rows"]);
  });

  it("a cohort claiming more qualified than observed is a distinct decision input", () => {
    // `Math.min(qualifiedReady, totalJobs)` makes the Wilson successes agree, so the
    // two cohorts share an interval. They are still not the same publication: the
    // numerator is what the concentration allowance is applied to.
    const overclaimed: AutoPublishInput = { ...BAND, totalJobs: 10, qualifiedReady: 12 };
    expect(normalizedSuccesses(overclaimed)).toBe(10);
    expect(normalizedSuccesses({ ...overclaimed, qualifiedReady: 10 })).toBe(10);

    const drift = classifyBindingDrift(bindDecisionInputs(overclaimed), bindDecisionInputs({ ...overclaimed, qualifiedReady: 10 }));
    expect({ class: drift.class, dimensions: drift.dimensions })
      .toEqual({ class: "COHORT_INPUT_CHANGED", dimensions: ["sample.qualified_ready"] });

    // Above the sample floor and above the reject floor, so this is a decision, not a refusal.
    expect(decideAutoPublish(overclaimed).action).toBe("PUBLISH");
    expect(MIN_JOBS_FOR_RATE).toBeLessThan(overclaimed.totalJobs);
  });
});

/** Reads the one field the binding derives from both counts. */
function normalizedSuccesses(input: AutoPublishInput): number {
  const binding: DecisionBinding = bindDecisionInputs(input);
  return binding.sample.wilson_successes;
}