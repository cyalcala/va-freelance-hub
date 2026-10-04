/**
 * Pure Read-Only Source Ranker — scripts/lake/source-ranker.ts
 *
 * SSAE-03: Implements a deterministic, read-only source ranking function that
 * produces a frozen-input Top-K candidate pool with score/cost decomposition,
 * exclusions, and cold revisit reasons. No learned model, no network calls,
 * no production mutations.
 *
 * Depends on: SSAE-02 (SourceMemoryRecord schema, replay_coverage matrix, version deps)
 * Enables: SSAE-04 (temporal holdouts), SSAE-05 (shadow decisions), SSAE-10 (allocator)
 *
 * Run: bun run scripts/lake/source-ranker.ts --help
 */

import { getLakeClient } from "./client";
import type { StandardCapability } from "../../packages/scraper/capability-registry";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Processing mode per SSAE-02 contract */
export type ProcessingMode = "FULL" | "REINDEX" | "REUSE" | "BOUNDED_REPLAY";

/** Dependency types that invalidate cached decisions */
export type Dependency =
  | "GEO"
  | "REMOTE"
  | "IDENTITY"
  | "URL"
  | "SOURCE_AUTHORITY"
  | "POLICY"
  | "PARSER"
  | "SCHEMA"
  | "MODEL"
  | "TAXONOMY";

/** Hard feasibility for a source/action/epoch (from SSAE strategy) */
export interface FeasibilityGate {
  permitted: boolean;
  reason: string;
  hardGate: "ROBOTS" | "RATE_LIMIT" | "OPT_OUT" | "POLICY_EXPIRY" | "LEASE_EXPIRY" | "UNKNOWN" | "NONE";
}

/** Version dependency snapshot for invalidation checking */
export interface VersionDeps {
  policy_version: string;
  processor_version: string;
  geo_gate_version: string;
  triage_version: string | null;
  jev_version: string | null;
  fingerprint_version: string;
  content_hash_version: string;
}

/** Current deployment versions (from SSAE-02 Section 4.2) */
export const CURRENT_VERSIONS: VersionDeps = {
  policy_version: "constitution-v5.2",
  processor_version: "capability-registry@1.0.0", // implicit, not explicitly versioned in code
  geo_gate_version: "geoGate@2026-09-15", // implicit
  triage_version: "triage@1.0.0", // implicit
  jev_version: "jev-1.13",
  fingerprint_version: "fingerprint@v1",
  content_hash_version: "contentHash@v1",
};

/** Compact source memory record (from SSAE-02 Section 3.2) */
export interface SourceMemoryRecord {
  source_id: string;
  provider_id: string;
  declared_capability: StandardCapability;
  endpoint_url: string;
  company_token?: string;

  payload_kind: "json" | "xml" | "html";
  selected_processor: string;
  routing_warnings: string[];

  fetch_state: {
    etag: string | null;
    last_modified: string | null;
    last_body_hash: string | null;
    last_fetch_at: string | null;
    last_fetch_ok: boolean;
    consecutive_failures: number;
    backoff_until: string | null;
  };

  lake_state: {
    last_raw_observation_id: number | null;
    last_candidate_count: number;
    last_qualified_ready: number;
    last_ingestion_at: string | null;
    last_sighting_at: string | null;
  };

  publication_state: {
    compliance_state: "allowed" | "conditional" | "blocked" | "unknown";
    operational_state: "candidate" | "shadow" | "canary" | "active" | "review_due" | "paused" | "degraded" | "quarantined" | "retired";
    policy_expiry: string | null;
    opt_out: boolean;
    lease_expiry: string | null;
    last_decision: string | null;
    last_decision_at: string | null;
    last_publication_at: string | null;
    last_publication_count: number;
    last_publication_mode: "unlimited" | "capped" | "blocked" | "rolled_back";
    concentration_status: "OK" | "RELIEVES" | "BLOCKED" | "UNKNOWN";
  };

  health_rollup: {
    recent_success_rate: number;
    recent_ph_rate: number;
    recent_false_ph_rate: number | null;
    last_quality_check_at: string | null;
    robots_last_checked_at: string | null;
    robots_allows: boolean | null;
  };

  version_deps: VersionDeps;

  retention: {
    raw_observation_ttl_days: number;
    candidate_ttl_days: number;
    sighting_ttl_days: number;
    fetch_state_ttl_days: number;
    publication_receipt_ttl_days: number;
  };

  replay_coverage: {
    can_replay_geo_gate: boolean;
    can_replay_triage: boolean;
    can_replay_fingerprint: boolean;
    can_replay_conditional: boolean;
    can_replay_publication: boolean;
    missing_fields: string[];
  };

  material_digests: {
    fingerprint_hash: string;
    content_hash: string;
    description_hash: string | null;
    policy_hash: string;
  };
}

/** Ranked source candidate output */
export interface RankedSource {
  source_id: string;
  provider_id: string;
  declared_capability: StandardCapability;
  endpoint_url: string;

  // Score components
  score: number;
  score_breakdown: {
    marginal_yield_estimate: number;
    cost_estimate_cents: number;
    feasibility_penalty: number;
    freshness_bonus: number;
    diversity_bonus: number;
    cold_revisit_bonus: number;
  };

  // Mode selection
  processing_mode: ProcessingMode;
  mode_reason: string;

  // Feasibility
  feasibility: FeasibilityGate;

  // Exclusions and revisit
  excluded: boolean;
  exclusion_reason: string | null;
  cold_revisit_reason: string | null;
  cold_revisit_due_at: string | null;

  // Evidence
  evidence_refs: string[];
  evidence_complete: boolean;
  dependencies: Dependency[] | null;

  // Metadata
  ranked_at: string;
  selector_version: string;
}

/** Ranker configuration */
export interface RankerConfig {
  topK: number;
  minQualifiedReady: number;
  maxCostPerSourceCents: number;
  concentrationCeiling: { source: number; family: number };
  coldRevisitDays: number;
  version: string;
}

/** Default ranker configuration */
export const DEFAULT_RANKER_CONFIG: RankerConfig = {
  topK: 50,
  minQualifiedReady: 3,
  maxCostPerSourceCents: 500,
  concentrationCeiling: { source: 0.25, family: 0.40 },
  coldRevisitDays: 7,
  version: "source-ranker@v1",
};

/** Ranker input: frozen selection epoch context */
export interface RankerInput {
  sources: SourceMemoryRecord[];
  currentConcentration: { sourceShares: Record<string, number>; familyShares: Record<string, number> };
  epochTimestamp: string;
  config?: Partial<RankerConfig>;
}

/** Ranker output */
export interface RankerOutput {
  ranked: RankedSource[];
  excluded: RankedSource[];
  coldRevisit: RankedSource[];
  metadata: {
    totalSources: number;
    feasibleSources: number;
    rankedCount: number;
    excludedCount: number;
    coldRevisitCount: number;
    rankedAt: string;
    selectorVersion: string;
    config: RankerConfig;
  };
}

// ─── Core Ranker Logic ────────────────────────────────────────────────────────

/**
 * Determines processing mode for a source based on evidence state and dependencies.
 * Implements SSAE-02 Section 3.4 Action Feasibility Matrix.
 */
export function selectProcessingMode(
  record: SourceMemoryRecord,
  currentVersions: VersionDeps
): { mode: ProcessingMode; reason: string; dependencies: Dependency[] | null } {
  // Check for immediate invalidation triggers (opt-out, policy expiry, lease expiry)
  if (record.publication_state.opt_out) {
    return { mode: "BOUNDED_REPLAY", reason: "Source opted out — withdrawal propagation required", dependencies: ["SOURCE_AUTHORITY", "POLICY"] };
  }
  if (record.publication_state.policy_expiry && new Date(record.publication_state.policy_expiry) < new Date()) {
    return { mode: "BOUNDED_REPLAY", reason: "Policy lease expired — re-evaluation required", dependencies: ["POLICY", "SOURCE_AUTHORITY"] };
  }
  if (record.publication_state.lease_expiry && new Date(record.publication_state.lease_expiry) < new Date()) {
    return { mode: "BOUNDED_REPLAY", reason: "Evidence lease expired — fresh evidence required", dependencies: ["SOURCE_AUTHORITY"] };
  }

  // Check version dependencies for REUSE eligibility
  const versionMismatch = checkVersionMismatch(record.version_deps, currentVersions);
  if (versionMismatch.length > 0) {
    // Check for unknown version (conservative -> FULL)
    const hasUnknown = versionMismatch.some(d => {
      const key = Object.entries(VERSION_KEY_TO_DEPENDENCY).find(([, v]) => v === d)?.[0];
      if (!key) return false;
      const storedVal = record.version_deps[key as keyof VersionDeps];
      return storedVal === "unknown" || storedVal === "unversioned" || !storedVal;
    });
    if (hasUnknown) {
      return { mode: "FULL", reason: "Unknown version dependency — conservative FULL required", dependencies: versionMismatch };
    }

    // Single targeted dependency changes -> BOUNDED_REPLAY
    // Targeted: GEO, TRIAGE, FINGERPRINT, CONTENT_HASH, POLICY
    // Non-targeted (broad): PROCESSOR (PARSER), MODEL (JEV)
    const targetedDeps: Dependency[] = ["GEO", "TAXONOMY", "IDENTITY", "POLICY"];
    const isSingleTargeted = versionMismatch.length === 1 && targetedDeps.includes(versionMismatch[0]);

    if (isSingleTargeted) {
      const depName = versionMismatch[0];
      const displayName = depName === "GEO" ? "GEO_GATE" : depName;
      return { mode: "BOUNDED_REPLAY", reason: `Targeted dependency version change: ${displayName}`, dependencies: versionMismatch };
    }

    // Multiple changes or non-targeted (PROCESSOR, MODEL) -> REINDEX
    return { mode: "REINDEX", reason: `Version mismatch: ${versionMismatch.join(", ")}`, dependencies: versionMismatch };
  }

  // Check if we have sufficient evidence for REUSE
  if (record.lake_state.last_qualified_ready > 0 &&
      record.lake_state.last_candidate_count > 0 &&
      record.material_digests.fingerprint_hash &&
      record.material_digests.content_hash) {
    return { mode: "REUSE", reason: "Sufficient compatible evidence exists; no dependency changes", dependencies: null };
  }

  // No prior evidence or missing critical fields -> FULL
  return { mode: "FULL", reason: "Insufficient prior evidence or first evaluation", dependencies: null };
}

/** Maps version dependency keys to Dependency types */
const VERSION_KEY_TO_DEPENDENCY: Record<string, Dependency> = {
  policy_version: "POLICY",
  processor_version: "PARSER",
  geo_gate_version: "GEO",
  triage_version: "TAXONOMY",
  jev_version: "MODEL",
  fingerprint_version: "IDENTITY",
  content_hash_version: "IDENTITY",
};

/** Checks version dependencies against current deployment */
function checkVersionMismatch(stored: VersionDeps, current: VersionDeps): Dependency[] {
  const mismatches: Dependency[] = [];
  const keys: (keyof VersionDeps)[] = [
    "policy_version",
    "processor_version",
    "geo_gate_version",
    "triage_version",
    "jev_version",
    "fingerprint_version",
    "content_hash_version",
  ];
  for (const key of keys) {
    const storedVal = stored[key];
    const currentVal = current[key];
    if (storedVal !== currentVal) {
      if (storedVal === "unknown" || storedVal === "unversioned" || !storedVal) {
        mismatches.push(VERSION_KEY_TO_DEPENDENCY[key]);
      } else if (currentVal && storedVal !== currentVal) {
        mismatches.push(VERSION_KEY_TO_DEPENDENCY[key]);
      }
    }
  }
  return mismatches;
}

/**
 * Evaluates hard feasibility for a source (g(i,a,t) from SSAE strategy).
 * Probe, replay, refresh, and publish have distinct feasibility.
 */
export function evaluateFeasibility(record: SourceMemoryRecord, now: Date): FeasibilityGate {
  // Compliance state gate
  if (record.publication_state.compliance_state !== "allowed" &&
      record.publication_state.compliance_state !== "conditional") {
    return { permitted: false, reason: `Compliance state: ${record.publication_state.compliance_state}`, hardGate: "POLICY_EXPIRY" };
  }

  // Operational state gate
  if (record.publication_state.operational_state === "retired" ||
      record.publication_state.operational_state === "quarantined") {
    return { permitted: false, reason: `Operational state: ${record.publication_state.operational_state}`, hardGate: "POLICY_EXPIRY" };
  }

  // Opt-out gate (hard)
  if (record.publication_state.opt_out) {
    return { permitted: false, reason: "Source opted out", hardGate: "OPT_OUT" };
  }

  // Policy expiry gate (hard)
  if (record.publication_state.policy_expiry && new Date(record.publication_state.policy_expiry) < now) {
    return { permitted: false, reason: `Policy lease expired at ${record.publication_state.policy_expiry}`, hardGate: "POLICY_EXPIRY" };
  }

  // Evidence lease expiry gate (hard)
  if (record.publication_state.lease_expiry && new Date(record.publication_state.lease_expiry) < now) {
    return { permitted: false, reason: `Evidence lease expired at ${record.publication_state.lease_expiry}`, hardGate: "LEASE_EXPIRY" };
  }

  // Robots gate
  if (record.health_rollup.robots_allows === false) {
    return { permitted: false, reason: "Robots.txt disallows", hardGate: "ROBOTS" };
  }

  // Rate limit / backoff gate
  if (record.fetch_state.backoff_until && new Date(record.fetch_state.backoff_until) > now) {
    return { permitted: false, reason: `Backoff active until ${record.fetch_state.backoff_until}`, hardGate: "RATE_LIMIT" };
  }
  if (record.fetch_state.consecutive_failures > 3) {
    return { permitted: false, reason: `${record.fetch_state.consecutive_failures} consecutive failures — quarantined`, hardGate: "RATE_LIMIT" };
  }

  // Minimum qualified ready for publication consideration
  if (record.lake_state.last_qualified_ready < 1) {
    return { permitted: true, reason: "No qualified candidates yet — fetch permitted but publication unlikely", hardGate: "NONE" };
  }

  return { permitted: true, reason: "All hard gates passed", hardGate: "NONE" };
}

/**
 * Estimates marginal yield for a source based on historical evidence.
 * Simple empirical baseline: recent PH rate * qualified_ready count.
 */
export function estimateMarginalYield(record: SourceMemoryRecord): number {
  const phRate = record.health_rollup.recent_ph_rate;
  const qualifiedReady = record.lake_state.last_qualified_ready;
  const candidateCount = record.lake_state.last_candidate_count;

  if (candidateCount === 0) return 0;
  if (qualifiedReady === 0) return 0;

  // Marginal yield = qualified_ready * PH rate (conservative)
  return qualifiedReady * phRate;
}

/**
 * Estimates cost in cents for processing a source.
 * Includes fetch, parse, geo, AI, DB writes.
 */
export function estimateCostCents(record: SourceMemoryRecord): number {
  const baseCost = 10; // Base fetch cost in cents
  const candidateMultiplier = Math.min(record.lake_state.last_candidate_count / 100, 10);
  const aiCost = record.publication_state.last_decision === "ADMIT" ? 5 : 0; // Jev call cost
  const dbWriteCost = Math.min(record.lake_state.last_qualified_ready * 0.1, 50);

  return Math.round(baseCost + candidateMultiplier * 5 + aiCost + dbWriteCost);
}

/**
 * Computes freshness bonus based on last ingestion time.
 */
export function computeFreshnessBonus(record: SourceMemoryRecord, now: Date): number {
  if (!record.lake_state.last_ingestion_at) return 0;
  const hoursSinceIngestion = (now.getTime() - new Date(record.lake_state.last_ingestion_at).getTime()) / (1000 * 60 * 60);
  if (hoursSinceIngestion < 1) return 1.0; // Very fresh (< 1 hour)
  if (hoursSinceIngestion <= 12) return 0.5; // Fresh (<= 12 hours)
  if (hoursSinceIngestion < 48) return 0.2; // Stale (< 48 hours)
  return 0;
}

/**
 * Computes diversity bonus based on concentration ceilings.
 */
export function computeDiversityBonus(
  record: SourceMemoryRecord,
  concentration: { sourceShares: Record<string, number>; familyShares: Record<string, number> },
  ceilings: { source: number; family: number }
): number {
  const sourceShare = concentration.sourceShares[record.source_id] ?? 0;
  const familyShare = concentration.familyShares[record.provider_id] ?? 0;

  // New source/family gets max diversity bonus
  if (sourceShare === 0 && familyShare === 0) return 0.5;

  let bonus = 0;
  if (sourceShare < ceilings.source * 0.5) bonus += 0.25;
  if (familyShare < ceilings.family * 0.5) bonus += 0.25;

  return Math.min(bonus, 0.5); // Cap at 0.5
}

/**
 * Determines if a source is due for cold revisit.
 */
export function checkColdRevisit(record: SourceMemoryRecord, config: RankerConfig, now: Date): { due: boolean; reason: string; dueAt: string | null } {
  if (!record.lake_state.last_sighting_at && !record.lake_state.last_ingestion_at) {
    return { due: true, reason: "Never observed — cold start", dueAt: now.toISOString() };
  }

  const lastObserved = record.lake_state.last_sighting_at || record.lake_state.last_ingestion_at;
  if (!lastObserved) return { due: false, reason: "No observation timestamp", dueAt: null };

  const daysSinceObserved = (now.getTime() - new Date(lastObserved).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceObserved >= config.coldRevisitDays) {
    const dueAt = new Date(now.getTime() + config.coldRevisitDays * 24 * 60 * 60 * 1000).toISOString();
    return { due: true, reason: `No observation for ${Math.round(daysSinceObserved)} days`, dueAt };
  }

  return { due: false, reason: `Last observed ${Math.round(daysSinceObserved)} days ago`, dueAt: null };
}

/**
 * Main ranker function: pure, deterministic, read-only.
 * Takes frozen input and produces ranked candidates with full audit trail.
 */
export function rankSources(input: RankerInput): RankerOutput {
  const now = new Date(input.epochTimestamp);
  const config = { ...DEFAULT_RANKER_CONFIG, ...input.config };
  const currentVersions = CURRENT_VERSIONS;

  const ranked: RankedSource[] = [];
  const excluded: RankedSource[] = [];
  const coldRevisit: RankedSource[] = [];

  for (const record of input.sources) {
    // Evaluate feasibility
    const feasibility = evaluateFeasibility(record, now);

    // Select processing mode
    const { mode, reason: modeReason, dependencies } = selectProcessingMode(record, currentVersions);

    // Check cold revisit
    const cold = checkColdRevisit(record, config, now);

    // Compute score components
    const marginalYield = estimateMarginalYield(record);
    const costCents = estimateCostCents(record);
    const freshnessBonus = computeFreshnessBonus(record, now);
    const diversityBonus = computeDiversityBonus(record, input.currentConcentration, config.concentrationCeiling);

    // Feasibility penalty
    const feasibilityPenalty = feasibility.permitted ? 0 : 1000;

    // Base score: marginal yield / cost (yield per cent)
    const baseScore = costCents > 0 ? marginalYield / costCents : 0;

    // Composite score
    const score = baseScore + freshnessBonus + diversityBonus - feasibilityPenalty;

    // Check exclusions
    let excludedFlag = false;
    let exclusionReason: string | null = null;

    if (!feasibility.permitted) {
      excludedFlag = true;
      exclusionReason = feasibility.reason;
    } else if (costCents > config.maxCostPerSourceCents) {
      excludedFlag = true;
      exclusionReason = `Cost ${costCents}¢ exceeds budget ${config.maxCostPerSourceCents}¢`;
    } else if (record.lake_state.last_qualified_ready < config.minQualifiedReady) {
      excludedFlag = true;
      exclusionReason = `Qualified ready ${record.lake_state.last_qualified_ready} < minimum ${config.minQualifiedReady}`;
    }

    // Evidence refs
    const evidenceRefs = [
      `lake_candidate_jobs:${record.source_id}`,
      `lake_ats_discovery:${record.source_id}`,
      `source_registry:${record.source_id}`,
    ];

    const rankedSource: RankedSource = {
      source_id: record.source_id,
      provider_id: record.provider_id,
      declared_capability: record.declared_capability,
      endpoint_url: record.endpoint_url,
      score,
      score_breakdown: {
        marginal_yield_estimate: marginalYield,
        cost_estimate_cents: costCents,
        feasibility_penalty: feasibilityPenalty,
        freshness_bonus: freshnessBonus,
        diversity_bonus: diversityBonus,
        cold_revisit_bonus: cold.due ? 0.5 : 0,
      },
      processing_mode: mode,
      mode_reason: modeReason,
      feasibility,
      excluded: excludedFlag,
      exclusion_reason: exclusionReason,
      cold_revisit_reason: cold.due ? cold.reason : null,
      cold_revisit_due_at: cold.dueAt,
      evidence_refs: evidenceRefs,
      evidence_complete: record.replay_coverage.can_replay_geo_gate &&
                         record.replay_coverage.can_replay_fingerprint &&
                         record.replay_coverage.can_replay_conditional &&
                         record.replay_coverage.can_replay_triage,
      dependencies,
      ranked_at: now.toISOString(),
      selector_version: config.version,
    };

    if (excludedFlag) {
      excluded.push(rankedSource);
    } else if (cold.due) {
      coldRevisit.push(rankedSource);
    } else {
      ranked.push(rankedSource);
    }
  }

  // Sort by score descending
  ranked.sort((a, b) => b.score - a.score);
  excluded.sort((a, b) => b.score - a.score);
  coldRevisit.sort((a, b) => b.score - a.score);

  // Take top-K
  const topRanked = ranked.slice(0, config.topK);

  return {
    ranked: topRanked,
    excluded,
    coldRevisit,
    metadata: {
      totalSources: input.sources.length,
      feasibleSources: input.sources.filter(s => evaluateFeasibility(s, now).permitted).length,
      rankedCount: topRanked.length,
      excludedCount: excluded.length,
      coldRevisitCount: coldRevisit.length,
      rankedAt: now.toISOString(),
      selectorVersion: config.version,
      config,
    },
  };
}

// ─── Lake Integration Helpers ─────────────────────────────────────────────────

/** Builds SourceMemoryRecord from lake data (read-only derivation) */
export async function buildSourceMemoryRecords(): Promise<SourceMemoryRecord[]> {
  const client = getLakeClient();

  // Get source registry state
  const registryRes = await client.execute(`
    SELECT source_id, provider_id, display_name, endpoint_url, company_token,
           compliance_state, operational_state, review_deadline, policy_expiry,
           owner, last_decision, last_decision_at, opt_out, health_rollup
    FROM source_registry
    WHERE operational_state NOT IN ('retired')
  `);

  // Get lake candidate stats per source
  const lakeRes = await client.execute(`
    SELECT
      source_id,
      COUNT(*) as candidate_count,
      SUM(CASE WHEN status = 'QUALIFIED_READY' THEN 1 ELSE 0 END) as qualified_ready,
      MAX(synced_to_d1_at) as last_synced_at,
      MAX(last_observed_at) as last_sighting_at,
      MAX(created_at) as last_ingestion_at,
      MAX(id) as last_raw_observation_id
    FROM lake_candidate_jobs
    GROUP BY source_id
  `);

  // Get fetch state from D1 (via lake_runs or source_fetch_events)
  // For now, synthesize from available data
  const fetchStateRes = await client.execute(`
    SELECT source_id, MAX(fetched_at) as last_fetch_at
    FROM lake_raw_observations
    GROUP BY source_id
  `);

  const lakeStats = new Map((lakeRes.rows as any[]).map(r => [r.source_id, r]));
  const fetchStates = new Map((fetchStateRes.rows as any[]).map(r => [r.source_id, r]));

  const records: SourceMemoryRecord[] = [];

  for (const reg of (registryRes.rows as any[])) {
    const lake = lakeStats.get(reg.source_id);
    const fetch = fetchStates.get(reg.source_id);

    // Determine capability from provider/endpoint
    const capability = inferCapability(reg.endpoint_url, reg.provider_id);

    records.push({
      source_id: reg.source_id,
      provider_id: reg.provider_id,
      declared_capability: capability,
      endpoint_url: reg.endpoint_url,
      company_token: reg.company_token,
      payload_kind: capabilityToPayloadKind(capability),
      selected_processor: capability,
      routing_warnings: [],
      fetch_state: {
        etag: null,
        last_modified: null,
        last_body_hash: null,
        last_fetch_at: fetch?.last_fetch_at ?? null,
        last_fetch_ok: true,
        consecutive_failures: 0,
        backoff_until: null,
      },
      lake_state: {
        last_raw_observation_id: lake?.last_raw_observation_id ?? null,
        last_candidate_count: lake?.candidate_count ?? 0,
        last_qualified_ready: lake?.qualified_ready ?? 0,
        last_ingestion_at: lake?.last_ingestion_at ?? null,
        last_sighting_at: lake?.last_sighting_at ?? null,
      },
      publication_state: {
        compliance_state: reg.compliance_state,
        operational_state: reg.operational_state,
        policy_expiry: reg.policy_expiry,
        opt_out: Boolean(reg.opt_out),
        lease_expiry: reg.review_deadline ?? null,
        last_decision: reg.last_decision,
        last_decision_at: reg.last_decision_at,
        last_publication_at: null, // Would need D1 join
        last_publication_count: 0,
        last_publication_mode: "unlimited",
        concentration_status: "UNKNOWN",
      },
      health_rollup: {
        recent_success_rate: 1.0, // Unknown without fetch events
        recent_ph_rate: lake?.candidate_count > 0 ? (lake.qualified_ready / lake.candidate_count) : 0,
        recent_false_ph_rate: null,
        last_quality_check_at: null,
        robots_last_checked_at: null,
        robots_allows: true, // Assume allowed unless known blocked
      },
      version_deps: { ...CURRENT_VERSIONS },
      retention: {
        raw_observation_ttl_days: 30,
        candidate_ttl_days: 180,
        sighting_ttl_days: 365,
        fetch_state_ttl_days: 90,
        publication_receipt_ttl_days: 3650, // Forever-ish
      },
      replay_coverage: {
        can_replay_geo_gate: true,
        can_replay_triage: false, // raw_payload truncated
        can_replay_fingerprint: true,
        can_replay_conditional: true,
        can_replay_publication: true,
        missing_fields: ["raw_payload_full", "jev_raw"],
      },
      material_digests: {
        fingerprint_hash: "", // Computed per candidate
        content_hash: "",
        description_hash: null,
        policy_hash: "constitution-v5.2",
      },
    });
  }

  return records;
}

/** Infers capability from endpoint URL and provider */
function inferCapability(endpointUrl: string, providerId: string): StandardCapability {
  const url = endpointUrl.toLowerCase();
  if (url.includes("breezy.hr") || url.includes("greenhouse.io") || url.includes("lever.co") || url.includes("workable.com") || url.includes("ashbyhq.com")) {
    return "ats_json";
  }
  if (url.includes(".xml") || url.includes("/rss") || url.includes("/feed")) {
    return "rss_xml";
  }
  if (url.includes("recruitee.com") || url.includes("teamtailor.com")) {
    return "structured_xml";
  }
  if (url.includes("remoteok.io") || url.includes("himalayas.app")) {
    return "public_json_api";
  }
  return "public_json_api"; // Default
}

function capabilityToPayloadKind(cap: StandardCapability): "json" | "xml" | "html" {
  if (cap === "ats_json" || cap === "public_json_api") return "json";
  if (cap === "rss_xml" || cap === "structured_xml") return "xml";
  return "html";
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
Pure Read-Only Source Ranker (SSAE-03)

Usage:
  bun run scripts/lake/source-ranker.ts [options]

Options:
  --top-k=N              Number of sources to rank (default: 50)
  --min-qualified=N      Minimum qualified_ready for inclusion (default: 3)
  --max-cost=N           Max cost per source in cents (default: 500)
  --cold-revisit-days=N  Days before cold revisit (default: 7)
  --dry-run              Print ranked output without writing
  --json                 Output JSON instead of human-readable
  --help                 Show this help

This is a READ-ONLY tool. It queries Turso for source evidence,
computes rankings in memory, and outputs results. No mutations.
`);
}

function parseArgs(argv: string[]): RankerConfig & { dryRun: boolean; json: boolean } {
  const config: Partial<RankerConfig> = {};
  let dryRun = false;
  let json = false;

  for (const arg of argv) {
    if (arg === "--help") { printHelp(); process.exit(0); }
    if (arg === "--dry-run") { dryRun = true; continue; }
    if (arg === "--json") { json = true; continue; }
    if (arg.startsWith("--top-k=")) { config.topK = parseInt(arg.split("=")[1], 10); continue; }
    if (arg.startsWith("--min-qualified=")) { config.minQualifiedReady = parseInt(arg.split("=")[1], 10); continue; }
    if (arg.startsWith("--max-cost=")) { config.maxCostPerSourceCents = parseInt(arg.split("=")[1], 10); continue; }
    if (arg.startsWith("--cold-revisit-days=")) { config.coldRevisitDays = parseInt(arg.split("=")[1], 10); continue; }
  }

  return { ...DEFAULT_RANKER_CONFIG, ...config, dryRun, json };
}

if (import.meta.main) {
  const { dryRun, json, topK, minQualifiedReady, maxCostPerSourceCents, coldRevisitDays, version, concentrationCeiling } = parseArgs(process.argv.slice(2));

  const config: RankerConfig = { topK, minQualifiedReady, maxCostPerSourceCents, coldRevisitDays, version, concentrationCeiling };

  console.log("=== SSAE-03 Pure Read-Only Source Ranker ===");
  console.log(`Config: topK=${topK} minQualified=${minQualifiedReady} maxCost=${maxCostPerSourceCents}¢ coldRevisit=${coldRevisitDays}d`);
  console.log("");

  try {
    // Build source memory records from lake
    const sources = await buildSourceMemoryRecords();
    console.log(`Loaded ${sources.length} source records from lake.`);

    // Compute concentration from lake
    const candidateRes = await getLakeClient().execute(`
      SELECT source_id, provider_id, COUNT(*) as cnt
      FROM lake_candidate_jobs
      WHERE status IN ('QUALIFIED_READY', 'SYNCED_TO_D1')
      GROUP BY source_id, provider_id
    `);
    const total = (candidateRes.rows as any[]).reduce((sum, r) => sum + r.cnt, 0);
    const sourceShares: Record<string, number> = {};
    const familyShares: Record<string, number> = {};
    for (const r of candidateRes.rows as any[]) {
      sourceShares[r.source_id] = r.cnt / (total || 1);
      familyShares[r.provider_id] = (familyShares[r.provider_id] || 0) + r.cnt / (total || 1);
    }

    // Rank
    const input: RankerInput = {
      sources,
      currentConcentration: { sourceShares, familyShares },
      epochTimestamp: new Date().toISOString(),
      config,
    };

    const output = rankSources(input);

    if (json) {
      console.log(JSON.stringify(output, null, 2));
    } else {
      console.log(`\n=== RANKED (top ${output.ranked.length}) ===`);
      for (const r of output.ranked) {
        console.log(`  ${r.source_id} (${r.provider_id}) score=${r.score.toFixed(4)} mode=${r.processing_mode} yield≈${r.score_breakdown.marginal_yield_estimate.toFixed(2)} cost=${r.score_breakdown.cost_estimate_cents}¢`);
        console.log(`    mode: ${r.mode_reason}`);
        console.log(`    feasibility: ${r.feasibility.permitted ? "OK" : "BLOCKED"} (${r.feasibility.reason})`);
        console.log(`    evidence_complete: ${r.evidence_complete}`);
      }

      console.log(`\n=== EXCLUDED (${output.excluded.length}) ===`);
      for (const r of output.excluded) {
        console.log(`  ${r.source_id}: ${r.exclusion_reason}`);
      }

      console.log(`\n=== COLD REVISIT (${output.coldRevisit.length}) ===`);
      for (const r of output.coldRevisit) {
        console.log(`  ${r.source_id}: ${r.cold_revisit_reason} (due: ${r.cold_revisit_due_at})`);
      }

      console.log(`\n=== METADATA ===`);
      console.log(`  Total sources: ${output.metadata.totalSources}`);
      console.log(`  Feasible: ${output.metadata.feasibleSources}`);
      console.log(`  Ranked: ${output.metadata.rankedCount}`);
      console.log(`  Excluded: ${output.metadata.excludedCount}`);
      console.log(`  Cold revisit: ${output.metadata.coldRevisitCount}`);
      console.log(`  Selector version: ${output.metadata.selectorVersion}`);
    }

    if (!dryRun) {
      // Could persist to lake_runs for audit trail
      console.log("\n[DRY-RUN] Would persist ranked output to lake_runs for audit trail.");
    }
  } catch (err: any) {
    console.error("Ranker failed:", err.message);
    process.exit(1);
  }
}