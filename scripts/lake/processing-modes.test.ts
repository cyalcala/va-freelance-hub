/**
 * SSAE-07 — Exclusive processing modes and cache validity
 *
 * Deterministic offline tests over real repo code (`scripts/lake/processing-modes.ts`
 * and the SSAE-03 ranker it composes with). No network, no database, no
 * production mutation, no writer import.
 *
 * Labels: "SSAE-07:" (card) and "MATH-10:" / "MATH-06:" (challenges advanced).
 * Advances MATH-10 change detection / cache invalidation and MATH-06 publication
 * state invariants. Accepts nothing: publication remains gateway-only.
 */

import { describe, expect, it } from "bun:test";
import {
  applyConditionalResponse,
  decideProcessingMode,
  evaluateCacheValidity,
  generateProcessingModeReceipt,
  planBoundedReplay,
  SSAE_07_CONTRACT_VERSION,
  type CacheState,
  type ReplayCursor,
} from "./processing-modes";
import {
  CURRENT_VERSIONS,
  selectProcessingMode,
  type Dependency,
  type SourceMemoryRecord,
  type VersionDeps,
} from "./source-ranker";

const NOW = new Date("2026-10-04T02:00:00.000Z");
const FUTURE = "2026-12-01T00:00:00.000Z";
const PAST = "2026-09-01T00:00:00.000Z";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function createBaseRecord(overrides: Partial<SourceMemoryRecord> = {}): SourceMemoryRecord {
  const recent = "2026-10-04T01:00:00.000Z";
  return {
    source_id: "ssae07-source",
    provider_id: "ssae07-provider",
    declared_capability: "ats_json",
    endpoint_url: "https://example.com/api",
    payload_kind: "json",
    selected_processor: "ats_json",
    routing_warnings: [],
    fetch_state: {
      etag: "W/\"abc\"",
      last_modified: "Sat, 03 Oct 2026 00:00:00 GMT",
      last_body_hash: "body-1",
      last_fetch_at: recent,
      last_fetch_ok: true,
      consecutive_failures: 0,
      backoff_until: null,
    },
    lake_state: {
      last_raw_observation_id: 10,
      last_candidate_count: 40,
      last_qualified_ready: 12,
      last_ingestion_at: recent,
      last_sighting_at: recent,
    },
    publication_state: {
      compliance_state: "allowed",
      operational_state: "active",
      policy_expiry: FUTURE,
      opt_out: false,
      lease_expiry: FUTURE,
      last_decision: "ADMIT",
      last_decision_at: recent,
      last_publication_at: recent,
      last_publication_count: 3,
      last_publication_mode: "unlimited",
      concentration_status: "OK",
    },
    health_rollup: {
      recent_success_rate: 0.98,
      recent_ph_rate: 0.6,
      recent_false_ph_rate: 0,
      last_quality_check_at: recent,
      robots_last_checked_at: recent,
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

function createValidCache(overrides: Partial<CacheState> = {}): CacheState {
  return {
    evidence_expires_at: FUTURE,
    body_hash: "body-1",
    etag: "W/\"abc\"",
    last_modified: "Sat, 03 Oct 2026 00:00:00 GMT",
    stored_versions: { ...CURRENT_VERSIONS },
    unresolved_items: 0,
    ...overrides,
  };
}

function withVersions(patch: Partial<VersionDeps>): CacheState {
  return createValidCache({ stored_versions: { ...CURRENT_VERSIONS, ...patch } });
}

// ─── SSAE-07 / MATH-10: cache validity ────────────────────────────────────────

describe("SSAE-07 cache validity (MATH-10)", () => {
  it("SSAE-07/MATH-10: a fully recorded, unexpired, version-matched cache is valid", () => {
    const validity = evaluateCacheValidity(createValidCache(), CURRENT_VERSIONS, NOW);
    expect(validity.valid).toBe(true);
    expect(validity.invalidators).toEqual([]);
    expect(validity.unknown_version_keys).toEqual([]);
    expect(validity.mismatched_dependencies).toEqual([]);
  });

  it("SSAE-07/MATH-10: a hash alone cannot prove equivalence — a missing body digest invalidates", () => {
    const validity = evaluateCacheValidity(createValidCache({ body_hash: null }), CURRENT_VERSIONS, NOW);
    expect(validity.valid).toBe(false);
    expect(validity.invalidators).toContain("BODY_MISSING");
  });

  it("SSAE-07/MATH-10: an expired or never-recorded evidence lease invalidates", () => {
    const expired = evaluateCacheValidity(createValidCache({ evidence_expires_at: PAST }), CURRENT_VERSIONS, NOW);
    expect(expired.invalidators).toContain("EVIDENCE_TTL");
    const never = evaluateCacheValidity(createValidCache({ evidence_expires_at: null }), CURRENT_VERSIONS, NOW);
    expect(never.invalidators).toContain("EVIDENCE_TTL");
    // The boundary is inclusive: expiry at the evaluation instant is not current.
    const boundary = evaluateCacheValidity(
      createValidCache({ evidence_expires_at: NOW.toISOString() }),
      CURRENT_VERSIONS,
      NOW,
    );
    expect(boundary.invalidators).toContain("EVIDENCE_TTL");
  });

  it("SSAE-07/MATH-10: unknown or unversioned dependency state is named, never assumed current", () => {
    const unrecorded = evaluateCacheValidity(createValidCache({ stored_versions: null }), CURRENT_VERSIONS, NOW);
    expect(unrecorded.invalidators).toContain("UNKNOWN_DEPENDENCY");
    expect(unrecorded.unknown_version_keys.length).toBe(7);

    const unversioned = evaluateCacheValidity(withVersions({ jev_version: "unversioned" }), CURRENT_VERSIONS, NOW);
    expect(unversioned.invalidators).toContain("UNKNOWN_DEPENDENCY");
    expect(unversioned.unknown_version_keys).toEqual(["jev_version"]);
    // Unknown state is not a mismatch: it is an absence of evidence, not a change.
    expect(unversioned.mismatched_dependencies).toEqual([]);
  });

  it("SSAE-07/MATH-10: a changed dependency is reported by its decision dependency", () => {
    const geo = evaluateCacheValidity(withVersions({ geo_gate_version: "geoGate@2026-09-01" }), CURRENT_VERSIONS, NOW);
    expect(geo.invalidators).toContain("VERSION_MISMATCH");
    expect(geo.mismatched_dependencies).toEqual(["GEO"]);

    const broad = evaluateCacheValidity(
      withVersions({ geo_gate_version: "geoGate@2026-09-01", jev_version: "jev-1.14" }),
      CURRENT_VERSIONS,
      NOW,
    );
    expect(broad.mismatched_dependencies.sort()).toEqual(["GEO", "MODEL"]);
  });
});

// ─── SSAE-07 / MATH-10: exclusive mode selection ──────────────────────────────

describe("SSAE-07 exclusive mode selection (MATH-10, MATH-06)", () => {
  it("SSAE-07/MATH-10: valid evidence yields exactly one mode — REUSE", () => {
    const decision = decideProcessingMode({ record: createBaseRecord(), cache: createValidCache(), now: NOW });
    expect(decision.mode).toBe("REUSE");
    expect(decision.exclusive).toBe(true);
    expect(decision.disposition).toBe("REUSE_DURABLE_RESULT");
    expect(decision.feasibility.permitted).toBe(true);
    expect(decision.invalidators).toEqual([]);
    expect(decision.preserves_original_clocks).toBe(true);
    expect(decision.contract_version).toBe(SSAE_07_CONTRACT_VERSION);
  });

  it("SSAE-07/MATH-10: REUSE is unreachable once evidence is missing, expired or unversioned", () => {
    const modes = [
      decideProcessingMode({ record: createBaseRecord(), cache: createValidCache({ body_hash: null }), now: NOW }).mode,
      decideProcessingMode({ record: createBaseRecord(), cache: createValidCache({ evidence_expires_at: PAST }), now: NOW }).mode,
      decideProcessingMode({ record: createBaseRecord(), cache: withVersions({ jev_version: "unknown" }), now: NOW }).mode,
      decideProcessingMode({ record: createBaseRecord(), cache: createValidCache({ stored_versions: null }), now: NOW }).mode,
    ];
    for (const mode of modes) expect(mode).toBe("FULL");
  });

  it("SSAE-07/MATH-06: opt-out and withdrawal outrank a cached positive decision", () => {
    const optedOut = decideProcessingMode({
      record: createBaseRecord({ publication_state: { ...createBaseRecord().publication_state, opt_out: true } }),
      cache: createValidCache(),
      now: NOW,
    });
    expect(optedOut.mode).toBe("BOUNDED_REPLAY");
    expect(optedOut.disposition).toBe("REPLAY_AFFECTED_COHORT");
    expect(optedOut.invalidators).toContain("OPT_OUT");

    const withdrawn = decideProcessingMode({
      record: createBaseRecord(),
      cache: createValidCache(),
      now: NOW,
      withdrawal: true,
    });
    expect(withdrawn.mode).toBe("BOUNDED_REPLAY");
    expect(withdrawn.invalidators).toContain("WITHDRAWAL");

    const unsafe = decideProcessingMode({
      record: createBaseRecord(),
      cache: createValidCache(),
      now: NOW,
      safety_invalidation: true,
    });
    expect(unsafe.invalidators).toContain("SAFETY");
    expect(unsafe.mode).not.toBe("REUSE");
  });

  it("SSAE-07/MATH-06: mode selection follows the supplied clock, not the wall clock", () => {
    const expiredLease = createBaseRecord({
      publication_state: { ...createBaseRecord().publication_state, lease_expiry: PAST },
    });
    const decision = decideProcessingMode({ record: expiredLease, cache: createValidCache(), now: NOW });
    expect(decision.invalidators).toContain("LEASE_EXPIRY");
    expect(decision.mode).toBe("BOUNDED_REPLAY");
    // The same record is still REUSE-able one second before the expiry instant.
    const before = decideProcessingMode({
      record: createBaseRecord({
        publication_state: {
          ...createBaseRecord().publication_state,
          lease_expiry: new Date(NOW.getTime() + 1000).toISOString(),
        },
      }),
      cache: createValidCache(),
      now: NOW,
    });
    expect(before.mode).toBe("REUSE");
    expect(before.invalidators).toEqual([]);
  });

  it("SSAE-07/MATH-10: an owned hold replaces a bounded replay when evidence is missing", () => {
    const decision = decideProcessingMode({
      record: createBaseRecord({
        replay_coverage: {
          can_replay_geo_gate: false,
          can_replay_triage: true,
          can_replay_fingerprint: true,
          can_replay_conditional: true,
          can_replay_publication: true,
          missing_fields: ["geo_evidence"],
        },
      }),
      cache: createValidCache(),
      now: NOW,
      withdrawal: true,
    });
    expect(decision.mode).toBe("FULL");
    expect(decision.disposition).toBe("HOLD_NEEDS_PERMITTED_ACQUISITION");
    expect(decision.reasons.join(" ")).toContain("can_replay_geo_gate");
    expect(decision.reasons.join(" ")).toContain("geo_evidence");
  });

  it("SSAE-07/MATH-10: a single targeted change replays a bounded cohort; a broad change reindexes", () => {
    const targeted = decideProcessingMode({
      record: createBaseRecord(),
      cache: withVersions({ geo_gate_version: "geoGate@2026-09-01" }),
      now: NOW,
    });
    expect(targeted.mode).toBe("BOUNDED_REPLAY");
    expect(targeted.dependencies).toEqual(["GEO"]);

    const broad = decideProcessingMode({
      record: createBaseRecord(),
      cache: withVersions({ jev_version: "jev-1.14", processor_version: "capability-registry@2.0.0" }),
      now: NOW,
    });
    expect(broad.mode).toBe("REINDEX");
    expect(broad.disposition).toBe("RECOMPUTE_FROM_STORED");
    expect(broad.dependencies?.sort()).toEqual(["MODEL", "PARSER"]);
  });

  it("SSAE-07/MATH-10: changed index context reindexes without re-acquisition", () => {
    const decision = decideProcessingMode({
      record: createBaseRecord(),
      cache: createValidCache(),
      now: NOW,
      index_context_changed: true,
    });
    expect(decision.mode).toBe("REINDEX");
    expect(decision.disposition).toBe("RECOMPUTE_FROM_STORED");
    expect(decision.feasibility.permitted).toBe(true);
  });

  it("SSAE-07/MATH-06: a hard feasibility gate defers the action instead of authorizing it", () => {
    const deferred = decideProcessingMode({
      record: createBaseRecord({
        publication_state: { ...createBaseRecord().publication_state, opt_out: false },
        health_rollup: { ...createBaseRecord().health_rollup, robots_allows: false },
      }),
      cache: createValidCache(),
      now: NOW,
    });
    expect(deferred.disposition).toBe("DEFERRED_NO_ACTION");
    expect(deferred.feasibility.permitted).toBe(false);
    expect(deferred.feasibility.hardGate).toBe("ROBOTS");
    expect(deferred.reasons.join(" ")).toContain("deferred");

    const backoff = decideProcessingMode({
      record: createBaseRecord({
        fetch_state: { ...createBaseRecord().fetch_state, backoff_until: FUTURE },
      }),
      cache: createValidCache(),
      now: NOW,
    });
    expect(backoff.disposition).toBe("DEFERRED_NO_ACTION");
    expect(backoff.feasibility.hardGate).toBe("RATE_LIMIT");
  });

  it("SSAE-07/MATH-10: the SSAE-07 classification still agrees with the SSAE-03 ranker", () => {
    const combinations: Partial<VersionDeps>[] = [
      {},
      { geo_gate_version: "geoGate@2026-09-01" },
      { policy_version: "constitution-v5.1" },
      { jev_version: "jev-1.14" },
      { geo_gate_version: "geoGate@2026-09-01", jev_version: "jev-1.14" },
      { fingerprint_version: "fingerprint@v2" },
      { content_hash_version: "contentHash@v2" },
    ];
    for (const patch of combinations) {
      const record = createBaseRecord();
      const cache = withVersions(patch);
      const rankerMode = selectProcessingMode(
        { ...record, version_deps: cache.stored_versions as VersionDeps },
        CURRENT_VERSIONS,
      ).mode;
      const decided = decideProcessingMode({ record, cache, now: NOW }).mode;
      expect(decided).toBe(rankerMode);
    }
  });
});

// ─── SSAE-07 / MATH-10: conditional fetch outcomes ────────────────────────────

describe("SSAE-07 conditional fetch (MATH-10)", () => {
  it("SSAE-07/MATH-10: a 304 costs a request but renews neither observation nor evidence", () => {
    const outcome = applyConditionalResponse(createValidCache(), { http_status: 304, body_hash: null, now: NOW });
    expect(outcome.request_costed).toBe(true);
    expect(outcome.counts_as_qualifying_observation).toBe(false);
    expect(outcome.observations_renewed).toBe(false);
    expect(outcome.evidence_extended).toBe(false);
    expect(outcome.material_change).toBe(false);
    expect(outcome.evidence_expires_at).toBe(FUTURE);
    expect(outcome.validators).toEqual({
      etag: "W/\"abc\"",
      last_modified: "Sat, 03 Oct 2026 00:00:00 GMT",
      body_hash: "body-1",
    });
  });

  it("SSAE-07/MATH-10: a 200 with unchanged material content still does not renew evidence", () => {
    const outcome = applyConditionalResponse(createValidCache(), { http_status: 200, body_hash: "body-1", now: NOW });
    expect(outcome.counts_as_qualifying_observation).toBe(true);
    expect(outcome.material_change).toBe(false);
    expect(outcome.evidence_extended).toBe(false);
    expect(outcome.evidence_expires_at).toBe(FUTURE);
  });

  it("SSAE-07/MATH-10: a changed body is a material change and becomes unpersistable without a digest", () => {
    const changed = applyConditionalResponse(createValidCache(), { http_status: 200, body_hash: "body-2", now: NOW });
    expect(changed.material_change).toBe(true);
    expect(changed.validators.body_hash).toBe("body-2");
    expect(changed.persist_validators).toBe(true);

    const digestless = applyConditionalResponse(createValidCache(), { http_status: 200, body_hash: null, now: NOW });
    expect(digestless.persist_validators).toBe(false);
    expect(digestless.material_change).toBe(true);
    expect(digestless.note).toContain("cannot prove equivalence");
  });

  it("SSAE-07/MATH-10: unresolved items keep validators unpersistable on a 304", () => {
    const outcome = applyConditionalResponse(createValidCache({ unresolved_items: 3 }), {
      http_status: 304,
      body_hash: null,
      now: NOW,
    });
    expect(outcome.persist_validators).toBe(false);
    expect(outcome.unresolved_items).toBe(3);
  });

  it("SSAE-07/MATH-10: a transient error costs a request, keeps validators and is not an observation", () => {
    for (const status of [429, 500, 503]) {
      const outcome = applyConditionalResponse(createValidCache(), { http_status: status, body_hash: null, now: NOW });
      expect(outcome.request_costed).toBe(true);
      expect(outcome.counts_as_qualifying_observation).toBe(false);
      expect(outcome.persist_validators).toBe(false);
      expect(outcome.validators.body_hash).toBe("body-1");
      expect(outcome.material_change).toBe(false);
      expect(outcome.note).toContain("not evidence for permanent rejection");
    }
  });

  it("SSAE-07/MATH-10: a first observation against an empty cache is a material change", () => {
    const empty: CacheState = {
      evidence_expires_at: null,
      body_hash: null,
      etag: null,
      last_modified: null,
      stored_versions: null,
      unresolved_items: 0,
    };
    const outcome = applyConditionalResponse(empty, { http_status: 200, body_hash: "body-1", now: NOW });
    expect(outcome.material_change).toBe(true);
    expect(outcome.persist_validators).toBe(true);
    // The evidence lease is still not established by a fetch.
    expect(outcome.evidence_expires_at).toBeNull();
  });
});

// ─── SSAE-07 / MATH-06: bounded replay ────────────────────────────────────────

describe("SSAE-07 bounded replay (MATH-06, MATH-10)", () => {
  const transition = "geo_gate@2026-09-01";

  it("SSAE-07/MATH-06: a permissive plan covers qualified, synced and public records", () => {
    const plan = planBoundedReplay({
      record: createBaseRecord(),
      now: NOW,
      changed_dependencies: ["GEO"],
      version_transition: transition,
      cohort_size: 100,
      budget: { max_records: 25 },
      cursor: null,
    });
    expect(plan.permitted).toBe(true);
    expect(plan.mode).toBe("BOUNDED_REPLAY");
    expect(plan.affected_cohorts).toEqual(["QUALIFIED", "SYNCED", "PUBLIC"]);
    expect(plan.next_cursor).toEqual({
      cursor_id: `ssae07-source:${transition}`,
      position: 25,
      version_transition: transition,
    });
    expect(plan.complete).toBe(false);
    expect(plan.preserves_original_clocks).toBe(true);
  });

  it("SSAE-07/MATH-10: no dependency change means no replay", () => {
    const plan = planBoundedReplay({
      record: createBaseRecord(),
      now: NOW,
      changed_dependencies: [],
      version_transition: transition,
      cohort_size: 100,
      budget: { max_records: 25 },
      cursor: null,
    });
    expect(plan.permitted).toBe(false);
    expect(plan.holds).toEqual([]);
    expect(plan.next_cursor).toBeNull();
  });

  it("SSAE-07/MATH-10: a cursor advances deterministically and completes at the cohort size", () => {
    const cursor: ReplayCursor = { cursor_id: "c1", position: 25, version_transition: transition };
    const args = {
      record: createBaseRecord(),
      now: NOW,
      changed_dependencies: ["GEO"] as Dependency[],
      version_transition: transition,
      cohort_size: 40,
      budget: { max_records: 25 },
    };
    const first = planBoundedReplay({ ...args, cursor });
    const restart = planBoundedReplay({ ...args, cursor });
    expect(first.next_cursor).toEqual(restart.next_cursor);
    expect(first.complete).toBe(true);
    expect(first.next_cursor).toBeNull();
  });

  it("SSAE-07/MATH-10: a cursor from another version transition, missing evidence or no budget holds", () => {
    const staleCursor = planBoundedReplay({
      record: createBaseRecord(),
      now: NOW,
      changed_dependencies: ["GEO"],
      version_transition: transition,
      cohort_size: 100,
      budget: { max_records: 25 },
      cursor: { cursor_id: "c0", position: 10, version_transition: "geo_gate@2026-08-01" },
    });
    expect(staleCursor.permitted).toBe(false);
    expect(staleCursor.holds.join(" ")).toContain("geo_gate@2026-08-01");
    expect(staleCursor.next_cursor).toBeNull();

    const missing = planBoundedReplay({
      record: createBaseRecord({
        replay_coverage: {
          ...createBaseRecord().replay_coverage,
          can_replay_publication: false,
          missing_fields: ["d1_opportunity_id"],
        },
      }),
      now: NOW,
      changed_dependencies: ["POLICY"],
      version_transition: transition,
      cohort_size: 100,
      budget: { max_records: 25 },
      cursor: null,
    });
    expect(missing.permitted).toBe(false);
    expect(missing.holds.join(" ")).toContain("can_replay_publication");
    expect(missing.holds.join(" ")).toContain("d1_opportunity_id");
    expect(missing.mode).toBe("FULL");

    const unbudgeted = planBoundedReplay({
      record: createBaseRecord(),
      now: NOW,
      changed_dependencies: ["GEO"],
      version_transition: transition,
      cohort_size: 100,
      budget: { max_records: 0 },
      cursor: null,
    });
    expect(unbudgeted.permitted).toBe(false);
    expect(unbudgeted.holds).toContain("no replay budget available");

    const emptyCohort = planBoundedReplay({
      record: createBaseRecord(),
      now: NOW,
      changed_dependencies: ["GEO"],
      version_transition: transition,
      cohort_size: 0,
      budget: { max_records: 10 },
      cursor: null,
    });
    expect(emptyCohort.permitted).toBe(false);
    expect(emptyCohort.holds).toContain("affected cohort is empty");
  });

  it("SSAE-07/MATH-06: restrictive replay must include the public cohort even when only rejected rows were queried", () => {
    const plan = planBoundedReplay({
      record: createBaseRecord(),
      now: NOW,
      changed_dependencies: ["SOURCE_AUTHORITY", "POLICY"],
      version_transition: "policy-v5.3",
      cohort_size: 3,
      budget: { max_records: 10 },
      cursor: null,
    });
    expect(plan.affected_cohorts).toContain("PUBLIC");
    expect(plan.affected_cohorts).toContain("SYNCED");
    expect(plan.affected_cohorts).toContain("QUALIFIED");
  });
});

// ─── Receipt ──────────────────────────────────────────────────────────────────

describe("SSAE-07 receipt", () => {
  it("SSAE-07: the receipt is deterministic, versioned and preserves original clocks", () => {
    const decision = decideProcessingMode({ record: createBaseRecord(), cache: createValidCache(), now: NOW });
    const receipt = generateProcessingModeReceipt(decision);
    expect(receipt).toBe(generateProcessingModeReceipt(decision));
    const parsed = JSON.parse(receipt);
    expect(parsed.contract_version).toBe(SSAE_07_CONTRACT_VERSION);
    expect(parsed.source_id).toBe("ssae07-source");
    expect(parsed.mode).toBe("REUSE");
    expect(parsed.exclusive).toBe(true);
    expect(parsed.preserves_original_clocks).toBe(true);
    expect(parsed.feasibility.hard_gate).toBe("NONE");
    expect(parsed.invalidators).toEqual([]);
  });

  it("SSAE-07: the receipt names invalidators and the upstream ranker classification", () => {
    const decision = decideProcessingMode({
      record: createBaseRecord({
        publication_state: { ...createBaseRecord().publication_state, opt_out: true },
      }),
      cache: withVersions({ geo_gate_version: "geoGate@2026-09-01" }),
      now: NOW,
    });
    const parsed = JSON.parse(generateProcessingModeReceipt(decision));
    expect(parsed.mode).toBe("BOUNDED_REPLAY");
    expect(parsed.disposition).toBe("REPLAY_AFFECTED_COHORT");
    expect(parsed.invalidators).toContain("OPT_OUT");
    expect(parsed.invalidators).toContain("VERSION_MISMATCH");
    expect(parsed.upstream_mode).toBe("BOUNDED_REPLAY");
    expect(parsed.dependencies).toEqual(["POLICY", "SOURCE_AUTHORITY"]);
  });
});