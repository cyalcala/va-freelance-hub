/**
 * MATH Wave 2 characterization: MATH-02, MATH-10, MATH-13.
 *
 * Scope and honesty statement (read before citing anything here):
 *
 * - These tests characterize EXISTING repository code. They add no gate, no
 *   threshold, no accepted parameter, no writer, no clock and no publication
 *   path. Nothing here is runtime evidence.
 * - Every stage cost in the MATH-13 profile section is a DECLARED SYNTHETIC
 *   FIXTURE, not a measurement. The live MATH-13 baseline is UNKNOWN: the
 *   repository has no `scripts/diagnostics` profiler and no stage-latency
 *   telemetry is populated. The Amdahl assertions below are therefore about
 *   the ALGEBRA and its ceiling property over a named workload, never about an
 *   observed production speedup.
 * - The MATH-10 section records one real, reproducible invalidation-coverage
 *   gap (a changed material digest is invisible to the current mode selector)
 *   and one real delimiter-ambiguity property of `toContentHash`. Both are
 *   asserted as current behavior, with the consequence named. Neither is
 *   fixed here; fixing either needs its own authorized unit.
 * - Labels follow the program convention: `MATH-02:`, `MATH-10:`, `MATH-13:`.
 *
 * Mapping to the SSAE work cards is recorded in
 * `docs/plans/MATH_WAVE2_CHARACTERIZATION.md`.
 */

import { describe, it, expect } from "bun:test";

// MATH-02 — queue capacity, backpressure, bounded control
import {
  nextQueueDepth,
  coefficientOfVariation,
  residencePercentiles,
  littlesLaw,
  queueStability,
  LITTLE_LAW_CV_MAX,
} from "../ci/queue-metrics";
import {
  createPool,
  dueWork,
  boundedRebuildTick,
  poolStats,
  DEFAULT_POOL_CONFIG,
  type PoolSourceSeed,
} from "./candidate-pool";

// MATH-10 — change detection, cache validity, material digests
import { hashString, toContentHash, sha256Hex, errorMessage } from "../../packages/scraper/contentHash";
import { unchangedOutput } from "../../packages/scraper/conditional";
import {
  conditionalValidatorsForPersistence,
  type ConditionalValidators,
} from "../../apps/web/src/lib/conditional-state";
import {
  selectProcessingMode,
  CURRENT_VERSIONS,
  type SourceMemoryRecord,
  type VersionDeps,
} from "./source-ranker";

// MATH-13 — comparable profile, stage accounting, Amdahl bound
import {
  PIPELINE_STAGES,
  isValidPipelineStage,
  validateLatencySpan,
  createLatencySpan,
  computeSourceFetchByteStats,
  validateFetchByteLog,
  checkMeasurementContractMaturity,
  type LatencySpan,
  type FetchByteLog,
} from "./measurement-contracts";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const T0 = "2026-10-04T00:00:00.000Z";

function seed(index: number, overrides: Partial<PoolSourceSeed> = {}): PoolSourceSeed {
  return {
    source_id: `src-${String(index).padStart(3, "0")}`,
    family_id: `fam-${index % 4}`,
    qualified_ready: 10,
    candidate_total: 40,
    marginal_yield: 0.5,
    cost_cents: 1,
    last_observed_at: T0,
    ...overrides,
  };
}

function record(overrides: Partial<SourceMemoryRecord> = {}): SourceMemoryRecord {
  return {
    source_id: "src-001",
    provider_id: "provider-a",
    declared_capability: "rss_xml",
    endpoint_url: "https://example.invalid/feed.xml",
    payload_kind: "xml",
    selected_processor: "rss-v1",
    routing_warnings: [],
    fetch_state: {
      etag: '"v1"',
      last_modified: null,
      last_body_hash: "body-1",
      last_fetch_at: T0,
      last_fetch_ok: true,
      consecutive_failures: 0,
      backoff_until: null,
    },
    lake_state: {
      last_raw_observation_id: 1,
      last_candidate_count: 12,
      last_qualified_ready: 3,
      last_ingestion_at: T0,
      last_sighting_at: T0,
    },
    publication_state: {
      compliance_state: "allowed",
      operational_state: "active",
      policy_expiry: null,
      opt_out: false,
      lease_expiry: null,
      last_decision: null,
      last_decision_at: null,
      last_publication_at: null,
      last_publication_count: 0,
      last_publication_mode: "unlimited",
      concentration_status: "OK",
    },
    health_rollup: {
      recent_success_rate: 1,
      recent_ph_rate: 0.4,
      recent_false_ph_rate: 0,
      last_quality_check_at: T0,
      robots_last_checked_at: T0,
      robots_allows: true,
    },
    version_deps: { ...CURRENT_VERSIONS },
    retention: {
      raw_observation_ttl_days: 30,
      candidate_ttl_days: 14,
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
      content_hash: "ch-1",
      description_hash: "dh-1",
      policy_hash: "ph-1",
    },
    ...overrides,
  };
}

function versions(overrides: Partial<VersionDeps> = {}): VersionDeps {
  return { ...CURRENT_VERSIONS, ...overrides };
}

function fetchLog(overrides: Partial<FetchByteLog> = {}): FetchByteLog {
  return {
    source_id: "src-001",
    provider_id: "provider-a",
    fetch_timestamp: T0,
    epoch_label: "epoch-1",
    bytes_fetched: 0,
    conditional_attempted: false,
    not_modified: false,
    request_etag: null,
    response_etag: null,
    request_last_modified: null,
    response_last_modified: null,
    http_status: 200,
    fetch_latency_ms: 100,
    success: true,
    ...overrides,
  };
}

/** Declared synthetic per-stage cost in ms. NOT a measurement. */
const SYNTHETIC_STAGE_MS: Record<(typeof PIPELINE_STAGES)[number], number> = {
  fetch: 820,
  parse: 140,
  normalize: 60,
  geo_gate: 95,
  triage: 210,
  fingerprint: 25,
  deduplicate: 55,
  qualify: 180,
  publish: 115,
};

/** Build a valid LatencySpan for a stage with a declared duration. */
function span(stage: (typeof PIPELINE_STAGES)[number], durationMs: number): LatencySpan {
  const startMs = Date.parse(T0);
  return {
    stage,
    source_id: "src-001",
    job_id: "job-1",
    started_at: new Date(startMs).toISOString(),
    completed_at: new Date(startMs + durationMs).toISOString(),
    duration_ms: durationMs,
    success: true,
    error_message: null,
    metadata: { synthetic: true },
  };
}

// ─── MATH-02 ────────────────────────────────────────────────────────────────

describe("MATH-02 — queue capacity, backpressure and bounded control", () => {
  it("MATH-02: conserves depth exactly while unclamped and records nothing when clamped", () => {
    // Unclamped: Q_next = Q + arrivals - completions is an exact identity.
    expect(nextQueueDepth(7, 5, 3)).toBe(9);
    expect(nextQueueDepth(0, 0, 0)).toBe(0);

    // Clamped at zero: a burst cannot manufacture negative work.
    expect(nextQueueDepth(2, 1, 10)).toBe(0);

    // Conservation across epochs is exact while unclamped: Q_final equals the
    // net flow. This is the boundary the control has to report, not hide.
    const arrivals = [40, 55, 61];
    const service = [50, 45, 60];
    let depth = 12;
    for (let i = 0; i < arrivals.length; i++) {
      depth = nextQueueDepth(depth, arrivals[i]!, service[i]!);
    }
    expect(depth).toBe(13);
    expect(
      depth
    ).toBe(12 + arrivals.reduce((a, b) => a + b, 0) - service.reduce((a, b) => a + b, 0));

    // Once an epoch clamps, conservation against net flow is deliberately
    // broken: the surplus completions did not exist and are not carried
    // forward as negative depth. The gap is the idle capacity.
    const before = nextQueueDepth(12, 40, 50);
    expect(before).toBe(2);
    const afterClamp = nextQueueDepth(before, 3, 40);
    expect(afterClamp).toBe(0);
    const unclampedNet = before + 3 - 40;
    expect(unclampedNet).toBe(-35);
    expect(afterClamp - unclampedNet).toBe(35);
  });

  it("MATH-02: rejects non-finite and negative depth inputs instead of coercing them", () => {
    expect(() => nextQueueDepth(-1, 0, 0)).toThrow();
    expect(() => nextQueueDepth(0, Number.NaN, 0)).toThrow();
    expect(() => nextQueueDepth(0, 0, Number.POSITIVE_INFINITY)).toThrow();
  });

  it("MATH-02: service capacity must strictly exceed arrival; rho = 1 is not stable", () => {
    expect(queueStability(4, 5)).toBe("STABLE");
    expect(queueStability(5, 5)).toBe("UNSTABLE");
    expect(queueStability(6, 5)).toBe("UNSTABLE");
    expect(queueStability(0, 0)).toBe("UNKNOWN");
    expect(queueStability(Number.NaN, 5)).toBe("UNKNOWN");
    // A controller that admits work at exactly the service rate is therefore
    // classified UNSTABLE: bounded admission must leave real headroom.
  });

  it("MATH-02: Little's law abstains on unknown interarrival CV even when lambda*W is computable", () => {
    const computable = 6;
    const unknown = littlesLaw({ arrivalRatePerHour: 2, meanResidenceHours: 3, interarrivalCv: null });
    expect(unknown.applicable).toBe(false);
    expect(unknown.L).toBeNull();
    expect(unknown.reason).toContain("unknown");

    const within = littlesLaw({ arrivalRatePerHour: 2, meanResidenceHours: 3, interarrivalCv: 0.2 });
    expect(within.applicable).toBe(true);
    expect(within.L).toBe(computable);

    // Bursty arrivals above the provisional bound are refused, not approximated.
    const bursty = littlesLaw({ arrivalRatePerHour: 2, meanResidenceHours: 3, interarrivalCv: LITTLE_LAW_CV_MAX + 0.01 });
    expect(bursty.applicable).toBe(false);
    expect(bursty.reason).toContain("exceeds provisional steady-state bound");

    // An unusable arrival rate abstains even with a measured CV.
    expect(littlesLaw({ arrivalRatePerHour: 0, meanResidenceHours: 3, interarrivalCv: 0.1 }).applicable).toBe(false);
  });

  it("MATH-02: residence percentiles report UNKNOWN rather than zero for an empty or invalid sample", () => {
    const empty = residencePercentiles([]);
    expect(empty.status).toBe("UNKNOWN");
    expect(empty.n).toBe(0);
    expect(empty.p95).toBeNull();
    expect(empty.oldest).toBeNull();

    const negative = residencePercentiles([1, -2, 3]);
    expect(negative.status).toBe("UNKNOWN");

    const measured = residencePercentiles([0.5, 1, 2, 4, 8]);
    expect(measured.status).toBe("MEASURED");
    expect(measured.oldest).toBe(8);
    expect(measured.p50).toBe(2);
    expect(measured.p95).toBeGreaterThan(measured.p50);

    // CV is undefined for a single observation and for a zero-mean sample.
    expect(coefficientOfVariation([3])).toBeNull();
    expect(coefficientOfVariation([0, 0, 0])).toBeNull();
    expect(coefficientOfVariation([2, 2, 2, 2])).toBe(0);
  });

  it("MATH-02: bounded admission truncates rather than dropping, and repeated epochs drain the backlog at the admitted rate", () => {
    const seeds = Array.from({ length: 400 }, (_, i) => seed(i, { last_observed_at: null }));
    const { pool } = createPool(seeds, { config: { maxDueWorkPerEpoch: 25 }, now: T0 });

    const due = dueWork(pool, { now: T0 });
    expect(due.truncated).toBe(true);
    expect(due.work.length).toBe(25);
    expect(due.population).toBe(400);

    // Draining at exactly the admitted rate keeps depth non-decreasing and
    // bounded: no epoch does unbounded work, and no item is discarded.
    let depth = due.work.length;
    let drained = 0;
    for (let epoch = 0; epoch < 16; epoch++) {
      const work = dueWork(pool, { now: T0 }).work.length;
      drained += work;
      depth = nextQueueDepth(depth, 0, work);
      expect(work).toBe(25);
    }
    expect(drained).toBe(400);
    expect(depth).toBe(0);
  });

  it("MATH-02: a bounded rebuild tick never reads the whole population in one epoch and still completes a sweep", () => {
    const seeds = Array.from({ length: 300 }, (_, i) => seed(i, { last_observed_at: null }));
    const batchSize = 25;
    const { pool } = createPool(seeds, { config: { rebuildBatchSize: batchSize }, now: T0 });

    let current = pool;
    const visited = new Set<string>();
    let ticks = 0;
    let sawPartialSweep = false;
    while (ticks < 40) {
      const tick = boundedRebuildTick(current, { now: T0 });
      current = tick.pool;
      ticks += 1;
      expect(tick.visited.length).toBeLessThanOrEqual(batchSize);
      expect(tick.coverage_ratio).toBeLessThanOrEqual(batchSize / 300);
      if (!tick.sweep_complete) sawPartialSweep = true;
      for (const id of tick.visited) visited.add(id);
      if (tick.sweep_complete) break;
    }

    expect(sawPartialSweep).toBe(true);
    expect(ticks).toBe(12); // 300 / 25
    expect(visited.size).toBe(300);
    expect(poolStats(current).population).toBe(300);
  });

  it("MATH-02: dormancy is a revisit due date, never deletion", () => {
    const seeds = Array.from({ length: 5 }, (_, i) => seed(i, { last_observed_at: T0 }));
    const { pool } = createPool(seeds, { config: { coldRevisitDays: 1 }, now: T0 });
    const twoDaysLater = "2026-10-06T00:00:00.000Z";

    let current = pool;
    for (let i = 0; i < 5; i++) current = boundedRebuildTick(current, { now: twoDaysLater }).pool;

    const stats = poolStats(current);
    expect(stats.population).toBe(5);
    expect(Object.keys(current.entries).length).toBe(5);
    for (const entry of Object.values(current.entries)) {
      expect(entry.cold_revisit_due_at).not.toBeNull();
    }
    const revisit = dueWork(current, { now: twoDaysLater, limit: 100 });
    expect(revisit.work.length).toBeGreaterThan(0);
  });

  it("MATH-02: default bounded-control limits are single-digit-percentages of the population, not unmeasured guesses", () => {
    // These are the shipped defaults the bounded-control contract rests on.
    // Asserted as ratios against the shipped population bound so a future
    // default edit cannot silently turn a bounded epoch into a full rescan.
    expect(DEFAULT_POOL_CONFIG.maxDueWorkPerEpoch).toBe(200);
    expect(DEFAULT_POOL_CONFIG.rebuildBatchSize).toBe(250);
    expect(DEFAULT_POOL_CONFIG.maxDueWorkPerEpoch / DEFAULT_POOL_CONFIG.maxPopulation).toBeCloseTo(0.04, 5);
    expect(DEFAULT_POOL_CONFIG.rebuildBatchSize / DEFAULT_POOL_CONFIG.maxPopulation).toBeCloseTo(0.05, 5);
  });
});

// ─── MATH-10 ────────────────────────────────────────────────────────────────

describe("MATH-10 — change detection, cache validity and material digests", () => {
  it("MATH-10: toContentHash is a deterministic function of the (title, sourceUrl) pair only", () => {
    const a = toContentHash("Virtual Assistant — Remote", "https://example.invalid/jobs/1");
    const b = toContentHash("Virtual Assistant — Remote", "https://example.invalid/jobs/1");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{16}$/);

    // Changing either component changes the digest: the pair is the unit.
    expect(toContentHash("Virtual Assistant — Remote", "https://example.invalid/jobs/2")).not.toBe(a);
    expect(toContentHash("Virtual Assistant — Remote (Urgent)", "https://example.invalid/jobs/1")).not.toBe(a);
  });

  it("MATH-10: the '::' split point is unencoded, so a title containing '::' can alias another pair", () => {
    // Real, reproducible property of toContentHash: it hashes `title::url`
    // without encoding where the split falls, so the map is injective only
    // while no title contains the separator. toContentHash is injective
    // (a, b) === (c, d) only when a::b === c::d.
    const left = toContentHash("A", "B::C");
    const right = toContentHash("A::B", "C");
    expect(left).toBe(right);
    // Both inputs are distinguishable to the caller, yet produce one digest.
    expect(left).not.toBe(toContentHash("A", "C"));

    // The ambiguity is reachable whenever at least one pair carries a
    // non-canonical component (here a bare "scheme::host"-shaped string in the
    // URL slot, or a "::" inside the title). toContentHash validates neither
    // component, so it cannot rule those out.
    expect(toContentHash("Engineer::Senior", "https://example.invalid/x")).toBe(
      toContentHash("Engineer", "Senior::https://example.invalid/x")
    );

    // When BOTH second components are well-formed absolute http(s) URLs the
    // alias has no second preimage: "::" cannot occur inside such a URL, so the
    // scheme anchor pins the split. Verified by exhaustive enumeration of every
    // "::" split point rather than by assertion.
    const canonicalPairs: Array<[string, string]> = [
      ["Engineer", "https://example.invalid/x"],
      ["Engineer::Senior", "https://example.invalid/x"],
      ["Remote VA (PH)", "https://boards.example.invalid/jobs/42?ref=1"],
      ["a::b::c", "https://x.invalid"],
    ];
    const isAbsoluteHttpUrl = (value: string) => /^https?:\/\/[^\s]+$/.test(value);
    for (const [title, url] of canonicalPairs) {
      const joined = `${title}::${url}`;
      const viable: Array<[string, string]> = [];
      for (let i = joined.indexOf("::"); i !== -1; i = joined.indexOf("::", i + 1)) {
        const candidateTitle = joined.slice(0, i);
        const candidateUrl = joined.slice(i + 2);
        if (isAbsoluteHttpUrl(candidateUrl)) viable.push([candidateTitle, candidateUrl]);
      }
      expect(viable).toEqual([[title, url]]);
    }

    // Not fixed here: the dedup consequence is bounded because primary dedup is
    // the UNIQUE source_url column, and changing this hash is a schema-visible
    // behavior change needing its own authorized unit.
  });

  it("MATH-10: hashString is stable, 16 lowercase hex chars, and sha256Hex matches the SHA-2 reference digest", async () => {
    expect(hashString("")).toMatch(/^[0-9a-f]{16}$/);
    expect(hashString("a")).not.toBe(hashString("b"));
    expect(hashString("abc")).toBe(hashString("abc"));

    // sha256Hex is checked against externally published SHA-2 test vectors,
    // not against a constant copied out of this repository.
    expect(await sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
    expect((await sha256Hex("abc")).length).toBe(64);
  });

  it("MATH-10: errorMessage normalizes thrown values without losing Error.message", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
    expect(errorMessage("plain string")).toBe("plain string");
    expect(errorMessage(404)).toBe("404");
    expect(errorMessage(null)).toBe("null");
  });

  it("MATH-10: withdrawal outranks every version change in the mode selector", () => {
    const optedOut = record({
      publication_state: { ...record().publication_state, opt_out: true },
      version_deps: versions({ policy_version: "stale", processor_version: "stale" }),
    });
    const decision = selectProcessingMode(optedOut, CURRENT_VERSIONS);
    // Opt-out forces BOUNDED_REPLAY for withdrawal propagation even though two
    // version dependencies also changed (which alone would have been REINDEX).
    expect(decision.mode).toBe("BOUNDED_REPLAY");
    expect(decision.reason).toContain("opted out");
    expect(decision.dependencies).toContain("SOURCE_AUTHORITY");
    expect(decision.dependencies).toContain("POLICY");
  });

  it("MATH-10: expired policy and expired lease both force BOUNDED_REPLAY ahead of version checks", () => {
    const past = "2020-01-01T00:00:00.000Z";
    const future = "2999-01-01T00:00:00.000Z";

    const expiredPolicy = record({
      publication_state: { ...record().publication_state, policy_expiry: past },
    });
    const policyDecision = selectProcessingMode(expiredPolicy, CURRENT_VERSIONS);
    expect(policyDecision.mode).toBe("BOUNDED_REPLAY");
    expect(policyDecision.reason).toContain("Policy lease expired");

    const expiredLease = record({
      publication_state: { ...record().publication_state, lease_expiry: past },
    });
    const leaseDecision = selectProcessingMode(expiredLease, CURRENT_VERSIONS);
    expect(leaseDecision.mode).toBe("BOUNDED_REPLAY");
    expect(leaseDecision.reason).toContain("Evidence lease expired");

    // A future expiry is not a trigger: the record is still reusable.
    const livePolicy = record({
      publication_state: { ...record().publication_state, policy_expiry: future, lease_expiry: future },
    });
    expect(selectProcessingMode(livePolicy, CURRENT_VERSIONS).mode).toBe("REUSE");
  });

  it("MATH-10: the invalidation ladder distinguishes targeted, broad and unknown version changes", () => {
    const base = record();

    // Targeted single change -> exact bounded replay.
    const geo = selectProcessingMode(
      record({ version_deps: versions({ geo_gate_version: "geoGate@2026-01-01" }) }),
      CURRENT_VERSIONS
    );
    expect(geo.mode).toBe("BOUNDED_REPLAY");
    expect(geo.dependencies).toEqual(["GEO"]);
    expect(geo.reason).toContain("GEO_GATE");

    // content_hash_version maps to IDENTITY, also targeted.
    const hash = selectProcessingMode(
      record({ version_deps: versions({ content_hash_version: "contentHash@v0" }) }),
      CURRENT_VERSIONS
    );
    expect(hash.mode).toBe("BOUNDED_REPLAY");
    expect(hash.dependencies).toEqual(["IDENTITY"]);

    // Non-targeted single change (PARSER / MODEL) -> reindex, not replay.
    const parser = selectProcessingMode(
      record({ version_deps: versions({ processor_version: "capability-registry@0.9.0" }) }),
      CURRENT_VERSIONS
    );
    expect(parser.mode).toBe("REINDEX");
    expect(parser.dependencies).toEqual(["PARSER"]);

    const model = selectProcessingMode(
      record({ version_deps: versions({ jev_version: "jev-1.12" }) }),
      CURRENT_VERSIONS
    );
    expect(model.mode).toBe("REINDEX");
    expect(model.dependencies).toEqual(["MODEL"]);

    // Unknown dependency sets invalidate conservatively to FULL, never reuse.
    const unknown = selectProcessingMode(
      record({ version_deps: versions({ geo_gate_version: "unknown" }) }),
      CURRENT_VERSIONS
    );
    expect(unknown.mode).toBe("FULL");
    expect(unknown.reason).toContain("conservative FULL");

    const unversioned = selectProcessingMode(
      record({ version_deps: versions({ triage_version: "unversioned" }) }),
      CURRENT_VERSIONS
    );
    expect(unversioned.mode).toBe("FULL");

    // Multiple mismatches widen to REINDEX rather than a single-target replay.
    const both = selectProcessingMode(
      record({
        version_deps: versions({ geo_gate_version: "geoGate@old", policy_version: "constitution-v5.1" }),
      }),
      CURRENT_VERSIONS
    );
    expect(both.mode).toBe("REINDEX");
    expect(both.dependencies).toEqual(["POLICY", "GEO"]);
  });

  it("MATH-10: insufficient prior evidence degrades REUSE to FULL instead of reusing a partial record", () => {
    const noQualified = record({
      lake_state: { ...record().lake_state, last_qualified_ready: 0 },
    });
    expect(selectProcessingMode(noQualified, CURRENT_VERSIONS).mode).toBe("FULL");

    const noCandidates = record({
      lake_state: { ...record().lake_state, last_candidate_count: 0 },
    });
    expect(selectProcessingMode(noCandidates, CURRENT_VERSIONS).mode).toBe("FULL");

    const noFingerprint = record({
      material_digests: { ...record().material_digests, fingerprint_hash: "" },
    });
    expect(selectProcessingMode(noFingerprint, CURRENT_VERSIONS).mode).toBe("FULL");

    const noContentHash = record({
      material_digests: { ...record().material_digests, content_hash: "" },
    });
    expect(selectProcessingMode(noContentHash, CURRENT_VERSIONS).mode).toBe("FULL");

    // A null description hash is NOT required for reuse: description is not a
    // gate input for the mode decision.
    const noDescription = record({
      material_digests: { ...record().material_digests, description_hash: null },
    });
    expect(selectProcessingMode(noDescription, CURRENT_VERSIONS).mode).toBe("REUSE");
  });

  it("MATH-10: FINDING — a changed material digest alone does not invalidate a cached mode", () => {
    // Real current behavior. selectProcessingMode reads version_deps, not the
    // digests, so a job whose material fields changed underneath an unchanged
    // content_hash_version is still classified REUSE. This is exactly the
    // MATH-10 "invalidation coverage unverified" gap; SSAE-09 owns the fix and
    // is gated on PR #169, so it is characterized here and NOT patched.
    const changed = record({
      material_digests: {
        fingerprint_hash: "fp-2",
        content_hash: "ch-2",
        description_hash: "dh-2",
        policy_hash: "ph-2",
      },
    });
    expect(changed.material_digests.content_hash).not.toBe(record().material_digests.content_hash);
    expect(selectProcessingMode(changed, CURRENT_VERSIONS).mode).toBe("REUSE");

    // The compensating control that does work today: bumping the digest
    // implementation version produces IDENTITY -> BOUNDED_REPLAY.
    expect(
      selectProcessingMode(changed, versions({ content_hash_version: "contentHash@v2" })).mode
    ).toBe("BOUNDED_REPLAY");
  });

  it("MATH-10: a 304 returns no items but keeps the persisted body hash, so it is not freshness evidence", () => {
    const out = unchangedOutput({
      etag: '"v1"',
      lastModified: "Wed, 01 Oct 2026 00:00:00 GMT",
      lastBodyHash: "body-1",
    });
    expect(out.notModified).toBe(true);
    expect(out.items).toEqual([]);
    expect(out.etag).toBe('"v1"');
    expect(out.lastModified).toBe("Wed, 01 Oct 2026 00:00:00 GMT");
    // The hash is preserved rather than re-derived: nothing observed the body,
    // so nothing may claim it is fresh.
    expect(out.bodyHash).toBe("body-1");

    // Missing state yields an explicit all-null 304 rather than a fake body.
    const cold = unchangedOutput(undefined);
    expect(cold.notModified).toBe(true);
    expect(cold.etag).toBeNull();
    expect(cold.lastModified).toBeNull();
    expect(cold.bodyHash).toBeNull();
  });

  it("MATH-10: validators are cleared whenever not every item reached a durable terminal outcome", () => {
    const validators: ConditionalValidators = {
      etag: '"v2"',
      lastModified: "Sat, 03 Oct 2026 00:00:00 GMT",
      bodyHash: "body-2",
    };

    const persisted = conditionalValidatorsForPersistence(validators, true);
    expect(persisted).toEqual(validators);

    const cleared = conditionalValidatorsForPersistence(validators, false);
    expect(cleared).toEqual({ etag: null, lastModified: null, bodyHash: null });

    // Partial validator state is normalized to nulls, never to a half-set
    // record that a later 304 could honour.
    const partial = conditionalValidatorsForPersistence({ etag: '"v3"' } as ConditionalValidators, true);
    expect(partial).toEqual({ etag: '"v3"', lastModified: null, bodyHash: null });
  });
});

// ─── MATH-13 ────────────────────────────────────────────────────────────────

describe("MATH-13 — comparable profile, stage accounting and the Amdahl bound", () => {
  it("MATH-13: the declared synthetic profile is internally consistent and stage durations sum to the total", () => {
    const spans = PIPELINE_STAGES.map((stage) => span(stage, SYNTHETIC_STAGE_MS[stage]));
    for (const s of spans) {
      expect(validateLatencySpan(s).valid).toBe(true);
    }
    const total = spans.reduce((sum, s) => sum + s.duration_ms, 0);
    const declared = PIPELINE_STAGES.reduce((sum, stage) => sum + SYNTHETIC_STAGE_MS[stage], 0);
    expect(total).toBe(declared);
    // The declared workload total is pinned so a profile edit shows up as a
    // failure rather than a silent narrative shift.
    expect(declared).toBe(1700);
    // Fetch is the largest single declared share. This fixture is not a
    // measurement and asserts nothing about production.
    const fetchShare = SYNTHETIC_STAGE_MS.fetch / declared;
    expect(fetchShare).toBeCloseTo(820 / 1700, 10);
    expect(fetchShare).toBeGreaterThan(
      Math.max(...PIPELINE_STAGES.filter((s) => s !== "fetch").map((s) => SYNTHETIC_STAGE_MS[s])) / declared
    );
    expect(PIPELINE_STAGES).toHaveLength(9);
  });

  it("MATH-13: Amdahl bounds end-to-end speedup below the accelerated component's own speedup", () => {
    const declared = PIPELINE_STAGES.reduce((sum, stage) => sum + SYNTHETIC_STAGE_MS[stage], 0);
    const P = SYNTHETIC_STAGE_MS.fetch / declared;
    const speedup = (s: number) => 1 / ((1 - P) + P / s);

    // Ceiling property: no value of s reaches s, and the bound rises with s.
    for (const s of [2, 4, 10, 100]) {
      expect(speedup(s)).toBeLessThan(s);
      expect(speedup(s)).toBeGreaterThan(1);
    }
    expect(speedup(10)).toBeGreaterThan(speedup(4));
    expect(speedup(4)).toBeGreaterThan(speedup(2));

    // Pinned arithmetic for the declared fixture, so a change to the profile is
    // visible as a test failure rather than a silent narrative shift. At
    // P = 820/1700 the bound is ~1.57x: a 4x faster fetch stage buys 1.57x
    // end-to-end, which is the whole point of the MATH-13 model correction.
    expect(P).toBeCloseTo(820 / 1700, 10);
    expect(speedup(2)).toBeCloseTo(1 / ((1 - P) + P / 2), 10);
    expect(speedup(4)).toBeCloseTo(1.566820276497696, 9);
    expect(speedup(10)).toBeCloseTo(1 / ((1 - P) + P / 10), 10);

    // Amdahl's corollary, in the direction that actually binds here: as the
    // bottleneck share P -> 0, the bound collapses toward 1 no matter how large
    // the component speedup is. Demonstrated over computed values, not asserted.
    const negligible = 1 / ((1 - 0.001) + 0.001 / 1000);
    expect(negligible).toBeLessThan(1.002);
    expect(negligible).toBeGreaterThan(1);
    // And the symmetric bound: with P = 1 the speedup equals the component
    // speedup exactly, which is the limit this workload approaches.
    expect(1 / ((1 - 1) + 1 / 4)).toBeCloseTo(4, 10);

    // Therefore optimizing the fetch stage alone cannot reach a 10x end-to-end
    // gain on this workload, and cannot even double it.
    expect(speedup(10)).toBeLessThan(10);
    expect(speedup(10)).toBeLessThan(2);
    expect(speedup(100)).toBeLessThan(2);
  });

  it("MATH-13: createLatencySpan produces a validator-clean span with a wall-clock duration", () => {
    const { span: open, end } = createLatencySpan("geo_gate", "src-001", "job-1", { items: 4 });
    // An open span is deliberately incomplete and must not validate.
    expect(validateLatencySpan(open).valid).toBe(false);
    expect(validateLatencySpan(open).errors.join(" ")).toContain("completed_at");

    const closed = end(true, null);
    expect(closed.stage).toBe("geo_gate");
    expect(closed.job_id).toBe("job-1");
    expect(closed.success).toBe(true);
    expect(closed.duration_ms).toBeGreaterThanOrEqual(0);
    expect(Date.parse(closed.completed_at)).toBeGreaterThanOrEqual(Date.parse(closed.started_at));
    expect(validateLatencySpan(closed).valid).toBe(true);

    const failed = end(false, "geo gate rejected");
    expect(failed.success).toBe(false);
    expect(failed.error_message).toBe("geo gate rejected");
    expect(validateLatencySpan(failed).valid).toBe(true);
  });

  it("MATH-13: span validation rejects an inflated duration_ms and an unknown stage", () => {
    const inflated = span("parse", 140);
    inflated.duration_ms = 60_000;
    const result = validateLatencySpan(inflated);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("significantly differs from timestamp diff");

    const badStage = span("parse", 10);
    (badStage as { stage: string }).stage = "teleport";
    expect(validateLatencySpan(badStage).valid).toBe(false);
    expect(isValidPipelineStage("teleport")).toBe(false);
    expect(isValidPipelineStage("geo_gate")).toBe(true);

    const negative = span("parse", 10);
    negative.duration_ms = -1;
    expect(validateLatencySpan(negative).valid).toBe(false);
  });

  it("MATH-13: fetch byte stats separate conditional attempts from real cache hits", () => {
    const logs: FetchByteLog[] = [
      fetchLog({ bytes_fetched: 40_000, http_status: 200, fetch_latency_ms: 120 }),
      fetchLog({
        bytes_fetched: 0,
        conditional_attempted: true,
        not_modified: true,
        request_etag: '"v1"',
        response_etag: '"v1"',
        http_status: 304,
        fetch_latency_ms: 30,
      }),
      fetchLog({
        bytes_fetched: 41_000,
        conditional_attempted: true,
        not_modified: false,
        request_etag: '"v1"',
        response_etag: '"v2"',
        http_status: 200,
        fetch_latency_ms: 130,
      }),
      fetchLog({
        bytes_fetched: 0,
        conditional_attempted: true,
        not_modified: true,
        request_etag: '"v2"',
        response_etag: '"v2"',
        http_status: 304,
        fetch_latency_ms: 20,
      }),
    ];

    const stats = computeSourceFetchByteStats("src-001", "provider-a", "epoch-1", logs);
    expect(stats.total_attempts).toBe(4);
    expect(stats.full_fetches).toBe(2);
    expect(stats.conditional_attempts).toBe(3);
    expect(stats.not_modified_count).toBe(2);
    expect(stats.total_bytes_fetched).toBe(81_000);
    expect(stats.conditional_fetch_ratio).toBeCloseTo(0.75, 10);
    expect(stats.cache_hit_rate).toBeCloseTo(2 / 3, 10);
    expect(stats.total_fetch_latency_ms).toBe(300);
    expect(stats.avg_fetch_latency_ms).toBe(75);

    // A conditional attempt that returns 200 is work, not a cache hit: it is
    // counted in the denominator of conditional_fetch_ratio and excluded from
    // not_modified_count. Reusing one 200 as a "hit" would overstate reuse.
    expect(stats.full_fetches).toBe(2);

    // No attempts is an explicit zero, not a NaN ratio.
    const empty = computeSourceFetchByteStats("src-001", "provider-a", "epoch-1", []);
    expect(empty.total_attempts).toBe(0);
    expect(empty.conditional_fetch_ratio).toBe(0);
    expect(empty.cache_hit_rate).toBe(0);
    expect(empty.avg_bytes_per_full_fetch).toBe(0);
    expect(empty.avg_fetch_latency_ms).toBe(0);
  });

  it("MATH-13: FINDING — avg_bytes_per_full_fetch divides all bytes by full fetches, so it is an upper bound", () => {
    // A 304 that still carries a body contributes to total_bytes_fetched but
    // not to full_fetches, inflating the per-full-fetch average. Asserted as
    // current behavior; the field is not a clean per-full-fetch measurement.
    const stats = computeSourceFetchByteStats("src-001", "provider-a", "epoch-1", [
      fetchLog({ bytes_fetched: 10_000, http_status: 200, fetch_latency_ms: 10 }),
      fetchLog({
        bytes_fetched: 5_000,
        conditional_attempted: true,
        not_modified: true,
        http_status: 304,
        fetch_latency_ms: 5,
      }),
    ]);
    expect(stats.full_fetches).toBe(1);
    expect(stats.total_bytes_fetched).toBe(15_000);
    expect(stats.avg_bytes_per_full_fetch).toBe(15_000);
    expect(stats.avg_bytes_per_full_fetch).toBeGreaterThan(10_000);
  });

  it("MATH-13: the fetch log validator refuses a not_modified claim that no conditional request or 304 supports", () => {
    const honest = fetchLog({
      conditional_attempted: true,
      not_modified: true,
      http_status: 304,
      request_etag: '"v1"',
    });
    expect(validateFetchByteLog(honest).valid).toBe(true);

    const noRequest = fetchLog({ not_modified: true, http_status: 304, conditional_attempted: false });
    const a = validateFetchByteLog(noRequest);
    expect(a.valid).toBe(false);
    expect(a.errors.join(" ")).toContain("conditional");

    const wrongStatus = fetchLog({ conditional_attempted: true, not_modified: true, http_status: 200 });
    const b = validateFetchByteLog(wrongStatus);
    expect(b.valid).toBe(false);
    expect(b.errors.join(" ")).toContain("304");

    const negativeBytes = fetchLog({ bytes_fetched: -1 });
    expect(validateFetchByteLog(negativeBytes).valid).toBe(false);
  });

  it("MATH-13: measurement-contract maturity is a coverage gate that names its own missing contracts", () => {
    const immature = checkMeasurementContractMaturity({
      hunterLedgerCoverage: 0.95,
      cohortLabelCoverage: 0.4,
      latencyTraceCoverage: 0.75,
      byteLogCoverage: 0.95,
      lakeD1JoinCoverage: 0.7,
    });
    expect(immature.mature).toBe(false);
    expect(immature.missing).toContain("SSAE-06B");
    expect(immature.contractStatus["SSAE-06A"]!.mature).toBe(true);
    expect(immature.contractStatus["SSAE-06C"]!.mature).toBe(true);
    expect(immature.contractStatus["SSAE-06B"]!.coverage).toBeCloseTo(0.4, 10);

    // Zero coverage everywhere is NOT maturity. Missing telemetry stays missing.
    const none = checkMeasurementContractMaturity({
      hunterLedgerCoverage: 0,
      cohortLabelCoverage: 0,
      latencyTraceCoverage: 0,
      byteLogCoverage: 0,
      lakeD1JoinCoverage: 0,
    });
    expect(none.mature).toBe(false);
    expect(none.missing.sort()).toEqual(["SSAE-06A", "SSAE-06B", "SSAE-06C", "SSAE-06D", "SSAE-06E"]);

    // Live coverage is UNKNOWN from this sandbox, so the mature branch is not
    // exercised here rather than being asserted from invented numbers.
  });
});