/**
 * SSAE-08 Incremental Hierarchical Candidate Pool — Unit Tests
 *
 * Maps to MATH-01 (constrained source allocation), MATH-03 (portfolio coverage)
 * and MATH-13 (compute profiling / Amdahl). Every test drives real repository
 * code: the pool itself, the SSAE-03 ranker (`rankSources`), its feasibility gate
 * and its processing-mode selector. No constant-versus-constant assertions.
 *
 * Labels: SSAE-08: + MATH-01 / MATH-03 / MATH-13.
 */

import { describe, it, expect } from "bun:test";
import {
  createPool,
  applyEvents,
  markScored,
  dueWork,
  selectFromPool,
  boundedRebuildTick,
  auditSample,
  poolStats,
  admissibleCandidates,
  populationOrder,
  DEFAULT_POOL_CONFIG,
  type CandidatePool,
  type PoolConfig,
  type PoolEvent,
  type PoolSourceSeed,
} from "./candidate-pool";
import { rankSources, CURRENT_VERSIONS, type RankedSource, type SourceMemoryRecord } from "./source-ranker";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const T0 = "2026-10-04T00:00:00.000Z";
const DAY = 86400000;
const at = (days: number) => new Date(new Date(T0).getTime() + days * DAY).toISOString();

function record(overrides: Partial<SourceMemoryRecord> = {}): SourceMemoryRecord {
  const base: SourceMemoryRecord = {
    source_id: "src",
    provider_id: "greenhouse",
    declared_capability: "ats_json",
    endpoint_url: "https://boards-api.greenhouse.io/v1/boards/x/jobs",
    company_token: "x",
    payload_kind: "json",
    selected_processor: "ats_json",
    routing_warnings: [],
    fetch_state: {
      etag: null,
      last_modified: null,
      last_body_hash: null,
      last_fetch_at: T0,
      last_fetch_ok: true,
      consecutive_failures: 0,
      backoff_until: null,
    },
    lake_state: {
      last_raw_observation_id: 1,
      last_candidate_count: 40,
      last_qualified_ready: 8,
      last_ingestion_at: T0,
      last_sighting_at: T0,
    },
    publication_state: {
      compliance_state: "allowed",
      operational_state: "active",
      policy_expiry: null,
      opt_out: false,
      lease_expiry: null,
      last_decision: "ADMIT",
      last_decision_at: T0,
      last_publication_at: T0,
      last_publication_count: 3,
      last_publication_mode: "unlimited",
      concentration_status: "OK",
    },
    health_rollup: {
      recent_success_rate: 0.95,
      recent_ph_rate: 0.25,
      recent_false_ph_rate: 0.01,
      last_quality_check_at: T0,
      robots_last_checked_at: T0,
      robots_allows: true,
    },
    version_deps: { ...CURRENT_VERSIONS },
    retention: {
      raw_observation_ttl_days: 30,
      candidate_ttl_days: 180,
      sighting_ttl_days: 365,
      fetch_state_ttl_days: 90,
      publication_receipt_ttl_days: 3650,
    },
    replay_coverage: {
      can_replay_geo_gate: true,
      can_replay_triage: false,
      can_replay_fingerprint: true,
      can_replay_conditional: true,
      can_replay_publication: true,
      missing_fields: ["raw_payload_full", "jev_raw"],
    },
    material_digests: {
      fingerprint_hash: "fp",
      content_hash: "ch",
      description_hash: null,
      policy_hash: "constitution-v5.2",
    },
  };
  return { ...base, ...overrides };
}

/** Builds seeds by running the real SSAE-03 ranker over real source memory records. */
function seedsFromRanker(
  count: number,
  options: { observed?: boolean; weak?: boolean } = {}
): { seeds: PoolSourceSeed[]; ranked: RankedSource[]; excluded: RankedSource[] } {
  const families = ["greenhouse", "lever", "workable", "teamtailor"];
  const sources = Array.from({ length: count }, (_, i) => {
    const family = families[i % families.length];
    return record({
      source_id: `${family}-${String(i).padStart(3, "0")}`,
      provider_id: family,
      endpoint_url: `https://example.test/${family}/${i}/jobs`,
      lake_state: {
        last_raw_observation_id: i + 1,
        last_candidate_count: 20 + i,
        last_qualified_ready: 3 + (i % 7),
        last_ingestion_at: T0,
        last_sighting_at: options.observed === false ? null : T0,
      },
    });
  });

  if (options.weak) {
    // A permitted source the real ranker still excludes on the qualified-ready floor.
    sources.push(
      record({
        source_id: "recruitee-weak",
        provider_id: "recruitee",
        endpoint_url: "https://recruitee.com/weak/xml",
        declared_capability: "structured_xml",
        payload_kind: "xml",
        selected_processor: "structured_xml",
        lake_state: {
          last_raw_observation_id: 9999,
          last_candidate_count: 5,
          last_qualified_ready: 0,
          last_ingestion_at: T0,
          last_sighting_at: T0,
        },
      })
    );
  }

  const output = rankSources({ sources, currentConcentration: { sourceShares: {}, familyShares: {} }, epochTimestamp: T0 });
  const blocked = new Map<string, RankedSource>();
  for (const r of [...output.excluded, ...output.coldRevisit]) blocked.set(r.source_id, r);

  const seeds: PoolSourceSeed[] = sources.map((s) => {
    const row = blocked.get(s.source_id);
    return {
      source_id: s.source_id,
      family_id: s.provider_id,
      qualified_ready: s.lake_state.last_qualified_ready,
      candidate_total: s.lake_state.last_candidate_count,
      marginal_yield: s.lake_state.last_qualified_ready * s.health_rollup.recent_ph_rate,
      cost_cents: 10,
      hard_gate: row ? row.feasibility.hardGate : "NONE",
      last_observed_at: s.lake_state.last_sighting_at,
    };
  });

  return { seeds, ranked: output.ranked, excluded: output.excluded };
}

function poolOf(
  count: number,
  config: Partial<PoolConfig> = {},
  observed = true,
  weak = false
): { pool: CandidatePool; ranked: RankedSource[]; excluded: RankedSource[]; seeds: PoolSourceSeed[] } {
  const { seeds, ranked, excluded } = seedsFromRanker(count, { observed, weak });
  const { pool } = createPool(seeds, { config, now: T0 });
  return { pool, ranked, excluded, seeds };
}

function seedList(count: number, overrides: (i: number) => Partial<PoolSourceSeed> = () => ({})): PoolSourceSeed[] {
  const families = ["greenhouse", "lever", "workable"];
  return Array.from({ length: count }, (_, i) => ({
    source_id: `s-${String(i).padStart(3, "0")}`,
    family_id: families[i % families.length],
    qualified_ready: 4,
    candidate_total: 20,
    marginal_yield: 2,
    cost_cents: 10,
    last_observed_at: T0,
    ...overrides(i),
  }));
}

function observation(sourceId: string, overrides: Partial<Extract<PoolEvent, { kind: "OBSERVATION" }>> = {}): PoolEvent {
  return {
    kind: "OBSERVATION",
    source_id: sourceId,
    at: T0,
    qualified_ready: 5,
    candidate_total: 25,
    marginal_yield: 3,
    cost_cents: 10,
    ...overrides,
  };
}

/** Feeds a ranker output whose score is forced, keeping real feasibility metadata. */
function withScore(ranked: RankedSource[], sourceId: string, score: number): RankedSource[] {
  const found = ranked.find((r) => r.source_id === sourceId);
  expect(found).toBeDefined();
  return ranked.map((r) => (r.source_id === sourceId ? { ...r, score } : r));
}

// ─── Construction ─────────────────────────────────────────────────────────────

describe("SSAE-08: MATH-03 construction — two-tier bounded population", () => {
  it("derives family rollups from member entries and accounts the enumeration as a full scan", () => {
    const { pool, seeds } = poolOf(40);
    const stats = poolStats(pool);

    expect(stats.population).toBe(seeds.length);
    expect(stats.entries_retained).toBe(seeds.length);
    expect(stats.families).toBe(4);
    expect(pool.families.greenhouse.member_source_ids.length).toBe(10);

    const family = pool.families.greenhouse;
    const members = family.member_source_ids.map((id) => pool.entries[id]);
    expect(family.qualified_ready_total).toBe(members.reduce((s, e) => s + e.qualified_ready, 0));
    expect(family.candidate_total).toBe(members.reduce((s, e) => s + e.candidate_total, 0));
    expect(family.mean_marginal_yield).toBeCloseTo(
      members.reduce((s, e) => s + e.marginal_yield, 0) / members.length,
      10
    );
    expect(family.stale).toBe(false);
    expect(pool.audit_sweeps).toBe(0);
  });

  it("blocks a seed whose real feasibility gate is not NONE and records the gate reason", () => {
    const optedOut = record({ source_id: "opted-out", publication_state: { ...record().publication_state, opt_out: true } });
    const ranked = rankSources({
      sources: [optedOut],
      currentConcentration: { sourceShares: {}, familyShares: {} },
      epochTimestamp: T0,
    });
    expect(ranked.ranked).toHaveLength(0);
    const excluded = ranked.excluded[0];
    expect(excluded.feasibility.hardGate).toBe("OPT_OUT");

    const { pool } = createPool(
      [
        {
          source_id: "opted-out",
          family_id: "greenhouse",
          qualified_ready: 0,
          candidate_total: 0,
          marginal_yield: 0,
          cost_cents: 0,
          hard_gate: excluded.feasibility.hardGate,
          last_observed_at: T0,
        },
      ],
      { now: T0 }
    );
    expect(pool.entries["opted-out"].state).toBe("BLOCKED");
    expect(pool.entries["opted-out"].hard_gate).toBe("OPT_OUT");
    expect(pool.families.greenhouse.blocked_count).toBe(1);
  });

  it("marks never-observed seeds COLD with an explicit revisit date instead of dropping them", () => {
    const { pool } = poolOf(12, {}, false);
    const stats = poolStats(pool);
    expect(stats.states.COLD).toBe(12);
    expect(stats.population).toBe(12);
    for (const entry of Object.values(pool.entries)) {
      expect(entry.cold_revisit_due_at).toBe(T0);
      expect(entry.last_observed_at).toBeNull();
    }
    expect(dueWork(pool, { now: T0 }).work.filter((w) => w.kind === "ENTRY_REVISIT")).toHaveLength(12);
    expect(dueWork(pool, { now: T0 }).work.filter((w) => w.kind === "ENTRY_RESCORE")).toHaveLength(0);
  });

  it("retains overflow beyond the population bound with a revisit trigger instead of deleting it", () => {
    const { pool } = createPool(seedList(50), { config: { maxPopulation: 20 }, now: T0 });
    const stats = poolStats(pool);
    expect(stats.population).toBe(50);
    expect(stats.entries_retained).toBe(20);
    expect(stats.overflow_retained).toBe(30);
    expect(pool.overflow.every((e) => e.cold_revisit_due_at !== null && e.state !== "WITHDRAWN")).toBe(true);
    expect(populationOrder(pool)).toHaveLength(50);
    expect(auditSample(pool, 5).sample.length).toBe(10);
  });
});

// ─── Incremental accounting (MATH-13) ─────────────────────────────────────────

describe("SSAE-08: MATH-13 incremental update — no O(N) rescore per epoch", () => {
  it("touches only the named entries and their own family summaries", () => {
    const { pool } = poolOf(200);
    const before = pool.entries["lever-001"].last_event_seq;

    const { pool: next, accounting } = applyEvents(pool, [observation("lever-001"), observation("workable-002")]);

    expect(accounting.events_applied).toBe(2);
    expect(accounting.entries_updated).toBe(2);
    expect(accounting.summaries_updated).toBe(2);
    expect(accounting.rows_read).toBe(4);
    expect(accounting.full_rescan).toBe(false);
    expect(accounting.rows_read).toBeLessThan(accounting.entries_updated + 6);
    expect(next.entries["lever-001"].last_event_seq).toBeGreaterThan(before);
    expect(next.entries["greenhouse-000"].last_event_seq).toBe(0);
  });

  it("never mutates the input pool and always returns a new versioned object", () => {
    const { pool } = poolOf(30);
    const snapshot = JSON.stringify(pool);

    const applied = applyEvents(pool, [observation("s-000")].map((e) => ({ ...e, source_id: "greenhouse-000" })));
    const scored = markScored(applied.pool, [{ source_id: "greenhouse-000", score: 1.5 }]);
    const selected = selectFromPool(scored.pool, []);

    expect(JSON.stringify(pool)).toBe(snapshot);
    expect(applied.pool).not.toBe(pool);
    expect(scored.pool).not.toBe(applied.pool);
    expect(selected.pool).not.toBe(scored.pool);
    expect(scored.pool.pool_version).toBe(applied.pool.pool_version + 1);
    expect(selected.pool.pool_version).toBe(scored.pool.pool_version + 1);
    expect(selected.pool.seq).toBe(applied.pool.seq);
  });

  it("keeps total incremental work below one full rescore per epoch across many epochs", () => {
    const { pool, ranked } = poolOf(200, { maxPoolSize: 10 });
    const ids = populationOrder(pool);
    let current = pool;
    let epochs = 0;
    let totalEntryUpdates = 0;

    for (let e = 0; e < 10; e++) {
      const target = ids[e];
      const applied = applyEvents(current, [observation(target, { at: at(e) })]);
      const scored = markScored(applied.pool, [{ source_id: target, score: 1 + e * 0.01 }]);
      const selected = selectFromPool(scored.pool, ranked.slice(0, 10));
      totalEntryUpdates += applied.accounting.entries_updated + scored.accounting.entries_updated;
      current = selected.pool;
      epochs += 1;
    }

    expect(epochs).toBe(10);
    // 20 events over a 200-row population: nowhere near a per-epoch O(N) rescore.
    expect(totalEntryUpdates).toBe(20);
    expect(totalEntryUpdates).toBeLessThan(current.population * epochs);
    expect(current.audit_sweeps).toBe(0);
  });

  it("returns only affected work as due and clears it after scoring", () => {
    const { pool } = poolOf(60);
    const applied = applyEvents(pool, [observation("lever-005", { at: at(1) })]);
    expect(dueWork(applied.pool, { now: at(1) }).work.filter((w) => w.source_id === "lever-005")).toHaveLength(1);

    const scored = markScored(applied.pool, [{ source_id: "lever-005", score: 2.5 }]);
    expect(dueWork(scored.pool, { now: at(1) }).work.filter((w) => w.source_id === "lever-005")).toHaveLength(0);
  });

  it("bounds the due-work listing and reports truncation", () => {
    const { pool } = poolOf(100, {}, false);
    const first = dueWork(pool, { now: T0, limit: 10 });
    expect(first.truncated).toBe(true);
    expect(first.work).toHaveLength(10);
    expect(first.population).toBe(100);
  });
});

// ─── Invalidation and withdrawal ──────────────────────────────────────────────

describe("SSAE-08: MATH-01 invalidation — a restrictive gate outranks any cached score", () => {
  it("blocks on a restrictive invalidation, clears the score and drops the selected slot", () => {
    const { pool, ranked } = poolOf(40, { maxPoolSize: 5 });
    const first = selectFromPool(pool, ranked);
    const selectedId = poolStats(first.pool).selected[0];
    expect(selectedId).toBeDefined();

    const invalidated = applyEvents(first.pool, [
      { kind: "INVALIDATION", source_id: selectedId, at: at(1), reason: "robots.txt now disallows", hard_gate: "ROBOTS" },
    ]);

    expect(invalidated.pool.entries[selectedId].state).toBe("BLOCKED");
    expect(invalidated.pool.entries[selectedId].score).toBeNull();
    expect(invalidated.pool.entries[selectedId].consecutive_selected).toBe(0);
    expect(poolStats(invalidated.pool).selected).not.toContain(selectedId);
    expect(dueWork(invalidated.pool, { now: at(1) }).work.some((w) => w.source_id === selectedId)).toBe(false);
  });

  it("keeps a non-restrictive invalidation revisitable rather than deleting the entry", () => {
    const { pool, ranked } = poolOf(40, { maxPoolSize: 5 });
    const first = selectFromPool(pool, ranked);
    const selectedId = poolStats(first.pool).selected[0];

    const invalidated = applyEvents(first.pool, [
      { kind: "INVALIDATION", source_id: selectedId, at: at(1), reason: "content hash changed" },
    ]);
    const entry = invalidated.pool.entries[selectedId];

    expect(entry.state).toBe("CANDIDATE");
    expect(entry.hard_gate).toBe("NONE");
    expect(entry.score).toBeNull();
    expect(invalidated.pool.population).toBe(pool.population);
    expect(dueWork(invalidated.pool, { now: at(1) }).work).toContainEqual(
      expect.objectContaining({ kind: "ENTRY_RESCORE", source_id: selectedId })
    );
  });

  it("never selects a withdrawn entry even when the ranker marks it permitted and top-scoring", () => {
    const { pool, ranked } = poolOf(40, { maxPoolSize: 5 });
    const target = ranked[0].source_id;
    const withdrawn = applyEvents(pool, [{ kind: "WITHDRAWN", source_id: target, at: at(1), reason: "owner opt-out" }]);

    const forced = selectFromPool(withdrawn.pool, withScore(ranked, target, 9999));

    expect(forced.pool.entries[target].state).toBe("WITHDRAWN");
    expect(forced.pool.entries[target].hard_gate).toBe("OPT_OUT");
    expect(poolStats(forced.pool).selected).not.toContain(target);
    expect(admissibleCandidates(withScore(ranked, target, 9999)).map((r) => r.source_id)).toContain(target);
    expect(forced.accounting.full_rescan).toBe(false);
  });

  it("restores authority only as a candidate owing a fresh score", () => {
    const { pool } = poolOf(20);
    const withdrawn = applyEvents(pool, [{ kind: "WITHDRAWN", source_id: "lever-001", at: at(1), reason: "opt-out" }]);
    const restored = applyEvents(withdrawn.pool, [
      { kind: "AUTHORITY_RESTORED", source_id: "lever-001", at: at(2), hard_gate: "NONE" },
    ]);

    expect(restored.pool.entries["lever-001"].state).toBe("CANDIDATE");
    expect(restored.pool.entries["lever-001"].score).toBeNull();
    expect(restored.pool.families.lever.withdrawn_count).toBe(0);
  });

  it("counts events for an unknown source without inventing an entry", () => {
    const { pool } = poolOf(20);
    const applied = applyEvents(pool, [observation("not-in-pool")]);
    expect(applied.accounting.events_applied).toBe(1);
    expect(applied.accounting.entries_updated).toBe(0);
    expect(Object.keys(applied.pool.entries)).toHaveLength(20);
  });
});

// ─── Selection with hysteresis ────────────────────────────────────────────────

describe("SSAE-08: MATH-01 selection — hysteresis prevents oscillation", () => {
  it("refuses to displace an incumbent on a sub-threshold near tie", () => {
    const { pool, ranked } = poolOf(40, { maxPoolSize: 3, hysteresisFactor: 1.1 });
    const first = selectFromPool(pool, ranked);
    const selected = poolStats(first.pool).selected;
    expect(selected).toHaveLength(3);

    const incumbentId = selected[selected.length - 1];
    const outsider = ranked.find((r) => !selected.includes(r.source_id))!;
    const incumbentScore = first.pool.entries[incumbentId].score ?? 0;
    const nearTie = Math.min(incumbentScore * 1.09, outsider.score + incumbentScore * 1.09);
    const nudged = withScore(withScore(ranked, outsider.source_id, nearTie), incumbentId, incumbentScore);

    const second = selectFromPool(first.pool, nudged);
    expect(poolStats(second.pool).selected).toContain(incumbentId);
    expect(second.pool.entries[incumbentId].consecutive_selected).toBe(2);
  });

  it("displaces an incumbent only when a challenger clearly exceeds the hysteresis band", () => {
    const { pool, ranked } = poolOf(40, { maxPoolSize: 3, hysteresisFactor: 1.1 });
    const first = selectFromPool(pool, ranked);
    const selected = poolStats(first.pool).selected;
    const weakest = selected[selected.length - 1];
    const outsider = ranked.find((r) => !selected.includes(r.source_id))!;
    const incumbentScore = first.pool.entries[weakest].score ?? 0;

    const beaten = selectFromPool(
      first.pool,
      withScore(withScore(ranked, outsider.source_id, incumbentScore * 1.11), weakest, incumbentScore)
    );

    expect(poolStats(beaten.pool).selected).not.toContain(weakest);
    expect(poolStats(beaten.pool).selected).toContain(outsider.source_id);
    expect(beaten.pool.entries[weakest].state).toBe("CANDIDATE");
    expect(beaten.pool.entries[weakest].cold_revisit_due_at).not.toBeNull();
  });

  it("produces an identical selected set for two alternating near-tie epochs", () => {
    const { pool, ranked } = poolOf(40, { maxPoolSize: 4, hysteresisFactor: 1.25 });
    const first = selectFromPool(pool, ranked);
    const outsider = ranked[5];
    const base = first.pool.entries[poolStats(first.pool).selected[0]].score ?? 1;

    const epochA = selectFromPool(first.pool, withScore(ranked, outsider.source_id, base));
    const epochB = selectFromPool(epochA.pool, withScore(ranked, outsider.source_id, base * 1.2));

    expect(poolStats(epochB.pool).selected).toEqual(poolStats(epochA.pool).selected);
  });

  it("bounds the selected pool and demotes the remainder with a revisit date", () => {
    const { pool, ranked } = poolOf(60, { maxPoolSize: 4 });
    const wide = selectFromPool(pool, ranked, { now: T0 });
    const wideSelected = poolStats(wide.pool).selected;
    const narrowed = selectFromPool(wide.pool, ranked, { now: at(1) });
    const stats = poolStats(narrowed.pool);

    expect(stats.selected).toHaveLength(4);
    expect(stats.population).toBe(60);
    expect(narrowed.accounting.full_rescan).toBe(false);
    const demoted = wideSelected.filter((id) => !stats.selected.includes(id));
    for (const id of demoted) {
      expect(narrowed.pool.entries[id].state).toBe("CANDIDATE");
      expect(narrowed.pool.entries[id].cold_revisit_due_at).not.toBeNull();
      expect(narrowed.pool.entries[id].state_reason).toContain("retained for revisit");
    }
    expect(narrowed.pool.population).toBe(wide.pool.population);
    expect(Object.keys(narrowed.pool.entries)).toHaveLength(60);
  });

  it("skips ranker rows the ranker itself excluded", () => {
    const { pool, ranked, excluded: poolExclude } = poolOf(40, { maxPoolSize: 10 }, true, true);
    const weak = poolExclude.filter((r) => r.source_id === "recruitee-weak");
    expect(weak.length).toBe(1);
    expect(weak[0].feasibility.permitted).toBe(true);
    expect(weak[0].feasibility.hardGate).toBe("NONE");
    expect(pool.entries["recruitee-weak"].hard_gate).toBe("NONE");

    const selected = selectFromPool(pool, [...ranked, ...weak]);
    expect(poolStats(selected.pool).selected).toContain(ranked[0].source_id);
    expect(poolStats(selected.pool).selected).not.toContain("recruitee-weak");
  });

  it("reports family shares of the selected set that sum to one", () => {
    const { pool, ranked } = poolOf(40, { maxPoolSize: 8 });
    const stats = poolStats(selectFromPool(pool, ranked).pool);
    const sum = Object.values(stats.selected_family_share).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1, 10);
    expect(Object.keys(stats.selected_family_share).length).toBeGreaterThan(1);
  });
});

// ─── Bounded rebuild and audit ────────────────────────────────────────────────

describe("SSAE-08: MATH-13 bounded rebuild — no O(N) heartbeat", () => {
  it("visits at most one batch per tick and covers the whole population over a sweep", () => {
    const { pool } = poolOf(300, { rebuildBatchSize: 100 });
    const seen: string[] = [];
    let ticks = 0;
    let current = pool;
    let sweepComplete = false;

    while (!sweepComplete && ticks < 10) {
      const tick = boundedRebuildTick(current, { now: at(1) });
      expect(tick.visited.length).toBeLessThanOrEqual(100);
      expect(tick.rows_read).toBeLessThanOrEqual(100 + Object.keys(current.families).length);
      seen.push(...tick.visited);
      sweepComplete = tick.sweep_complete;
      current = tick.pool;
      ticks += 1;
    }

    expect(ticks).toBe(3);
    expect(sweepComplete).toBe(true);
    expect(new Set(seen).size).toBe(300);
    expect(current.audit_sweeps).toBe(1);
  });

  it("marks cold-by-age entries revisitable without deleting any source", () => {
    const { pool } = poolOf(20, { rebuildBatchSize: 20, coldRevisitDays: 7 });
    const tick = boundedRebuildTick(pool, { now: at(30) });

    expect(tick.refreshed.length).toBe(20);
    expect(tick.pool.population).toBe(20);
    expect(Object.keys(tick.pool.entries)).toHaveLength(20);
    for (const entry of Object.values(tick.pool.entries)) {
      expect(entry.state).toBe("COLD");
      expect(entry.cold_revisit_due_at).toBe(at(30));
      expect(dueWork(tick.pool, { now: at(30) }).work.some((w) => w.source_id === entry.source_id)).toBe(true);
    }
  });

  it("surfaces a stale family rollup and clears it on a later tick", () => {
    const { pool } = poolOf(30, { rebuildBatchSize: 5 });
    const stale: CandidatePool = {
      ...pool,
      families: {
        ...pool.families,
        lever: { ...pool.families.lever, last_event_seq: 0, accounted_source_count: 0, stale: true, unaccounted_event_count: 7 },
      },
    };

    expect(dueWork(stale, { now: T0 }).work).toContainEqual(
      expect.objectContaining({ kind: "FAMILY_RECOMPUTE", family_id: "lever" })
    );

    const tick = boundedRebuildTick(stale, { now: T0 });
    expect(tick.pool.families.lever.stale).toBe(false);
    expect(tick.pool.families.lever.unaccounted_event_count).toBe(0);
    expect(tick.pool.families.lever.qualified_ready_total).toBeGreaterThan(0);
  });

  it("produces a deterministic bounded audit sample that includes deferred overflow rows", () => {
    const { pool } = createPool(seedList(40), { config: { maxPopulation: 30 }, now: T0 });
    const first = auditSample(pool, 4);
    const second = auditSample(pool, 4);

    expect(first.sample.map((e) => e.source_id)).toEqual(second.sample.map((e) => e.source_id));
    expect(first.sample).toHaveLength(10);
    expect(first.coverage).toBeCloseTo(0.25, 10);
    expect(first.sample.some((e) => pool.overflow.some((o) => o.source_id === e.source_id))).toBe(true);
    expect(pool.config.maxPopulation).toBe(30);
  });
});

// ─── End-to-end incremental cycle ─────────────────────────────────────────────

describe("SSAE-08: MATH-01/03 cycle — ranker output drives the bounded pool", () => {
  it("scores, selects, observes and re-selects without a full rescan", () => {
    const { pool, ranked, seeds } = poolOf(80, { maxPoolSize: 6 });
    const stats = poolStats(pool);
    expect(stats.population).toBe(seeds.length);
    expect(ranked.length).toBeGreaterThan(stats.config.maxPoolSize);

    const cycle1 = selectFromPool(pool, ranked);
    expect(poolStats(cycle1.pool).selected).toHaveLength(6);

    const target = poolStats(cycle1.pool).selected[0];
    const applied = applyEvents(cycle1.pool, [observation(target, { at: at(1), qualified_ready: 40, marginal_yield: 30 })]);
    const rescored = markScored(applied.pool, [{ source_id: target, score: 30 }]);
    const cycle2 = selectFromPool(rescored.pool, withScore(ranked, target, 30));

    expect(poolStats(cycle2.pool).selected).toContain(target);
    expect(cycle2.pool.entries[target].marginal_yield).toBe(30);
    expect(cycle2.pool.families[cycle2.pool.entries[target].family_id].qualified_ready_total).toBeGreaterThan(0);
    expect(applied.accounting.entries_updated).toBe(1);
    expect(applied.accounting.full_rescan).toBe(false);
  });

  it("keeps the default configuration inside its declared bounds", () => {
    expect(DEFAULT_POOL_CONFIG.maxPoolSize).toBeLessThan(DEFAULT_POOL_CONFIG.maxPopulation);
    expect(DEFAULT_POOL_CONFIG.hysteresisFactor).toBeGreaterThan(1);
    expect(DEFAULT_POOL_CONFIG.rebuildBatchSize).toBeLessThan(DEFAULT_POOL_CONFIG.maxPopulation);
    expect(DEFAULT_POOL_CONFIG.maxDueWorkPerEpoch).toBeLessThan(DEFAULT_POOL_CONFIG.maxPopulation);
    expect(DEFAULT_POOL_CONFIG.coldRevisitDays).toBeGreaterThan(0);
  });
});