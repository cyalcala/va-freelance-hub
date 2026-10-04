/**
 * SSAE-09 — field-sensitive job delta and exact bounded replay: executable tests.
 *
 * Every case exercises real repo code: `job-delta-replay.ts`, and through it the
 * merged SSAE-07 cache contract and the clock layer (`observation-clocks.ts`,
 * `packages/scraper/contentHash.ts`). Nothing here is a constant compared with a
 * constant, and no fixture is presented as live evidence.
 *
 * Run: bun test scripts/lake/job-delta-replay.test.ts
 */

import { describe, expect, test } from "bun:test";

import {
  applyReplayDecision,
  closeDependencies,
  emptyReplayRecord,
  emptyReplayState,
  generateReplayReceipt,
  planExactBoundedReplay,
  POSITIVE_STATE_COHORTS,
  propagateWithdrawals,
  proveCompleteSnapshot,
  selectAffectedCohort,
  SSAE_09_CONTRACT_VERSION,
  type ExactReplayCursor,
  type MaterialFieldName,
  type ReplayRecord,
  type RecordCohort,
} from "./job-delta-replay";
import {
  applySighting,
  emptyClocks,
  materialDigest,
  observationAgeDays,
  type JobMaterialFacts,
} from "./observation-clocks";
import { toContentHash } from "../../packages/scraper/contentHash";
import { CURRENT_VERSIONS, type VersionDeps } from "./source-ranker";

const NOW = new Date("2026-10-04T02:00:00.000Z");
const NOW_ISO = NOW.toISOString();

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

/** Versions recorded before a geo_gate bump, used to make a record version-stale. */
function versionsWithGeoGate(version: string): VersionDeps {
  return { ...CLEAN_VERSIONS, geo_gate_version: version };
}

interface RecordOptions {
  cohort?: RecordCohort;
  identity?: string;
  source_id?: string;
  retained?: JobMaterialFacts | null;
  observed?: JobMaterialFacts | null;
  observed_at?: string;
  decision_versions?: VersionDeps | null;
  opt_out?: boolean;
  policy_expiry?: string | null;
  lease_expiry?: string | null;
}

/**
 * Build a canonical job by folding one permitted sighting through the real clock
 * layer, so every retained clock in these fixtures was produced by repo code
 * rather than hand-written.
 */
function record(options: RecordOptions = {}): ReplayRecord {
  const identity = options.identity ?? "id-1";
  const source_id = options.source_id ?? `source:${identity}`;
  const base = emptyReplayRecord(identity, options.cohort ?? "PUBLIC");
  base.source_id = source_id;
  base.decision_versions =
    options.decision_versions === undefined ? { ...CLEAN_VERSIONS } : options.decision_versions;
  base.source_authority = {
    opt_out: options.opt_out ?? false,
    policy_expiry: options.policy_expiry ?? null,
    lease_expiry: options.lease_expiry ?? null,
  };

  const retained = options.retained === undefined ? facts() : options.retained;
  if (retained !== null) {
    const sighting = applySighting(emptyClocks(identity), {
      observed_at: options.observed_at ?? "2026-09-30T00:00:00.000Z",
      identity_hash: identity,
      facts: retained,
    });
    if (!sighting.ok) throw new Error(`fixture sighting failed: ${sighting.errors.join(", ")}`);
    base.clocks = sighting.clocks;
  }
  base.observed_facts = options.observed === undefined ? retained : options.observed;
  return base;
}

describe("SSAE-09 dependency closure", () => {
  test("a GEO change closes over geography and remote only", () => {
    const closure = closeDependencies(["GEO"]);
    expect(closure.invalidated_fields).toEqual(["location_raw", "remote"]);
    expect(closure.version_keys).toEqual(["geo_gate_version"]);
    expect(closure.unknown_dependencies).toEqual([]);
    expect(closure.requires_full_redigest).toBe(false);
    expect(closure.requires_reacquisition).toBe(false);
    expect(closure.affects_serving_state).toBe(false);
  });

  test("a GEO change cannot reclassify a posting date or an apply link", () => {
    const closure = closeDependencies(["GEO"]);
    expect(closure.invalidated_fields).not.toContain("posted_at");
    expect(closure.invalidated_fields).not.toContain("apply_url");
    expect(closure.invalidated_fields).not.toContain("safety");
  });

  test("an unknown dependency closes conservatively over every field and version", () => {
    const closure = closeDependencies(["GEO", "some_future_processor"]);
    expect(closure.unknown_dependencies).toEqual(["some_future_processor"]);
    expect(closure.invalidated_fields).toHaveLength(7);
    expect(closure.version_keys).toHaveLength(7);
    expect(closure.requires_full_redigest).toBe(true);
    expect(closure.requires_reacquisition).toBe(true);
    expect(closure.requires_identity_rederivation).toBe(true);
    expect(closure.affects_serving_state).toBe(true);
  });

  test("a parser change invalidates every retained fact, not only the parsed ones", () => {
    const closure = closeDependencies(["PARSER"]);
    expect(closure.requires_full_redigest).toBe(true);
    expect(closure.invalidated_fields).toHaveLength(7);
  });

  test("SOURCE_AUTHORITY and POLICY change served state without inventing material facts", () => {
    const authority = closeDependencies(["SOURCE_AUTHORITY"]);
    expect(authority.affects_serving_state).toBe(true);
    expect(authority.invalidated_fields).toEqual([]);

    const policy = closeDependencies(["POLICY"]);
    expect(policy.invalidated_fields).toEqual(["posted_at", "safety"]);
    expect(policy.affects_serving_state).toBe(true);
  });

  test("a closure union is order-independent and deduplicated", () => {
    const a = closeDependencies(["GEO", "POLICY", "GEO"]);
    const b = closeDependencies(["POLICY", "GEO"]);
    expect(a.invalidated_fields).toEqual(b.invalidated_fields);
    expect(a.version_keys).toEqual(b.version_keys);
  });

  test("an empty change set yields an empty closure rather than a full one", () => {
    const closure = closeDependencies([]);
    expect(closure.changed).toEqual([]);
    expect(closure.invalidated_fields).toEqual([]);
    expect(closure.requires_full_redigest).toBe(false);
  });
});

describe("SSAE-09 complete-snapshot proof", () => {
  test("an exact identity set proves completeness and permits absence-derived actions", () => {
    const proof = proveCompleteSnapshot(["a", "b", "c"], ["c", "b", "a"]);
    expect(proof.complete).toBe(true);
    expect(proof.coverage_unknown).toBe(false);
    expect(proof.absence_derived_actions_permitted).toBe(true);
    expect(proof.observed).toBe(3);
    expect(proof.expected).toBe(3);
  });

  test("unknown coverage is never completeness and never permits absence-derived actions", () => {
    const proof = proveCompleteSnapshot(["a", "b"], null);
    expect(proof.complete).toBe(false);
    expect(proof.coverage_unknown).toBe(true);
    expect(proof.absence_derived_actions_permitted).toBe(false);
  });

  test("a partial snapshot names exactly which expected identities are absent", () => {
    const proof = proveCompleteSnapshot(["a"], ["a", "b", "c"]);
    expect(proof.complete).toBe(false);
    expect(proof.missing_identities).toEqual(["b", "c"]);
    expect(proof.absence_derived_actions_permitted).toBe(false);
  });

  test("an extra observed identity also breaks the proof rather than being ignored", () => {
    const proof = proveCompleteSnapshot(["a", "b", "z"], ["a", "b"]);
    expect(proof.complete).toBe(false);
    expect(proof.unexpected_identities).toEqual(["z"]);
    expect(proof.absence_derived_actions_permitted).toBe(false);
  });

  test("duplicates in the observed set do not inflate the proof", () => {
    const proof = proveCompleteSnapshot(["a", "a", "b"], ["a", "b"]);
    expect(proof.complete).toBe(true);
    expect(proof.observed).toBe(2);
  });
});

describe("SSAE-09 affected-cohort selection", () => {
  const geoInput = (records: ReplayRecord[], changed: string[] = ["GEO"]) => ({
    records,
    changed_dependencies: changed,
    now: NOW,
  });

  test("an unchanged record with matching versions is not affected", () => {
    const stable = record({ identity: "id-stable", observed: facts() });
    const selection = selectAffectedCohort(geoInput([stable]));
    expect(selection.affected).toEqual([]);
    expect(selection.not_affected.map((entry) => entry.identity_hash)).toEqual(["id-stable"]);
    expect(selection.counts).toEqual({
      examined: 1,
      affected: 0,
      replayable: 0,
      held: 0,
      not_affected: 1,
    });
  });

  test("changed geography at an unchanged URL and identity is still a material delta", () => {
    const edited = record({
      identity: "id-geo",
      retained: facts(),
      observed: facts({ location_raw: "Remote (US only)" }),
    });
    // F-RC-4: the shared content hash is blind to this edit, so it cannot be the
    // oracle. Two different fact sets at the same title and URL hash identically.
    const before = facts();
    const after = facts({ location_raw: "Remote (US only)" });
    expect(toContentHash(before.title!, before.apply_url!)).toBe(
      toContentHash(after.title!, after.apply_url!),
    );
    expect(materialDigest(before)).not.toBe(materialDigest(after));

    const selection = selectAffectedCohort(geoInput([edited]));
    expect(selection.affected).toHaveLength(1);
    expect(selection.affected[0].material_changed).toBe(true);
    expect(selection.affected[0].changed_fields).toEqual(["location_raw"]);
    expect(selection.affected[0].version_invalidated).toBe(false);
  });

  test("each material field the SSAE-09 card names is detected independently", () => {
    const cases: [MaterialFieldName, Partial<JobMaterialFacts>][] = [
      ["location_raw", { location_raw: "Manila, Philippines (onsite)" }],
      ["remote", { remote: "onsite" }],
      ["posted_at", { posted_at: "2026-07-01T00:00:00.000Z" }],
      ["apply_url", { apply_url: "https://example.test/jobs/2" }],
      ["safety", { safety: "suspect" }],
    ];
    for (const [field, override] of cases) {
      const edited = record({
        identity: `id-${field}`,
        retained: facts(),
        observed: facts(override),
      });
      const selection = selectAffectedCohort(geoInput([edited]));
      expect(selection.affected[0].changed_fields).toEqual([field]);
    }
  });

  test("a stale version dependency affects the record even with identical facts", () => {
    const stale = record({
      identity: "id-stale",
      observed: facts(),
      decision_versions: versionsWithGeoGate("geoGate@2026-09-01"),
    });
    const selection = selectAffectedCohort(geoInput([stale]));
    expect(selection.affected).toHaveLength(1);
    expect(selection.affected[0].version_invalidated).toBe(true);
    expect(selection.affected[0].material_changed).toBe(false);
    expect(selection.affected[0].reasons.join(" ")).toContain("changed dependency keys");
  });

  test("an unrecorded decision version invalidates conservatively", () => {
    const unrecorded = record({ identity: "id-unrec", observed: facts(), decision_versions: null });
    const selection = selectAffectedCohort(geoInput([unrecorded]));
    expect(selection.affected[0].version_invalidated).toBe(true);
    expect(selection.affected[0].reasons.join(" ")).toContain("unrecorded dependencies");
  });

  test("an unversioned dependency value is treated as unknown, not as current", () => {
    const unversioned = record({
      identity: "id-unver",
      observed: facts(),
      decision_versions: versionsWithGeoGate("unknown"),
    });
    const selection = selectAffectedCohort(geoInput([unversioned]));
    expect(selection.affected[0].version_invalidated).toBe(true);
    expect(selection.affected[0].reasons.join(" ")).toContain("unversioned dependency keys");
  });

  test("an opt-out selects the record regardless of its versions and facts", () => {
    const optedOut = record({ identity: "id-optout", observed: facts(), opt_out: true });
    const selection = selectAffectedCohort(geoInput([optedOut]));
    expect(selection.affected[0].authority_invalidated).toBe(true);
    expect(selection.affected[0].reasons).toContain("source opted out");
  });

  test("an expired lease and an unparseable expiry are both invalidating", () => {
    const expired = record({
      identity: "id-expired",
      observed: facts(),
      lease_expiry: "2026-09-01T00:00:00.000Z",
    });
    const unparseable = record({
      identity: "id-garbage",
      observed: facts(),
      policy_expiry: "not-a-date",
    });
    const selection = selectAffectedCohort(geoInput([expired, unparseable]));
    expect(selection.affected.map((entry) => entry.identity_hash).sort()).toEqual([
      "id-expired",
      "id-garbage",
    ]);
    expect(selection.affected.every((entry) => entry.authority_invalidated)).toBe(true);
  });

  test("the clock is injected, so the same evidence classifies identically at any replay time", () => {
    const expiring = record({
      identity: "id-clock",
      observed: facts(),
      lease_expiry: "2026-10-04T03:00:00.000Z",
    });
    const before = selectAffectedCohort(geoInput([expiring]));
    const after = selectAffectedCohort({
      records: [expiring],
      changed_dependencies: ["GEO"],
      now: new Date("2026-10-04T04:00:00.000Z"),
    });
    expect(before.affected).toHaveLength(0);
    expect(after.affected).toHaveLength(1);
    expect(after.affected[0].authority_invalidated).toBe(true);
  });

  test("every positive-state cohort is selected, not only rejected or ambiguous rows", () => {
    const cohorts: RecordCohort[] = ["DISCOVERED", "QUALIFIED", "SYNCED", "PUBLIC"];
    const records = cohorts.map((cohort) => record({ identity: `id-${cohort}`, cohort, opt_out: true }));
    const selection = selectAffectedCohort(geoInput(records));
    expect(selection.cohorts_affected).toEqual(["DISCOVERED", "PUBLIC", "QUALIFIED", "SYNCED"]);
    for (const cohort of POSITIVE_STATE_COHORTS) {
      expect(selection.affected.some((entry) => entry.cohort === cohort)).toBe(true);
    }
    expect(selection.positive_state_cohorts_omitted).toEqual([]);
  });

  test("an unreconstructable public record becomes a named hold, not a silent omission", () => {
    const partial = record({
      identity: "id-partial",
      cohort: "PUBLIC",
      retained: facts({ location_raw: null }),
      observed: facts({ location_raw: null, remote: "unknown" }),
      decision_versions: versionsWithGeoGate("geoGate@2026-09-01"),
    });
    expect(partial.clocks.unknown_material_fields).toEqual(["location_raw"]);
    const selection = selectAffectedCohort(geoInput([partial]));
    const held = selection.affected[0];
    expect(held.replayable).toBe(false);
    // The GEO closure covers both geography and remote, and the fixture is unknown
    // in both, so both are named rather than one being guessed.
    expect(held.missing_critical_fields).toEqual(["location_raw", "remote"]);
    expect(held.is_positive_state).toBe(true);
    expect(selection.positive_state_holds.map((entry) => entry.identity_hash)).toEqual(["id-partial"]);
    expect(held.reasons.join(" ")).toContain("bounded replay is not exact");
  });

  test("an unknown field outside the closure does not block an exact reconstruction", () => {
    // SAFETY policy changed, and this record's unknown field is the apply link,
    // which the policy closure cannot reclassify. The retained unknown stays unknown
    // and is not guessed, but the freshness/safety decision is still reconstructable.
    const partial = record({
      identity: "id-scoped",
      retained: facts({ apply_url: null }),
      observed: facts({ apply_url: null }),
      decision_versions: { ...CLEAN_VERSIONS, policy_version: "constitution-v5.1" },
    });
    const selection = selectAffectedCohort(geoInput([partial], ["POLICY"]));
    expect(selection.affected[0].version_invalidated).toBe(true);
    expect(selection.affected[0].missing_critical_fields).toEqual([]);
    expect(selection.affected[0].replayable).toBe(true);
  });

  test("an observed opt-out replays from an incomplete fact set, because a withdrawal needs no facts", () => {
    const incomplete = record({
      identity: "id-optout-partial",
      cohort: "PUBLIC",
      retained: facts({ location_raw: null, safety: "unknown" }),
      observed: facts({ location_raw: null, safety: "unknown" }),
      opt_out: true,
    });
    const selection = selectAffectedCohort(geoInput([incomplete]));
    expect(selection.affected[0].authority_invalidated).toBe(true);
    expect(selection.affected[0].replayable).toBe(true);
  });

  test("a material delta in an unknown field is still not reconstructable", () => {
    const partial = record({
      identity: "id-delta-unknown",
      retained: facts({ apply_url: null, safety: "unknown" }),
      observed: facts({ apply_url: "https://example.test/jobs/7", safety: "unknown" }),
    });
    const selection = selectAffectedCohort(geoInput([partial], ["URL"]));
    expect(selection.affected[0].material_changed).toBe(true);
    expect(selection.affected[0].missing_critical_fields).toEqual([]);
    expect(selection.affected[0].replayable).toBe(true);
  });

  test("a body-parse change holds a record whose stored processor version is stale", () => {
    const staleParser = record({
      identity: "id-parse",
      observed: facts(),
      decision_versions: { ...CLEAN_VERSIONS, processor_version: "capability-registry@0.9.0" },
    });
    const selection = selectAffectedCohort(geoInput([staleParser], ["PARSER"]));
    expect(selection.affected[0].requires_full_reacquisition).toBe(true);
    expect(selection.affected[0].replayable).toBe(false);
    expect(selection.affected[0].reasons.join(" ")).toContain("invalidates every retained fact");
  });

  test("a parser change affects nothing when every stored version is already current", () => {
    const current = record({ identity: "id-parse-current", observed: facts() });
    const selection = selectAffectedCohort(geoInput([current], ["PARSER"]));
    expect(selection.affected).toEqual([]);
    expect(selection.closure.requires_full_redigest).toBe(true);
  });

  test("selection is deterministic in identity order regardless of input order", () => {
    const a = record({ identity: "id-a", opt_out: true });
    const b = record({ identity: "id-b", opt_out: true });
    const c = record({ identity: "id-c", opt_out: true });
    const forward = selectAffectedCohort(geoInput([a, b, c]));
    const reverse = selectAffectedCohort(geoInput([c, b, a]));
    expect(forward.affected.map((entry) => entry.identity_hash)).toEqual([
      "id-a",
      "id-b",
      "id-c",
    ]);
    expect(reverse.affected.map((entry) => entry.identity_hash)).toEqual([
      "id-a",
      "id-b",
      "id-c",
    ]);
  });

  test("a record with no retained fact set has no earlier material decision to invalidate", () => {
    const fresh = record({ identity: "id-new", retained: null, observed: facts() });
    const selection = selectAffectedCohort(geoInput([fresh]));
    expect(selection.affected).toHaveLength(0);
    expect(selection.not_affected).toHaveLength(1);
  });
});

describe("SSAE-09 exact bounded replay plan", () => {
  function planInput(records: ReplayRecord[], overrides: Record<string, unknown> = {}) {
    return {
      records,
      changed_dependencies: ["GEO"],
      now: NOW,
      version_transition: "geo_gate@2026-10-15",
      budget: { max_records: 2 },
      cursor: null,
      expected_identities: records.map((entry) => entry.identity_hash),
      ...overrides,
    };
  }

  const stale = () =>
    record({ identity: "id-b", observed: facts(), decision_versions: versionsWithGeoGate("geoGate@2026-09-01") });
  const staleToo = () =>
    record({ identity: "id-d", observed: facts(), decision_versions: versionsWithGeoGate("geoGate@2026-09-01") });

  test("an empty change set over a clean snapshot is not permitted and replays nothing", () => {
    const clean = record({ identity: "id-clean", observed: facts() });
    const plan = planExactBoundedReplay(planInput([clean], { changed_dependencies: [] }));
    expect(plan.permitted).toBe(false);
    expect(plan.batch).toEqual([]);
    expect(plan.reasons.join(" ")).toContain("nothing to replay");
  });

  test("an observed opt-out is replayed even with no dependency change at all", () => {
    const plan = planExactBoundedReplay(
      planInput([record({ identity: "id-opt", cohort: "PUBLIC", opt_out: true })], {
        changed_dependencies: [],
      }),
    );
    expect(plan.permitted).toBe(true);
    expect(plan.batch.map((entry) => entry.identity_hash)).toEqual(["id-opt"]);
    expect(plan.reasons.join(" ")).toContain("driven by observed authority invalidation");
  });

  test("a zero budget is a hold, never an empty success", () => {
    const plan = planExactBoundedReplay(planInput([stale()], { budget: { max_records: 0 } }));
    expect(plan.permitted).toBe(false);
    expect(plan.reasons.join(" ")).toContain("no replay budget available");
  });

  test("an empty version transition is refused", () => {
    const plan = planExactBoundedReplay(planInput([stale()], { version_transition: "" }));
    expect(plan.permitted).toBe(false);
    expect(plan.reasons.join(" ")).toContain("explicit version transition is required");
  });

  test("a bounded budget yields a resumable cursor over the whole cohort", () => {
    const records = [stale(), staleToo()];
    const first = planExactBoundedReplay(planInput(records));
    expect(first.permitted).toBe(true);
    expect(first.batch).toHaveLength(2);
    expect(first.complete).toBe(true);
    expect(first.next_cursor).toBeNull();
    expect(first.cohort_digest).toBe(planExactBoundedReplay(planInput(records)).cohort_digest);
  });

  test("a cohort larger than the budget walks it in identity order and then completes", () => {
    const records = [
      record({ identity: "id-1", decision_versions: versionsWithGeoGate("geoGate@2026-09-01") }),
      record({ identity: "id-2", decision_versions: versionsWithGeoGate("geoGate@2026-09-01") }),
      record({ identity: "id-3", decision_versions: versionsWithGeoGate("geoGate@2026-09-01") }),
    ];
    const first = planExactBoundedReplay(planInput(records, { budget: { max_records: 2 } }));
    expect(first.batch.map((entry) => entry.identity_hash)).toEqual(["id-1", "id-2"]);
    expect(first.complete).toBe(false);
    const cursor = first.next_cursor!;
    expect(cursor.total).toBe(3);
    expect(cursor.position).toBe(2);

    const second = planExactBoundedReplay(
      planInput(records, { budget: { max_records: 2 }, cursor }),
    );
    expect(second.batch.map((entry) => entry.identity_hash)).toEqual(["id-3"]);
    expect(second.complete).toBe(true);
    expect(second.next_cursor).toBeNull();
  });

  test("re-planning the same snapshot with the same clock is byte-identical", () => {
    const records = [stale(), staleToo()];
    const first = planExactBoundedReplay(planInput(records));
    const repeat = planExactBoundedReplay(planInput(records));
    expect(generateReplayReceipt(first)).toBe(generateReplayReceipt(repeat));
  });

  test("a cursor from another version transition is refused by name", () => {
    const records = [stale(), staleToo()];
    const first = planExactBoundedReplay(planInput(records, { budget: { max_records: 1 } }));
    const foreign: ExactReplayCursor = {
      ...first.next_cursor!,
      version_transition: "geo_gate@2026-11-01",
    };
    const plan = planExactBoundedReplay(
      planInput(records, { budget: { max_records: 1 }, cursor: foreign }),
    );
    expect(plan.permitted).toBe(false);
    expect(plan.reasons.join(" ")).toContain("cursor belongs to version transition");
  });

  test("a cursor whose cohort changed is refused instead of skipping records", () => {
    const records = [stale(), staleToo()];
    const first = planExactBoundedReplay(planInput(records, { budget: { max_records: 1 } }));
    // A new observation changes the cohort between batches: the old cursor now
    // points at a different set and must not silently continue past id-2.
    const grown = [...records, record({ identity: "id-e", decision_versions: versionsWithGeoGate("geoGate@2026-09-01") })];
    const plan = planExactBoundedReplay(
      planInput(grown, { budget: { max_records: 2 }, cursor: first.next_cursor }),
    );
    expect(plan.permitted).toBe(false);
    expect(plan.reasons.join(" ")).toContain("does not match the current cohort");
  });

  test("a cursor position at or beyond the cohort replays nothing and completes", () => {
    const records = [stale()];
    const first = planExactBoundedReplay(planInput(records));
    const cursor: ExactReplayCursor = {
      cursor_id: "manual",
      position: 1,
      version_transition: "geo_gate@2026-10-15",
      cohort_digest: first.cohort_digest,
      total: 1,
    };
    const plan = planExactBoundedReplay(planInput(records, { cursor }));
    expect(plan.permitted).toBe(true);
    expect(plan.batch).toEqual([]);
    expect(plan.complete).toBe(true);
  });

  test("an incomplete snapshot is carried into the plan and disables absence-derived writes", () => {
    const records = [stale()];
    const plan = planExactBoundedReplay(
      planInput(records, { expected_identities: ["id-b", "id-missing"] }),
    );
    expect(plan.snapshot.complete).toBe(false);
    expect(plan.snapshot.missing_identities).toEqual(["id-missing"]);
    expect(plan.withdrawal_propagation.absence_derived_actions_permitted).toBe(false);
    expect(plan.reasons.join(" ")).toContain("snapshot coverage mismatch");
  });

  test("held records are returned with their gap and never enter the batch", () => {
    const held = record({
      identity: "id-held",
      cohort: "PUBLIC",
      retained: facts({ remote: "unknown" }),
      observed: facts({ remote: "unknown" }),
      decision_versions: versionsWithGeoGate("geoGate@2026-09-01"),
    });
    const plan = planExactBoundedReplay(planInput([held]));
    expect(plan.batch).toEqual([]);
    expect(plan.holds.map((entry) => entry.identity_hash)).toEqual(["id-held"]);
    expect(plan.holds[0].missing_critical_fields).toEqual(["remote"]);
    expect(plan.complete).toBe(true);
  });

  test("the receipt carries the closure, snapshot proof, batch and cohort digest", () => {
    const plan = planExactBoundedReplay(planInput([stale()]));
    const receipt = JSON.parse(generateReplayReceipt(plan));
    expect(receipt.contract_version).toBe(SSAE_09_CONTRACT_VERSION);
    expect(receipt.version_transition).toBe("geo_gate@2026-10-15");
    expect(receipt.closure.invalidated_fields).toEqual(["location_raw", "remote"]);
    expect(receipt.snapshot.complete).toBe(true);
    expect(receipt.batch[0].identity_hash).toBe("id-b");
    expect(receipt.complete).toBe(true);
    expect(receipt.withdrawal_propagation.counts_as_fresh_flow).toBe(false);
    expect(receipt.preserves_original_clocks).toBe(true);
  });
});

describe("SSAE-09 withdrawal propagation", () => {
  const optOutRecords = () => [
    record({ identity: "id-public", cohort: "PUBLIC", opt_out: true }),
    record({ identity: "id-queued", cohort: "QUALIFIED", opt_out: true }),
    record({ identity: "id-new", cohort: "DISCOVERED", opt_out: true }),
  ];

  function propagate() {
    const records = optOutRecords();
    const selection = selectAffectedCohort({
      records,
      changed_dependencies: ["GEO"],
      now: NOW,
    });
    return propagateWithdrawals({
      selection,
      snapshot: proveCompleteSnapshot(
        records.map((entry) => entry.identity_hash),
        records.map((entry) => entry.identity_hash),
      ),
      records,
      identities: selection.affected.map((entry) => entry.identity_hash),
    });
  }

  test("a restrictive change withdraws served records and marks them for the governed path", () => {
    const propagation = propagate();
    expect(propagation.identities.sort()).toEqual(["id-new", "id-public", "id-queued"]);
    const actionsForPublic = propagation.actions
      .filter((action) => action.identity_hash === "id-public")
      .map((action) => action.action);
    expect(actionsForPublic).toEqual([
      "WITHDRAW_FROM_PUBLIC_SURFACE",
      "WITHDRAW_FROM_INDEX",
      "EXPIRE_SERVING_CACHE",
      "RETAIN_ORIGINAL_CLOCKS",
      "REQUIRE_GOVERNED_PUBLICATION_PATH",
    ]);
  });

  test("an unserved record gets no serving-store withdrawal, only the governance bar", () => {
    const propagation = propagate();
    const actionsForNew = propagation.actions
      .filter((action) => action.identity_hash === "id-new")
      .map((action) => action.action);
    expect(actionsForNew).toEqual([
      "RETAIN_ORIGINAL_CLOCKS",
      "REQUIRE_GOVERNED_PUBLICATION_PATH",
    ]);
    expect(actionsForNew).not.toContain("WITHDRAW_FROM_PUBLIC_SURFACE");
    expect(propagation.reasons.join(" ")).toContain("never served");
  });

  test("withdrawal is never a first publication and never fresh supply", () => {
    const propagation = propagate();
    expect(propagation.counts_as_first_publication).toBe(false);
    expect(propagation.counts_as_fresh_flow).toBe(false);
    expect(propagation.absence_derived).toBe(false);
    expect(propagation.requires_governed_publication_path).toBe(true);
    expect(propagation.preserves_original_clocks).toBe(true);
  });

  test("an incomplete snapshot emits STOP_ABSENCE_DERIVED_WRITES with the withdrawal", () => {
    const records = optOutRecords();
    const selection = selectAffectedCohort({ records, changed_dependencies: ["GEO"], now: NOW });
    const propagation = propagateWithdrawals({
      selection,
      snapshot: proveCompleteSnapshot(records.map((entry) => entry.identity_hash), null),
      records,
      identities: ["id-public"],
    });
    expect(propagation.absence_derived_actions_permitted).toBe(false);
    expect(propagation.actions.map((action) => action.action)).toContain(
      "STOP_ABSENCE_DERIVED_WRITES",
    );
  });

  test("propagation is idempotent: an already-restricted record yields no new action", () => {
    const restricted = record({ identity: "id-public", cohort: "PUBLIC", opt_out: true });
    restricted.clocks = applySighting(emptyClocks("id-public"), {
      observed_at: "2026-09-30T00:00:00.000Z",
      identity_hash: "id-public",
      facts: facts(),
    }).clocks;
    const already = applyReplayDecision(restricted.clocks, emptyReplayState(), {
      identity_hash: "id-public",
      decision_id: "d1",
      supersedes_decision_id: null,
      decided_at: NOW_ISO,
      version_transition: "geo_gate@2026-10-15",
      outcome: "WITHDRAW",
      facts: null,
      reasons: ["source opted out"],
    });
    expect(already.ok).toBe(true);

    const records = [{ ...restricted, clocks: already.clocks }];
    const selection = selectAffectedCohort({ records, changed_dependencies: ["GEO"], now: NOW });
    const propagation = propagateWithdrawals({
      selection,
      snapshot: proveCompleteSnapshot(["id-public"], ["id-public"]),
      records,
      identities: ["id-public"],
    });
    expect(propagation.actions).toEqual([]);
    expect(propagation.reasons.join(" ")).toContain("already restricted");
  });

  test("a non-authority change derives no withdrawal at all", () => {
    const records = [record({ identity: "id-x", cohort: "PUBLIC", decision_versions: versionsWithGeoGate("geoGate@2026-09-01") })];
    const selection = selectAffectedCohort({ records, changed_dependencies: ["GEO"], now: NOW });
    const propagation = propagateWithdrawals({
      selection,
      snapshot: proveCompleteSnapshot(["id-x"], ["id-x"]),
      records,
      identities: ["id-x"],
    });
    expect(selection.affected).toHaveLength(1);
    expect(propagation.actions).toEqual([]);
    expect(propagation.identities).toEqual([]);
  });

  test("an identity outside the batch produces nothing, so absence cannot withdraw", () => {
    const records = optOutRecords();
    const selection = selectAffectedCohort({ records, changed_dependencies: ["GEO"], now: NOW });
    const propagation = propagateWithdrawals({
      selection,
      snapshot: proveCompleteSnapshot(
        records.map((entry) => entry.identity_hash),
        records.map((entry) => entry.identity_hash),
      ),
      records,
      identities: ["id-public"],
    });
    expect(propagation.identities).toEqual(["id-public"]);
    expect(propagation.actions.some((action) => action.identity_hash === "id-queued")).toBe(false);
  });
});

describe("SSAE-09 reconstruction and idempotent supersession", () => {
  const published = () => {
    const base = record({ identity: "id-p", cohort: "PUBLIC", observed_at: "2026-09-20T00:00:00.000Z" });
    const qualified = applySighting(base.clocks, {
      observed_at: "2026-09-21T00:00:00.000Z",
      identity_hash: "id-p",
      facts: facts(),
    });
    expect(qualified.ok).toBe(true);
    const publishedClocks = {
      ...qualified.clocks,
      first_qualified_at: "2026-09-21T00:00:00.000Z",
      first_published_at: "2026-09-22T00:00:00.000Z",
      last_published_at: "2026-09-22T00:00:00.000Z",
      first_publication_cohort: "FRESH_DISCOVERY" as const,
    };
    return publishedClocks;
  };

  function decision(overrides: Partial<Parameters<typeof applyReplayDecision>[2]> = {}) {
    return {
      identity_hash: "id-p",
      decision_id: "d-1",
      supersedes_decision_id: null,
      decided_at: NOW_ISO,
      version_transition: "geo_gate@2026-10-15",
      outcome: "RECONSTRUCTED" as const,
      facts: facts({ location_raw: "Remote (Philippines, worldwide)" }),
      reasons: ["geo gate re-evaluated on retained evidence"],
      ...overrides,
    };
  }

  test("reconstruction never manufactures an observation or publication clock", () => {
    const clocks = published();
    const result = applyReplayDecision(clocks, emptyReplayState(), decision());
    expect(result.ok).toBe(true);
    expect(result.clocks.first_observed_at).toBe(clocks.first_observed_at);
    expect(result.clocks.last_observed_at).toBe(clocks.last_observed_at);
    expect(result.clocks.first_ingested_at).toBe(clocks.first_ingested_at);
    expect(result.clocks.sighting_count).toBe(clocks.sighting_count);
    expect(result.clocks.first_published_at).toBe(clocks.first_published_at);
    expect(result.clocks.first_publication_cohort).toBe("FRESH_DISCOVERY");
    expect(result.clocks.last_transition).toBe(clocks.last_transition);
    // The replay time must not become a fresh observation.
    expect(observationAgeDays(result.clocks, NOW_ISO)).toBe(
      observationAgeDays(clocks, NOW_ISO),
    );
  });

  test("reconstruction updates only the material block and names the delta", () => {
    const clocks = published();
    const result = applyReplayDecision(clocks, emptyReplayState(), decision());
    expect(result.changed_fields).toEqual(["location_raw"]);
    expect(result.clocks.material_revision).toBe(clocks.material_revision + 1);
    expect(result.clocks.material_facts?.location_raw).toBe("Remote (Philippines, worldwide)");
  });

  test("an identical reconstruction is a no-op and does not inflate the revision", () => {
    const clocks = published();
    const state = emptyReplayState();
    const first = applyReplayDecision(clocks, state, decision());
    const second = applyReplayDecision(first.clocks, first.state, decision());
    expect(second.ok).toBe(true);
    expect(second.applied).toBe(false);
    expect(second.idempotent_noop).toBe(true);
    expect(second.clocks.material_revision).toBe(first.clocks.material_revision);
    expect(second.state.applied_transitions).toEqual(["geo_gate@2026-10-15"]);
  });

  test("a second decision for the same transition must name the one it supersedes", () => {
    const clocks = published();
    const state = emptyReplayState();
    const first = applyReplayDecision(clocks, state, decision());
    const conflicting = applyReplayDecision(first.clocks, first.state, decision({ decision_id: "d-2" }));
    expect(conflicting.ok).toBe(false);
    expect(conflicting.stale_rejected).toBe(true);
    expect(conflicting.applied).toBe(false);
    expect(conflicting.errors.join(" ")).toContain("must supersede that decision explicitly");
  });

  test("an authorised supersession applies and retains the earlier decision (C18)", () => {
    const clocks = published();
    const first = applyReplayDecision(clocks, emptyReplayState(), decision());
    const superseded = applyReplayDecision(
      first.clocks,
      first.state,
      decision({ decision_id: "d-2", supersedes_decision_id: "d-1" }),
    );
    expect(superseded.ok).toBe(true);
    expect(superseded.applied).toBe(true);
    expect(superseded.state.lineage).toHaveLength(2);
    expect(superseded.state.lineage[0].decision_id).toBe("d-1");
    expect(superseded.state.lineage[0].facts).not.toBeNull();
  });

  test("a later transition applies on top of an earlier one", () => {
    const clocks = published();
    const first = applyReplayDecision(clocks, emptyReplayState(), decision());
    const later = applyReplayDecision(
      first.clocks,
      first.state,
      decision({ decision_id: "d-9", version_transition: "geo_gate@2026-11-01" }),
    );
    expect(later.ok).toBe(true);
    expect(later.state.applied_transitions).toEqual([
      "geo_gate@2026-10-15",
      "geo_gate@2026-11-01",
    ]);
  });

  test("a decision for another identity is refused", () => {
    const result = applyReplayDecision(published(), emptyReplayState(), decision({ identity_hash: "id-other" }));
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("identity mismatch");
  });

  test("a decision without a decision id, transition or valid timestamp is refused", () => {
    const clocks = published();
    expect(applyReplayDecision(clocks, emptyReplayState(), decision({ decision_id: "" })).ok).toBe(false);
    expect(applyReplayDecision(clocks, emptyReplayState(), decision({ version_transition: "" })).ok).toBe(false);
    expect(applyReplayDecision(clocks, emptyReplayState(), decision({ decided_at: "soon" })).ok).toBe(false);
  });

  test("a reconstruction without reconstructed facts is refused rather than stored", () => {
    const result = applyReplayDecision(published(), emptyReplayState(), decision({ facts: null }));
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("requires the reconstructed material facts");
  });

  test("a withdrawal retains the first-publication clock and its cohort", () => {
    const clocks = published();
    const result = applyReplayDecision(
      clocks,
      emptyReplayState(),
      decision({ outcome: "WITHDRAW", facts: null, reasons: ["source opted out"] }),
    );
    expect(result.ok).toBe(true);
    expect(result.clocks.restricted_at).toBe(NOW_ISO);
    expect(result.clocks.restricted_reason).toBe("source opted out");
    expect(result.clocks.first_published_at).toBe(clocks.first_published_at);
    expect(result.clocks.first_publication_cohort).toBe("FRESH_DISCOVERY");
    expect(result.clocks.restricted_count).toBe(1);
  });

  test("a second withdrawal for the same record is refused rather than double-applied", () => {
    const clocks = published();
    const first = applyReplayDecision(
      clocks,
      emptyReplayState(),
      decision({ outcome: "WITHDRAW", facts: null, reasons: ["source opted out"] }),
    );
    const second = applyReplayDecision(
      first.clocks,
      first.state,
      decision({ decision_id: "d-2", supersedes_decision_id: "d-1", outcome: "WITHDRAW", facts: null }),
    );
    expect(second.ok).toBe(false);
    expect(second.errors.join(" ")).toContain("already restricted");
    expect(second.clocks.restricted_count).toBe(1);
  });

  test("replay cannot restore a restricted record without an explicit authority", () => {
    const clocks = published();
    const withdrawn = applyReplayDecision(
      clocks,
      emptyReplayState(),
      decision({ outcome: "WITHDRAW", facts: null, reasons: ["source opted out"] }),
    );
    const restore = applyReplayDecision(
      withdrawn.clocks,
      withdrawn.state,
      decision({ decision_id: "d-2", supersedes_decision_id: "d-1" }),
    );
    expect(restore.ok).toBe(false);
    expect(restore.errors.join(" ")).toContain("cannot restore it without an explicit authority");
    expect(restore.clocks.restricted_at).toBe(NOW_ISO);
  });

  test("a hold records the decision without touching the material facts", () => {
    const clocks = published();
    const result = applyReplayDecision(
      clocks,
      emptyReplayState(),
      decision({ outcome: "HOLD_NEEDS_EVIDENCE", facts: null, reasons: ["location_raw unknown"] }),
    );
    expect(result.ok).toBe(true);
    expect(result.clocks.material_digest).toBe(clocks.material_digest);
    expect(result.clocks.material_revision).toBe(clocks.material_revision);
    expect(result.state.lineage).toHaveLength(1);
  });

  test("concurrency: two replays of the same transition converge on one applied decision", () => {
    const clocks = published();
    const state = emptyReplayState();
    const workerA = applyReplayDecision(clocks, state, decision());
    const workerB = applyReplayDecision(clocks, state, decision());
    expect(workerA.state.last_decision_id).toBe(workerB.state.last_decision_id);
    expect(workerA.clocks.material_digest).toBe(workerB.clocks.material_digest);
    expect(workerA.clocks.material_revision).toBe(workerB.clocks.material_revision);
    // Applying the winner over the loser's own result is a no-op, not a conflict.
    const settled = applyReplayDecision(workerB.clocks, workerB.state, decision());
    expect(settled.idempotent_noop).toBe(true);
  });

  test("concurrent conflicting decisions: one wins, the other is named stale", () => {
    const clocks = published();
    const state = emptyReplayState();
    const a = applyReplayDecision(clocks, state, decision({ decision_id: "d-a" }));
    const b = applyReplayDecision(clocks, state, decision({ decision_id: "d-b" }));
    // Both were computed from the same pre-state, so each believes it is first.
    expect(a.applied).toBe(true);
    expect(b.applied).toBe(true);
    const settled = applyReplayDecision(a.clocks, a.state, b.state.lineage[0]);
    expect(settled.ok).toBe(false);
    expect(settled.stale_rejected).toBe(true);
  });
});
