/**
 * Incremental Hierarchical Candidate Pool — scripts/lake/candidate-pool.ts
 *
 * SSAE-08: a pure, versioned, bounded hierarchical candidate pool over source
 * memory records. Two tiers: provider-family summaries (upper tier) and
 * per-source candidate entries (lower tier). State advances from explicit events
 * (observation, invalidation, withdrawal, authority restoration) instead of a
 * full O(N) rescore every epoch.
 *
 * Depends on: SSAE-02 (SourceMemoryRecord shape), SSAE-03 (ranked output).
 * Enables: SSAE-09 (job delta over a stable pool), SSAE-10 (allocator).
 *
 * Scope guards, all enforced below:
 * - Pure. No writer import, no DB client, no network, no production mutation.
 * - Every mutation returns a NEW pool object; the input is never mutated.
 * - A pool entry mirrors hard feasibility and withdrawal, so pool selection can
 *   never admit an opted-out, robots-disallowed, backoff-blocked or expired-lease
 *   entity. The pool grants no publication authority whatsoever.
 * - Dormancy is never deletion: an entry that leaves the selected set keeps an
 *   explicit cold-revisit due date and stays in the population.
 * - Per-epoch accounting (rowsRead / entriesUpdated / summariesUpdated) makes the
 *   "no full rescore disguised as sparsity" claim falsifiable instead of asserted.
 *
 * Run: bun run scripts/lake/candidate-pool.ts --help
 */

import type { FeasibilityGate, RankedSource } from "./source-ranker";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Hard gate values mirrored from the SSAE-03 feasibility gate. */
export type HardGate = FeasibilityGate["hardGate"];

/** Lifecycle position of an entry inside the pool. */
export type PoolState =
  /** In the bounded selected candidate pool. */
  | "SELECTED"
  /** Known, permitted, not currently selected; revisitable. */
  | "CANDIDATE"
  /** Never observed, not observed inside the cold window, or stale; due for revisit. */
  | "COLD"
  /** Hard-infeasible at the last evaluation; retained with a reason and a due date. */
  | "BLOCKED"
  /** Opted out, robots-disallowed or authority withdrawn. Never selectable. */
  | "WITHDRAWN";

/** An upper-tier family summary derived incrementally from member entries. */
export interface FamilySummary {
  family_id: string;
  member_source_ids: string[];
  /** Members this summary has folded into its rollup. */
  accounted_source_count: number;
  /** Member events newer than the rollup; non-zero means the summary is stale. */
  unaccounted_event_count: number;
  qualified_ready_total: number;
  candidate_total: number;
  mean_marginal_yield: number;
  selected_count: number;
  blocked_count: number;
  withdrawn_count: number;
  /** Newest member event sequence folded into this summary. */
  last_event_seq: number;
  stale: boolean;
  updated_at: string;
}

/** A lower-tier candidate entry. */
export interface CandidateEntry {
  source_id: string;
  family_id: string;
  state: PoolState;
  /** Mirrored hard feasibility from the last evaluation. Never a permission. */
  hard_gate: HardGate;
  feasibility_reason: string;
  qualified_ready: number;
  candidate_total: number;
  marginal_yield: number;
  cost_cents: number;
  /** null means "a score is owed"; it is never treated as zero value. */
  score: number | null;
  /** Newest event sequence folded into this entry. */
  last_event_seq: number;
  last_scored_at: string | null;
  last_observed_at: string | null;
  /** Explicit next-revisit date; null while the entry is actively selected. */
  cold_revisit_due_at: string | null;
  consecutive_selected: number;
  /** Why the entry is not SELECTED, or null when it is. */
  state_reason: string | null;
}

/** Explicit events that advance pool state. No event implies a hidden full scan. */
export type PoolEvent =
  | {
      kind: "OBSERVATION";
      source_id: string;
      at: string;
      qualified_ready: number;
      candidate_total: number;
      marginal_yield: number;
      cost_cents: number;
    }
  | {
      kind: "INVALIDATION";
      source_id: string;
      at: string;
      reason: string;
      /** Supply this when the invalidation carries a restrictive verdict. */
      hard_gate?: HardGate;
    }
  | { kind: "WITHDRAWN"; source_id: string; at: string; reason: string }
  | { kind: "AUTHORITY_RESTORED"; source_id: string; at: string; hard_gate: HardGate };

/** Per-epoch work accounting, in units of pool rows touched. */
export interface PoolAccounting {
  events_applied: number;
  /** Rows this epoch had to read to produce its result. */
  rows_read: number;
  entries_updated: number;
  summaries_updated: number;
  /** True when the epoch touched every population row, i.e. behaved like a full rescan. */
  full_rescan: boolean;
}

export interface EpochResult {
  pool: CandidatePool;
  accounting: PoolAccounting;
}

export interface PoolConfig {
  /** Maximum entries in the bounded selected pool. */
  maxPoolSize: number;
  /** Maximum population entries retained; overflow keeps an explicit revisit trigger. */
  maxPopulation: number;
  /** Days of no observation before an entry is treated as cold. */
  coldRevisitDays: number;
  /** A challenger must exceed an incumbent's score by this factor to displace it. */
  hysteresisFactor: number;
  /** Minimum score for a challenger to take an unfilled pool slot. */
  admissionMargin: number;
  /** Maximum entries a single bounded rebuild/audit tick may visit. */
  rebuildBatchSize: number;
  /** Maximum work items a single due-work listing may return. */
  maxDueWorkPerEpoch: number;
  version: string;
}

export const DEFAULT_POOL_CONFIG: PoolConfig = {
  maxPoolSize: 50,
  maxPopulation: 5000,
  coldRevisitDays: 7,
  hysteresisFactor: 1.1,
  admissionMargin: 0,
  rebuildBatchSize: 250,
  maxDueWorkPerEpoch: 200,
  version: "candidate-pool@v1",
};

export interface CandidatePool {
  config: PoolConfig;
  entries: Record<string, CandidateEntry>;
  families: Record<string, FamilySummary>;
  /** Entries that did not fit maxPopulation; retained, never deleted. */
  overflow: CandidateEntry[];
  seq: number;
  /** Monotonic pool version; increments on every state change. */
  pool_version: number;
  /** Total population size, including overflow. */
  population: number;
  /** Bounded rebuild/audit cursor over a stable population ordering. */
  audit_cursor: number;
  audit_sweeps: number;
  created_at: string;
  updated_at: string;
}

export interface PoolSourceSeed {
  source_id: string;
  family_id: string;
  qualified_ready: number;
  candidate_total: number;
  marginal_yield: number;
  cost_cents: number;
  hard_gate?: HardGate;
  last_observed_at?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_MS = 86400000;

function emptySummary(familyId: string, at: string): FamilySummary {
  return {
    family_id: familyId,
    member_source_ids: [],
    accounted_source_count: 0,
    unaccounted_event_count: 0,
    qualified_ready_total: 0,
    candidate_total: 0,
    mean_marginal_yield: 0,
    selected_count: 0,
    blocked_count: 0,
    withdrawn_count: 0,
    last_event_seq: 0,
    stale: false,
    updated_at: at,
  };
}

function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Stable population ordering: by family, then source id, then overflow. */
export function populationOrder(pool: CandidatePool): string[] {
  const ids = Object.keys(pool.entries).sort((a, b) => {
    const fa = pool.entries[a].family_id;
    const fb = pool.entries[b].family_id;
    return fa === fb ? compareIds(a, b) : compareIds(fa, fb);
  });
  for (const o of [...pool.overflow].sort((a, b) => compareIds(a.source_id, b.source_id))) {
    ids.push(o.source_id);
  }
  return ids;
}

function entryOf(pool: CandidatePool, sourceId: string): CandidateEntry | undefined {
  return pool.entries[sourceId] ?? pool.overflow.find((o) => o.source_id === sourceId);
}

/** Deep-enough copy: entry/family records are flat, so a shallow map copy is a copy. */
function clonePool(pool: CandidatePool, now: string): CandidatePool {
  const entries: Record<string, CandidateEntry> = {};
  for (const [id, entry] of Object.entries(pool.entries)) entries[id] = { ...entry };
  const families: Record<string, FamilySummary> = {};
  for (const [id, summary] of Object.entries(pool.families)) {
    families[id] = { ...summary, member_source_ids: [...summary.member_source_ids] };
  }
  return {
    ...pool,
    entries,
    families,
    overflow: pool.overflow.map((o) => ({ ...o })),
    updated_at: now,
  };
}

function sortByScoreDesc<T extends { source_id: string; score: number | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || compareIds(a.source_id, b.source_id));
}

/**
 * Rebuilds one family rollup from its members. A member whose event sequence is
 * newer than the rollup is counted as unaccounted so the summary is marked stale
 * rather than silently reporting a partial rollup as complete.
 */
function recomputeSummary(
  pool: CandidatePool,
  summary: FamilySummary,
  accounted: (entry: CandidateEntry) => boolean,
  now: string
): FamilySummary {
  let qualified = 0;
  let candidates = 0;
  let selected = 0;
  let blocked = 0;
  let withdrawn = 0;
  let accountedCount = 0;
  let unaccounted = 0;
  let yieldSum = 0;
  let yieldCount = 0;
  let lastSeq = 0;

  for (const sourceId of summary.member_source_ids) {
    const entry = pool.entries[sourceId];
    if (!entry) continue;
    qualified += entry.qualified_ready;
    candidates += entry.candidate_total;
    if (entry.state === "SELECTED") selected += 1;
    else if (entry.state === "BLOCKED") blocked += 1;
    else if (entry.state === "WITHDRAWN") withdrawn += 1;
    if (accounted(entry)) {
      accountedCount += 1;
      yieldSum += entry.marginal_yield;
      yieldCount += 1;
    } else {
      unaccounted += 1;
    }
    lastSeq = Math.max(lastSeq, entry.last_event_seq);
  }

  return {
    ...summary,
    accounted_source_count: accountedCount,
    unaccounted_event_count: unaccounted,
    qualified_ready_total: qualified,
    candidate_total: candidates,
    selected_count: selected,
    blocked_count: blocked,
    withdrawn_count: withdrawn,
    mean_marginal_yield: yieldCount > 0 ? yieldSum / yieldCount : 0,
    last_event_seq: lastSeq,
    stale: unaccounted > 0,
    updated_at: now,
  };
}

// ─── Construction ─────────────────────────────────────────────────────────────

/**
 * Initial full enumeration — the one permitted O(N) pass. Its cost is accounted
 * so a later incremental epoch can be compared against it.
 */
export function createPool(
  seeds: PoolSourceSeed[],
  options: { config?: Partial<PoolConfig>; now?: string } = {}
): EpochResult {
  const config = { ...DEFAULT_POOL_CONFIG, ...options.config };
  const now = options.now ?? new Date().toISOString();

  const ordered = [...seeds].sort((a, b) =>
    a.family_id === b.family_id ? compareIds(a.source_id, b.source_id) : compareIds(a.family_id, b.family_id)
  );
  const retained = ordered.slice(0, config.maxPopulation);
  const deferred = ordered.slice(config.maxPopulation);

  const pool: CandidatePool = {
    config,
    entries: {},
    families: {},
    overflow: [],
    seq: 0,
    pool_version: 1,
    population: ordered.length,
    audit_cursor: 0,
    audit_sweeps: 0,
    created_at: now,
    updated_at: now,
  };

  for (const seed of retained) {
    const hardGate: HardGate = seed.hard_gate ?? "NONE";
    const entry: CandidateEntry = {
      source_id: seed.source_id,
      family_id: seed.family_id,
      state: hardGate === "NONE" ? (seed.last_observed_at ? "CANDIDATE" : "COLD") : "BLOCKED",
      hard_gate: hardGate,
      feasibility_reason: hardGate === "NONE" ? "Initial enumeration" : `Blocked at enumeration: ${hardGate}`,
      qualified_ready: seed.qualified_ready,
      candidate_total: seed.candidate_total,
      marginal_yield: seed.marginal_yield,
      cost_cents: seed.cost_cents,
      score: null,
      last_event_seq: 0,
      last_scored_at: null,
      last_observed_at: seed.last_observed_at ?? null,
      cold_revisit_due_at: seed.last_observed_at ? null : now,
      consecutive_selected: 0,
      state_reason: hardGate === "NONE" ? null : `Blocked at enumeration: ${hardGate}`,
    };
    pool.entries[seed.source_id] = entry;
    const summary = pool.families[seed.family_id] ?? emptySummary(seed.family_id, now);
    summary.member_source_ids.push(seed.source_id);
    pool.families[seed.family_id] = summary;
  }

  for (const seed of deferred) {
    const hardGate: HardGate = seed.hard_gate ?? "NONE";
    pool.overflow.push({
      source_id: seed.source_id,
      family_id: seed.family_id,
      state: hardGate === "NONE" ? "CANDIDATE" : "BLOCKED",
      hard_gate: hardGate,
      feasibility_reason: `Deferred: population bound reached (${hardGate})`,
      qualified_ready: seed.qualified_ready,
      candidate_total: seed.candidate_total,
      marginal_yield: seed.marginal_yield,
      cost_cents: seed.cost_cents,
      score: null,
      last_event_seq: 0,
      last_scored_at: null,
      last_observed_at: seed.last_observed_at ?? null,
      cold_revisit_due_at: now,
      consecutive_selected: 0,
      state_reason: "Deferred: population bound reached; explicit revisit trigger retained",
    });
  }

  const familyIds = Object.keys(pool.families);
  for (const familyId of familyIds) {
    pool.families[familyId] = recomputeSummary(pool, pool.families[familyId], () => true, now);
  }

  const entriesUpdated = Object.keys(pool.entries).length;
  return {
    pool,
    accounting: {
      events_applied: 0,
      rows_read: entriesUpdated + familyIds.length,
      entries_updated: entriesUpdated,
      summaries_updated: familyIds.length,
      full_rescan: true,
    },
  };
}

// ─── Event-driven incremental update ──────────────────────────────────────────

/**
 * Folds explicit events into a NEW pool. Only the entries named by the events and
 * the summaries they belong to are read and updated; every other row keeps its
 * previous state and its previous `last_event_seq`.
 */
export function applyEvents(pool: CandidatePool, events: PoolEvent[]): EpochResult {
  const now = new Date().toISOString();
  const next = clonePool(pool, now);

  const touchedEntries = new Set<string>();
  const touchedFamilies = new Set<string>();
  let eventsApplied = 0;
  let unknownSourceIds = 0;

  for (const event of events) {
    eventsApplied += 1;
    const current = next.entries[event.source_id];
    if (!current) {
      unknownSourceIds += 1;
      continue;
    }
    const entry = { ...current };
    next.seq += 1;
    entry.last_event_seq = next.seq;

    if (event.kind === "OBSERVATION") {
      entry.qualified_ready = event.qualified_ready;
      entry.candidate_total = event.candidate_total;
      entry.marginal_yield = event.marginal_yield;
      entry.cost_cents = event.cost_cents;
      entry.last_observed_at = event.at;
      entry.cold_revisit_due_at = null;
      if (entry.state === "COLD") {
        entry.state = "CANDIDATE";
        entry.state_reason = null;
      }
      entry.score = null;
    } else if (event.kind === "INVALIDATION") {
      if (event.hard_gate && event.hard_gate !== "NONE") {
        entry.hard_gate = event.hard_gate;
        entry.state = "BLOCKED";
        entry.feasibility_reason = event.reason;
        entry.state_reason = event.reason;
        entry.consecutive_selected = 0;
      } else if (entry.state === "SELECTED") {
        // A non-restrictive invalidation keeps the slot but owes a fresh score.
        entry.state = "CANDIDATE";
        entry.state_reason = `Invalidated: ${event.reason}`;
        entry.consecutive_selected = 0;
      }
      entry.score = null;
    } else if (event.kind === "WITHDRAWN") {
      entry.hard_gate = "OPT_OUT";
      entry.state = "WITHDRAWN";
      entry.feasibility_reason = event.reason;
      entry.state_reason = event.reason;
      entry.consecutive_selected = 0;
      entry.score = null;
    } else {
      entry.hard_gate = event.hard_gate;
      entry.state = "CANDIDATE";
      entry.feasibility_reason = "Authority restored; re-evaluation required";
      entry.state_reason = null;
      entry.score = null;
    }

    next.entries[event.source_id] = entry;
    touchedEntries.add(event.source_id);
    touchedFamilies.add(entry.family_id);
  }

  let summariesUpdated = 0;
  for (const familyId of touchedFamilies) {
    const summary = next.families[familyId];
    if (!summary) continue;
    next.families[familyId] = recomputeSummary(
      next,
      summary,
      (entry) => entry.last_event_seq <= summary.last_event_seq || touchedEntries.has(entry.source_id),
      now
    );
    summariesUpdated += 1;
  }

  return {
    pool: { ...next, pool_version: next.pool_version + 1 },
    accounting: {
      events_applied: eventsApplied,
      rows_read: touchedEntries.size + summariesUpdated,
      entries_updated: touchedEntries.size,
      summaries_updated: summariesUpdated,
      full_rescan: next.population > 0 && touchedEntries.size >= next.population,
    },
  };
}

// ─── Due work ─────────────────────────────────────────────────────────────────

export type DueWorkKind = "ENTRY_RESCORE" | "ENTRY_REVISIT" | "FAMILY_RECOMPUTE";

export interface DueWork {
  kind: DueWorkKind;
  source_id: string | null;
  family_id: string | null;
  reason: string;
}

/**
 * Bounded set of work the next epoch owes. An entry is due only when its score is
 * owed, it has never been scored, or it has passed its cold-revisit date.
 * Unchanged, recently scored entries are not returned, which is how the module
 * avoids an O(N) rescore per epoch.
 */
export function dueWork(
  pool: CandidatePool,
  options: { now?: string; limit?: number } = {}
): { work: DueWork[]; population: number; truncated: boolean } {
  const now = options.now ?? new Date().toISOString();
  const limit = options.limit ?? pool.config.maxDueWorkPerEpoch;
  const work: DueWork[] = [];

  for (const summary of Object.values(pool.families)) {
    if (summary.stale) {
      work.push({
        kind: "FAMILY_RECOMPUTE",
        source_id: null,
        family_id: summary.family_id,
        reason: `${summary.unaccounted_event_count} member event(s) newer than the summary`,
      });
    }
  }

  for (const id of populationOrder(pool)) {
    const entry = entryOf(pool, id);
    if (!entry || entry.state === "WITHDRAWN") continue;
    if (entry.hard_gate !== "NONE") continue;
    if (entry.cold_revisit_due_at !== null && entry.cold_revisit_due_at <= now) {
      work.push({ kind: "ENTRY_REVISIT", source_id: id, family_id: entry.family_id, reason: "Cold revisit due" });
    } else if (entry.score === null) {
      work.push({ kind: "ENTRY_RESCORE", source_id: id, family_id: entry.family_id, reason: "No valid score for the current evidence" });
    }
  }

  const truncated = work.length > limit;
  return { work: truncated ? work.slice(0, limit) : work, population: pool.population, truncated };
}

/** Records that an entry's score is current, clearing its rescore debt. */
export function markScored(
  pool: CandidatePool,
  scored: { source_id: string; score: number; at?: string }[],
  options: { now?: string } = {}
): EpochResult {
  const now = options.now ?? new Date().toISOString();
  const next = clonePool(pool, now);
  let entriesUpdated = 0;

  for (const item of scored) {
    const entry = next.entries[item.source_id];
    if (!entry) continue;
    // A hard gate or withdrawal outranks any score.
    if (entry.hard_gate !== "NONE" || entry.state === "WITHDRAWN") continue;
    next.entries[item.source_id] = { ...entry, score: item.score, last_scored_at: item.at ?? now };
    entriesUpdated += 1;
  }

  return {
    pool: { ...next, pool_version: next.pool_version + 1 },
    accounting: {
      events_applied: scored.length,
      rows_read: entriesUpdated,
      entries_updated: entriesUpdated,
      summaries_updated: 0,
      full_rescan: next.population > 0 && entriesUpdated >= next.population,
    },
  };
}

// ─── Selection with hysteresis ────────────────────────────────────────────────

/** The admissible subset of an SSAE-03 ranked output: not excluded, permitted, no hard gate. */
export function admissibleCandidates(ranked: RankedSource[]): RankedSource[] {
  return sortByScoreDesc(
    ranked.filter((r) => !r.excluded && r.feasibility.permitted && r.feasibility.hardGate === "NONE")
  );
}

/**
 * Folds a ranked candidate set (SSAE-03 output) into the bounded selected pool.
 *
 * Invariants:
 * - A SELECTED incumbent is displaced only by a challenger whose score exceeds the
 *   incumbent's score by `hysteresisFactor`, so near-ties cannot oscillate the pool.
 * - A BLOCKED or WITHDRAWN entry is never admitted, whatever its score.
 * - Entries leaving the selected set are retained as CANDIDATE with an explicit
 *   cold-revisit due date. Nothing is deleted and no source is permanently denied.
 */
export function selectFromPool(
  pool: CandidatePool,
  ranked: RankedSource[],
  options: { now?: string } = {}
): EpochResult {
  const now = options.now ?? new Date().toISOString();
  const config = pool.config;
  const next = clonePool(pool, now);
  let entriesUpdated = 0;

  // 1. Admit current scores for admissible entries only.
  for (const candidate of admissibleCandidates(ranked)) {
    const entry = next.entries[candidate.source_id];
    if (!entry) continue;
    if (entry.hard_gate !== "NONE" || entry.state === "BLOCKED" || entry.state === "WITHDRAWN") continue;
    if (entry.score === candidate.score && entry.last_scored_at === now) continue;
    next.entries[candidate.source_id] = { ...entry, score: candidate.score, last_scored_at: now };
    entriesUpdated += 1;
  }

  // 2. Incumbents first, strongest first, so the best-protected slot is decided first.
  const incumbents = sortByScoreDesc(
    Object.values(next.entries).filter((e) => e.state === "SELECTED" && e.hard_gate === "NONE")
  );
  const challengerPool = sortByScoreDesc(
    Object.values(next.entries).filter(
      (e) => e.state !== "SELECTED" && e.hard_gate === "NONE" && e.score !== null && e.state !== "BLOCKED"
    )
  );
  const consumed = new Set<string>();
  const retained: CandidateEntry[] = [];

  for (const incumbent of incumbents) {
    if (retained.length >= config.maxPoolSize) break;
    const challenger = challengerPool.find((c) => !consumed.has(c.source_id));
    const displaced = challenger !== undefined && (challenger.score ?? 0) > (incumbent.score ?? 0) * config.hysteresisFactor;
    if (displaced) {
      consumed.add(challenger.source_id);
      continue;
    }
    retained.push({
      ...incumbent,
      state: "SELECTED",
      state_reason: null,
      consecutive_selected: incumbent.consecutive_selected + 1,
      cold_revisit_due_at: null,
    });
  }

  // 3. Fill the remaining slots with the best admissible challengers.
  for (const challenger of challengerPool) {
    if (retained.length >= config.maxPoolSize) break;
    if (!consumed.has(challenger.source_id)) continue;
    if (challenger.score! < config.admissionMargin) continue;
    consumed.delete(challenger.source_id);
    retained.push({
      ...challenger,
      state: "SELECTED",
      state_reason: null,
      consecutive_selected: 1,
      cold_revisit_due_at: null,
    });
    entriesUpdated += 1;
  }

  // 4. Fill any slot still free with the highest-scoring unselected admissible entry.
  for (const challenger of challengerPool) {
    if (retained.length >= config.maxPoolSize) break;
    if (consumed.has(challenger.source_id)) continue;
    if (retained.some((r) => r.source_id === challenger.source_id)) continue;
    if (challenger.score! < config.admissionMargin) continue;
    retained.push({
      ...challenger,
      state: "SELECTED",
      state_reason: null,
      consecutive_selected: 1,
      cold_revisit_due_at: null,
    });
    entriesUpdated += 1;
  }

  const retainedIds = new Set(retained.map((e) => e.source_id));
  const touchedFamilies = new Set<string>();

  // 5. Demote every previous SELECTED entry that did not survive, keeping evidence.
  for (const entry of Object.values(next.entries)) {
    if (retainedIds.has(entry.source_id)) continue;
    if (entry.state !== "SELECTED") continue;
    next.entries[entry.source_id] = {
      ...entry,
      state: entry.hard_gate === "NONE" ? "CANDIDATE" : "BLOCKED",
      state_reason: "Left the bounded selected pool; retained for revisit",
      consecutive_selected: 0,
      cold_revisit_due_at: new Date(new Date(now).getTime() + config.coldRevisitDays * DAY_MS).toISOString(),
    };
    entriesUpdated += 1;
    touchedFamilies.add(entry.family_id);
  }

  for (const entry of retained) {
    next.entries[entry.source_id] = entry;
    touchedFamilies.add(entry.family_id);
  }

  let summariesUpdated = 0;
  for (const familyId of touchedFamilies) {
    const summary = next.families[familyId];
    if (!summary) continue;
    next.families[familyId] = recomputeSummary(
      next,
      summary,
      (entry) => retainedIds.has(entry.source_id) || entry.last_event_seq <= summary.last_event_seq,
      now
    );
    summariesUpdated += 1;
  }

  return {
    pool: { ...next, pool_version: next.pool_version + 1 },
    accounting: {
      events_applied: ranked.length,
      rows_read: Object.keys(next.entries).length,
      entries_updated: entriesUpdated,
      summaries_updated: summariesUpdated,
      full_rescan: false,
    },
  };
}

// ─── Bounded rebuild and audit ────────────────────────────────────────────────

export interface RebuildTick {
  pool: CandidatePool;
  /** Entries this tick actually visited. */
  visited: string[];
  /** Entries this tick found owing work (stale score or cold by age). */
  refreshed: string[];
  sweep_complete: boolean;
  coverage_ratio: number;
  rows_read: number;
}

/**
 * One bounded rebuild/audit tick: visits at most `rebuildBatchSize` entries from
 * a stable cursor, marking entries that owe a score and entries that went cold by
 * age. Repeated ticks cover the whole population with no single epoch doing O(N)
 * work, and no cold source is deleted.
 */
export function boundedRebuildTick(pool: CandidatePool, options: { now?: string } = {}): RebuildTick {
  const now = options.now ?? new Date().toISOString();
  const next = clonePool(pool, now);
  const ids = populationOrder(next);
  const batchSize = Math.max(1, next.config.rebuildBatchSize);
  const batchCount = Math.min(batchSize, ids.length);

  const visited: string[] = [];
  const refreshed: string[] = [];
  const touchedFamilies = new Set<string>();

  for (let i = 0; i < batchCount; i++) {
    const id = ids[(next.audit_cursor + i) % Math.max(ids.length, 1)];
    const entry = next.entries[id];
    if (!entry) continue;
    visited.push(id);
    const owesScore = entry.score === null && entry.hard_gate === "NONE";
    const coldByAge =
      entry.state !== "SELECTED" &&
      entry.hard_gate === "NONE" &&
      entry.last_observed_at !== null &&
      entry.cold_revisit_due_at === null &&
      new Date(now).getTime() - new Date(entry.last_observed_at).getTime() >= next.config.coldRevisitDays * DAY_MS;
    if (!owesScore && !coldByAge) continue;
    if (entry.state !== "SELECTED") {
      next.entries[id] = {
        ...entry,
        state: "COLD",
        cold_revisit_due_at: now,
        state_reason: owesScore ? "No valid score for the current evidence" : "Cold by age at bounded rebuild",
      };
      touchedFamilies.add(entry.family_id);
    }
    refreshed.push(id);
  }

  const nextCursor = (next.audit_cursor + batchCount) % Math.max(ids.length, 1);
  const sweepComplete = batchCount >= ids.length || nextCursor === 0;
  next.audit_cursor = nextCursor;
  if (sweepComplete) next.audit_sweeps += 1;

  let summariesUpdated = 0;
  for (const familyId of Object.keys(next.families)) {
    const summary = next.families[familyId];
    if (!summary || !summary.stale) continue;
    next.families[familyId] = recomputeSummary(
      next,
      summary,
      (entry) => entry.last_event_seq <= summary.last_event_seq || touchedFamilies.has(entry.family_id),
      now
    );
    summariesUpdated += 1;
  }

  return {
    pool: { ...next, pool_version: next.pool_version + 1 },
    visited,
    refreshed,
    sweep_complete: sweepComplete,
    coverage_ratio: ids.length === 0 ? 1 : visited.length / ids.length,
    rows_read: batchCount + summariesUpdated,
  };
}

/** Deterministic bounded audit sample: every `stride`-th entry in stable order. */
export function auditSample(pool: CandidatePool, stride = 10): { sample: CandidateEntry[]; coverage: number } {
  const ids = populationOrder(pool);
  const step = Math.max(1, Math.floor(stride));
  const sample: CandidateEntry[] = [];
  for (let i = 0; i < ids.length; i += step) {
    const entry = entryOf(pool, ids[i]);
    if (entry) sample.push(entry);
  }
  return { sample, coverage: ids.length === 0 ? 1 : sample.length / ids.length };
}

// ─── Introspection ────────────────────────────────────────────────────────────

export interface PoolStats {
  population: number;
  entries_retained: number;
  overflow_retained: number;
  families: number;
  stale_families: number;
  states: Record<PoolState, number>;
  selected: string[];
  selected_family_share: Record<string, number>;
  pool_version: number;
  seq: number;
  config: PoolConfig;
}

export function poolStats(pool: CandidatePool): PoolStats {
  const states: Record<PoolState, number> = {
    SELECTED: 0,
    CANDIDATE: 0,
    COLD: 0,
    BLOCKED: 0,
    WITHDRAWN: 0,
  };
  for (const entry of Object.values(pool.entries)) states[entry.state] += 1;
  for (const entry of pool.overflow) states[entry.state] += 1;

  const selected = Object.values(pool.entries)
    .filter((e) => e.state === "SELECTED")
    .map((e) => e.source_id)
    .sort(compareIds);

  const selected_family_share: Record<string, number> = {};
  for (const id of selected) {
    const family = pool.entries[id].family_id;
    selected_family_share[family] = (selected_family_share[family] ?? 0) + 1;
  }
  const total = selected.length || 1;
  for (const family of Object.keys(selected_family_share)) selected_family_share[family] /= total;

  return {
    population: pool.population,
    entries_retained: Object.keys(pool.entries).length,
    overflow_retained: pool.overflow.length,
    families: Object.keys(pool.families).length,
    stale_families: Object.values(pool.families).filter((f) => f.stale).length,
    states,
    selected,
    selected_family_share,
    pool_version: pool.pool_version,
    seq: pool.seq,
    config: pool.config,
  };
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
Incremental Hierarchical Candidate Pool (SSAE-08)

Usage:
  bun run scripts/lake/candidate-pool.ts [options]

Options:
  --pool-size=N       Maximum selected pool size (default: ${DEFAULT_POOL_CONFIG.maxPoolSize})
  --max-population=N  Maximum retained population (default: ${DEFAULT_POOL_CONFIG.maxPopulation})
  --cold-days=N       Days before an unobserved entry is COLD (default: ${DEFAULT_POOL_CONFIG.coldRevisitDays})
  --hysteresis=F      Challenger/incumbent score ratio required to displace (default: ${DEFAULT_POOL_CONFIG.hysteresisFactor})
  --rebuild-batch=N   Entries visited per bounded rebuild tick (default: ${DEFAULT_POOL_CONFIG.rebuildBatchSize})
  --help              Show this help

READ-ONLY: no writer, no DB client, no network access. This proposes a bounded
candidate pool. It grants no publication authority; publication remains
exclusively in packages/scraper/publication-gateway.ts.
`);
}

if (import.meta.main) printHelp();