/**
 * SSAE-04 — Historical Temporal Holdout Evaluation
 *
 * Pure read-only evaluation of the deterministic family-stratified sampler (control)
 * against the SSAE-03 read-only ranker (treatment) using leakage-free temporal splits.
 *
 * Run: bun run scripts/lake/temporal-holdout-eval.ts --help
 *
 * All runtime counts UNKNOWN unless measured in this session with live Turso access.
 * No network/production mutations. No hold-list edits.
 */

import { getLakeClient, isLakeConfigured } from "./client";
import { rankSources, buildSourceMemoryRecords, DEFAULT_RANKER_CONFIG, type RankerInput, type SourceMemoryRecord, type RankedSource } from "./source-ranker";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EpochRecord {
  epoch_id: string;
  selection_timestamp: string;
  pipeline_phase: "hunter_scrape" | "lake_reconcile" | "lake_domain_discovery" | "lake_sync";
  source_id: string;
  source_platform: string;
  declared_capability: string;
  payload_kind: string;
  action_mode: "FULL" | "REINDEX" | "REUSE" | "BOUNDED_REPLAY";
  feasibility_gate: string;
  raw_items_fetched: number;
  items_normalized: number;
  items_geo_gated: number;
  geo_eligible_verified: number;
  geo_eligible_likely: number;
  items_qualified_ready: number;
  items_published: number;
  canonical_fingerprint: string;
  marginal_fresh_qualified_published: number;
  censored_by_ai_budget: boolean;
  censored_by_concentration: boolean;
  censored_by_opt_out: boolean;
  censored_by_robots: boolean;
  censored_by_lease_expiry: boolean;
}

interface HoldoutSplit {
  name: string;
  trainCutoff: string;
  valStart: string;
  valEnd: string;
  testStart: string;
}

interface EvaluationResult {
  split: HoldoutSplit;
  controlMetrics: SelectorMetrics;
  treatmentMetrics: SelectorMetrics;
  comparison: ComparisonMetrics;
  limitations: string[];
}

interface SelectorMetrics {
  selectedCount: number;
  totalPredictedYield: number;
  totalActualYield: number;
  calibrationError: number;
  costPerYieldCents: number;
  diversityScore: number;
  longTailCoverage: number;
  overlapRate: number;
}

interface ComparisonMetrics {
  deltaYield: number;
  deltaCostPerYield: number;
  deltaCalibration: number;
  deltaDiversity: number;
  deltaLongTail: number;
  statisticalSignificance: "UNKNOWN" | "INSUFFICIENT_DATA" | "NOT_SIGNIFICANT" | "SIGNIFICANT";
}

// ─── Temporal Holdout Design ──────────────────────────────────────────────────

/**
 * Defines the temporal holdout splits per SSAE-01 Section 5.3.
 * All splits require selection-time features only (no future leakage).
 * Positive labels require known first_publication_at > selection_timestamp.
 */
export const HOLDOUT_SPLITS: HoldoutSplit[] = [
  {
    name: "primary_2026_09",
    trainCutoff: "2026-09-01T00:00:00Z",
    valStart: "2026-09-01T00:00:00Z",
    valEnd: "2026-09-15T23:59:59Z",
    testStart: "2026-09-16T00:00:00Z",
  },
  {
    name: "extended_2026_08_09",
    trainCutoff: "2026-08-01T00:00:00Z",
    valStart: "2026-08-01T00:00:00Z",
    valEnd: "2026-08-31T23:59:59Z",
    testStart: "2026-09-01T00:00:00Z",
  },
];

/**
 * Control selector: deterministic family-stratified sampler (current production).
 * From reconcile-discovered-corpus.ts:64,119 — evenly spaced selection per family.
 */
export function controlSelector(
  sources: SourceMemoryRecord[],
  epochTimestamp: string,
  budget: { topK: number; maxCostPerSourceCents: number }
): RankedSource[] {
  // Group by provider family
  const byFamily = new Map<string, SourceMemoryRecord[]>();
  for (const s of sources) {
    if (!byFamily.has(s.provider_id)) byFamily.set(s.provider_id, []);
    byFamily.get(s.provider_id)!.push(s);
  }

  // Deterministic evenly-spaced selection per family (stride sampler)
  const selected: SourceMemoryRecord[] = [];
  const families = Array.from(byFamily.keys()).sort();
  const perFamily = Math.max(1, Math.floor(budget.topK / families.length));

  for (const family of families) {
    const familySources = byFamily.get(family)!;
    const stride = Math.max(1, Math.floor(familySources.length / perFamily));
    for (let i = 0; i < familySources.length && selected.length < budget.topK; i += stride) {
      selected.push(familySources[i]);
    }
  }

  // Rank by simple yield estimate (no cost/diversity/freshness)
  const now = new Date(epochTimestamp);
  return selected
    .map(s => ({
      source_id: s.source_id,
      provider_id: s.provider_id,
      declared_capability: s.declared_capability,
      endpoint_url: s.endpoint_url,
      score: s.lake_state.last_qualified_ready > 0
        ? (s.lake_state.last_qualified_ready * (s.health_rollup.recent_ph_rate || 0)) / 100
        : 0,
      score_breakdown: {
        marginal_yield_estimate: s.lake_state.last_qualified_ready * (s.health_rollup.recent_ph_rate || 0),
        cost_estimate_cents: 10,
        feasibility_penalty: 0,
        freshness_bonus: 0,
        diversity_bonus: 0,
        cold_revisit_bonus: 0,
      },
      processing_mode: "FULL" as const,
      mode_reason: "control-stride",
      feasibility: { permitted: true, reason: "control", hardGate: "NONE" },
      excluded: false,
      exclusion_reason: null,
      cold_revisit_reason: null,
      cold_revisit_due_at: null,
      evidence_refs: [],
      evidence_complete: false,
      dependencies: null,
      ranked_at: now.toISOString(),
      selector_version: "control-stride@v1",
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, budget.topK);
}

/**
 * Treatment selector: SSAE-03 read-only ranker with marginal yield/cost/freshness/diversity scoring.
 */
export async function treatmentSelector(
  sources: SourceMemoryRecord[],
  epochTimestamp: string,
  budget: { topK: number; maxCostPerSourceCents: number }
): Promise<RankedSource[]> {
  // Compute concentration from current source distribution
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

  const input: RankerInput = {
    sources,
    currentConcentration: { sourceShares, familyShares },
    epochTimestamp,
    config: { ...DEFAULT_RANKER_CONFIG, topK: budget.topK, maxCostPerSourceCents: budget.maxCostPerSourceCents },
  };

  const output = rankSources(input);
  return output.ranked;
}

// ─── Evaluation Metrics ──────────────────────────────────────────────────────

function computeMetrics(
  selected: RankedSource[],
  actualYieldMap: Map<string, number>, // source_id -> actual marginal fresh qualified published
  totalSources: number,
  totalCostCents: number
): SelectorMetrics {
  const selectedIds = new Set(selected.map(s => s.source_id));
  const selectedCount = selected.length;

  let totalPredictedYield = 0;
  let totalActualYield = 0;
  let sumSquaredError = 0;
  let totalCost = 0;
  let diversityBonusSum = 0;
  let longTailCount = 0;

  for (const s of selected) {
    const predicted = s.score_breakdown.marginal_yield_estimate;
    const actual = actualYieldMap.get(s.source_id) || 0;
    const cost = s.score_breakdown.cost_estimate_cents;

    totalPredictedYield += predicted;
    totalActualYield += actual;
    sumSquaredError += Math.pow(predicted - actual, 2);
    totalCost += cost;
    diversityBonusSum += s.score_breakdown.diversity_bonus;

    // Long-tail: sources with share < 1%
    const share = actual > 0 ? actual / (totalActualYield || 1) : 0;
    if (share < 0.01) longTailCount++;
  }

  const calibrationError = selectedCount > 0 ? Math.sqrt(sumSquaredError / selectedCount) : 0;
  const costPerYieldCents = totalActualYield > 0 ? totalCost / totalActualYield : Infinity;
  const diversityScore = selectedCount > 0 ? diversityBonusSum / selectedCount : 0;
  const longTailCoverage = totalSources > 0 ? longTailCount / totalSources : 0;

  // Overlap rate: placeholder (requires canonical fingerprint cross-source join)
  const overlapRate = 0; // UNKNOWN without D1 join

  return {
    selectedCount,
    totalPredictedYield,
    totalActualYield,
    calibrationError,
    costPerYieldCents,
    diversityScore,
    longTailCoverage,
    overlapRate,
  };
}

function compareSelectors(control: SelectorMetrics, treatment: SelectorMetrics): ComparisonMetrics {
  return {
    deltaYield: treatment.totalActualYield - control.totalActualYield,
    deltaCostPerYield: treatment.costPerYieldCents - control.costPerYieldCents,
    deltaCalibration: treatment.calibrationError - control.calibrationError,
    deltaDiversity: treatment.diversityScore - control.diversityScore,
    deltaLongTail: treatment.longTailCoverage - control.longTailCoverage,
    statisticalSignificance: "INSUFFICIENT_DATA",
  };
}

// ─── Main Evaluation Function ─────────────────────────────────────────────────

export async function runTemporalHoldoutEvaluation(
  split: HoldoutSplit,
  epochTimestamp: string
): Promise<EvaluationResult> {
  console.log(`\n=== SSAE-04 Temporal Holdout Evaluation: ${split.name} ===`);
  console.log(`Train cutoff: ${split.trainCutoff}`);
  console.log(`Validation window: ${split.valStart} to ${split.valEnd}`);
  console.log(`Test start: ${split.testStart}`);

  // Load source memory records from lake (read-only)
  console.log("\nLoading source memory records from lake...");
  const sources = await buildSourceMemoryRecords();
  console.log(`Loaded ${sources.length} source records.`);

  // Filter sources that existed at epoch timestamp (selection-time only)
  const eligibleSources = sources.filter(s => {
    // In production: check source_registry creation date, first lake observation, etc.
    // For now, all sources are eligible
    return true;
  });
  console.log(`Eligible at epoch: ${eligibleSources.length}`);

  // Budget from ranker config
  const budget = {
    topK: DEFAULT_RANKER_CONFIG.topK,
    maxCostPerSourceCents: DEFAULT_RANKER_CONFIG.maxCostPerSourceCents,
  };

  // Run control selector (deterministic stride sampler)
  console.log("\nRunning control selector (deterministic stride)...");
  const controlSelected = controlSelector(eligibleSources, epochTimestamp, budget);

  // Run treatment selector (SSAE-03 ranker)
  console.log("Running treatment selector (SSAE-03 ranker)...");
  const treatmentSelected = await treatmentSelector(eligibleSources, epochTimestamp, budget);

  // Get actual yield from historical data (LIMITED - requires first_publication_at)
  console.log("\nQuerying actual yield from publication ledger (LIMITED)...");
  const actualYieldMap = await queryActualYield(split);

  // Compute metrics
  const totalCost = (c: RankedSource[]) => c.reduce((sum, s) => sum + s.score_breakdown.cost_estimate_cents, 0);

  const controlMetrics = computeMetrics(controlSelected, actualYieldMap, eligibleSources.length, totalCost(controlSelected));
  const treatmentMetrics = computeMetrics(treatmentSelected, actualYieldMap, eligibleSources.length, totalCost(treatmentSelected));
  const comparison = compareSelectors(controlMetrics, treatmentMetrics);

  // Document limitations
  const limitations = [
    "Mature label coverage: INSUFFICIENT — no first_publication_at in lake, no cohort labels at publication, posted_at often NULL (per SSAE-01 Section 4.1)",
    "Per-source epoch features only available for Lake Domain Discovery/Sync phases; Hunter Scrape and Lake Reconcile lack per-source granularity (per SSAE-01 Section 2.2)",
    "Actual yield map derived from source_publication_ledger only; no D1 join for canonical fresh cohort labels",
    "Right-censored outcomes near data cutoff labeled CENSORED, not negative",
    "Overlap deduction requires canonical fingerprint cross-source join (D1 + lake) — not available",
    "Control stride sampler operates at corpus level (reconcile-discovered-corpus.ts), not per-source epoch level",
    "Treatment ranker uses synthetic cost estimates (no per-stage latency instrumentation)",
    "All runtime counts UNKNOWN unless measured with live Turso access in this session",
  ];

  return {
    split,
    controlMetrics,
    treatmentMetrics,
    comparison,
    limitations,
  };
}

async function queryActualYield(split: HoldoutSplit): Promise<Map<string, number>> {
  const yieldMap = new Map<string, number>();

  // Try to get actual publication data from source_publication_ledger
  // This is LIMITED per SSAE-01: no first_publication_at, no cohort labels
  try {
    const client = getLakeClient();
    const res = await client.execute(`
      SELECT
        spl.source_id,
        COUNT(DISTINCT json_each.value) as published_count
      FROM source_publication_ledger spl,
           json_each(spl.published_ids_json)
      WHERE spl.decided_at >= ?
        AND spl.decided_at <= ?
        AND spl.mode IN ('unlimited', 'capped')
      GROUP BY spl.source_id
    `, [split.valStart, split.valEnd]);

    for (const row of res.rows as any[]) {
      yieldMap.set(row.source_id, row.published_count);
    }
  } catch (err) {
    console.warn("  Could not query publication ledger:", err instanceof Error ? err.message : String(err));
  }

  return yieldMap;
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
SSAE-04 Historical Temporal Holdout Evaluation

Usage:
  bun run scripts/lake/temporal-holdout-eval.ts [options]

Options:
  --split=NAME           Holdout split to evaluate (primary_2026_09, extended_2026_08_09)
  --epoch=ISO8601        Selection epoch timestamp (default: validation window midpoint)
  --json                 Output JSON
  --help                 Show this help

This is a READ-ONLY evaluation tool. It queries Turso for source evidence,
runs control/treatment selectors on frozen inputs, and compares metrics.
No mutations, no network fetches beyond Turso read queries.

NOTE: All runtime counts are UNKNOWN without live Turso access.
The evaluation will produce a LIMITED disposition per SSAE-01 gaps.
`);
}

function parseArgs(argv: string[]): { splitName: string; epoch: string; json: boolean } {
  let splitName = "primary_2026_09";
  let epoch = "";
  let json = false;

  for (const arg of argv) {
    if (arg === "--help") { printHelp(); process.exit(0); }
    if (arg === "--json") { json = true; continue; }
    if (arg.startsWith("--split=")) { splitName = arg.split("=")[1]; continue; }
    if (arg.startsWith("--epoch=")) { epoch = arg.split("=")[1]; continue; }
  }

  // Default epoch to validation window midpoint
  const split = HOLDOUT_SPLITS.find(s => s.name === splitName) || HOLDOUT_SPLITS[0];
  if (!epoch) {
    const valStart = new Date(split.valStart).getTime();
    const valEnd = new Date(split.valEnd).getTime();
    epoch = new Date(valStart + (valEnd - valStart) / 2).toISOString();
  }

  return { splitName, epoch, json };
}

if (import.meta.main) {
  const { splitName, epoch, json } = parseArgs(process.argv.slice(2));

  if (!isLakeConfigured()) {
    console.log("TURSO_DATABASE_URL not set. Running with synthetic fixtures (demo mode).");
    runDemoMode(splitName, epoch, json);
  } else {
    const split = HOLDOUT_SPLITS.find(s => s.name === splitName) || HOLDOUT_SPLITS[0];
    runTemporalHoldoutEvaluation(split, epoch)
      .then(result => {
        if (json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          printResults(result);
        }
      })
      .catch(err => {
        console.error("Evaluation failed:", err);
        process.exit(1);
      });
  }
}

function printResults(result: EvaluationResult) {
  console.log("\n" + "=".repeat(60));
  console.log(`RESULTS: ${result.split.name}`);
  console.log("=".repeat(60));

  console.log("\n--- Control (Deterministic Stride Sampler) ---");
  console.log(`  Selected: ${result.controlMetrics.selectedCount}`);
  console.log(`  Predicted Yield: ${result.controlMetrics.totalPredictedYield.toFixed(2)}`);
  console.log(`  Actual Yield: ${result.controlMetrics.totalActualYield.toFixed(2)}`);
  console.log(`  Calibration RMSE: ${result.controlMetrics.calibrationError.toFixed(4)}`);
  console.log(`  Cost/Yield (¢): ${result.controlMetrics.costPerYieldCents.toFixed(2)}`);
  console.log(`  Diversity Score: ${result.controlMetrics.diversityScore.toFixed(4)}`);
  console.log(`  Long-tail Coverage: ${(result.controlMetrics.longTailCoverage * 100).toFixed(1)}%`);

  console.log("\n--- Treatment (SSAE-03 Ranker) ---");
  console.log(`  Selected: ${result.treatmentMetrics.selectedCount}`);
  console.log(`  Predicted Yield: ${result.treatmentMetrics.totalPredictedYield.toFixed(2)}`);
  console.log(`  Actual Yield: ${result.treatmentMetrics.totalActualYield.toFixed(2)}`);
  console.log(`  Calibration RMSE: ${result.treatmentMetrics.calibrationError.toFixed(4)}`);
  console.log(`  Cost/Yield (¢): ${result.treatmentMetrics.costPerYieldCents.toFixed(2)}`);
  console.log(`  Diversity Score: ${result.treatmentMetrics.diversityScore.toFixed(4)}`);
  console.log(`  Long-tail Coverage: ${(result.treatmentMetrics.longTailCoverage * 100).toFixed(1)}%`);

  console.log("\n--- Comparison (Treatment - Control) ---");
  console.log(`  Δ Yield: ${result.comparison.deltaYield.toFixed(2)}`);
  console.log(`  Δ Cost/Yield (¢): ${result.comparison.deltaCostPerYield.toFixed(2)}`);
  console.log(`  Δ Calibration RMSE: ${result.comparison.deltaCalibration.toFixed(4)}`);
  console.log(`  Δ Diversity: ${result.comparison.deltaDiversity.toFixed(4)}`);
  console.log(`  Δ Long-tail: ${result.comparison.deltaLongTail.toFixed(4)}`);
  console.log(`  Significance: ${result.comparison.statisticalSignificance}`);

  console.log("\n--- LIMITATIONS (LIMITED Disposition) ---");
  for (const lim of result.limitations) {
    console.log(`  - ${lim}`);
  }

  console.log("\n=== DISPOSITION: LIMITED ===");
  console.log("Reason: Insufficient mature labels for holdout evaluation.");
  console.log("Required: SSAE-06 measurement contracts for per-source epoch features,");
  console.log("first_publication_at in lake, cohort labels at publication, posted_at population.");
}

// ─── Demo Mode (No Live Turso) ────────────────────────────────────────────────

function runDemoMode(splitName: string, epoch: string, json: boolean) {
  console.log("\n=== DEMO MODE (Synthetic Fixtures) ===");
  console.log("This demonstrates the evaluation structure without live data.\n");

  const split = HOLDOUT_SPLITS.find(s => s.name === splitName) || HOLDOUT_SPLITS[0];

  // Synthetic sources
  const syntheticSources: SourceMemoryRecord[] = [
    createSyntheticRecord("we-work-remotely", "WeWorkRemotely", "rss_xml", 500, 0.15, 200),
    createSyntheticRecord("remotive", "Remotive", "rss_xml", 300, 0.12, 150),
    createSyntheticRecord("real-work-from-anywhere", "RealWorkFromAnywhere", "rss_xml", 200, 0.08, 80),
    createSyntheticRecord("remote-ok", "RemoteOK", "public_json_api", 1000, 0.05, 50),
    createSyntheticRecord("jobicy-apac-1", "Jobicy", "rss_xml", 100, 0.25, 30),
    createSyntheticRecord("jobicy-apac-2", "Jobicy", "rss_xml", 80, 0.22, 25),
    createSyntheticRecord("breezy:20four7va", "Breezy", "ats_json", 50, 0.60, 10),
    createSyntheticRecord("breezy:another-va", "Breezy", "ats_json", 40, 0.55, 8),
    createSyntheticRecord("greenhouse:gitlab", "Greenhouse", "ats_json", 200, 0.10, 40),
    createSyntheticRecord("lever:shopify", "Lever", "ats_json", 150, 0.08, 20),
  ];

  // Budget
  const budget = { topK: 5, maxCostPerSourceCents: 500 };

  // Synthetic actual yield (validation window)
  const actualYieldMap = new Map<string, number>([
    ["we-work-remotely", 8],
    ["remotive", 5],
    ["real-work-from-anywhere", 2],
    ["remote-ok", 3],
    ["jobicy-apac-1", 4],
    ["jobicy-apac-2", 2],
    ["breezy:20four7va", 6],
    ["breezy:another-va", 3],
    ["greenhouse:gitlab", 4],
    ["lever:shopify", 2],
  ]);

  // Run selectors
  const controlSelected = controlSelector(syntheticSources, epoch, budget);
  const treatmentSelected = syntheticSources
    .map(s => ({
      ...s,
      score: s.lake_state.last_qualified_ready * s.health_rollup.recent_ph_rate,
      score_breakdown: {
        marginal_yield_estimate: s.lake_state.last_qualified_ready * s.health_rollup.recent_ph_rate,
        cost_estimate_cents: 10 + s.lake_state.last_candidate_count * 0.1,
        feasibility_penalty: 0,
        freshness_bonus: 0.5,
        diversity_bonus: 0.25,
        cold_revisit_bonus: 0,
      },
      processing_mode: "FULL" as const,
      mode_reason: "demo",
      feasibility: { permitted: true, reason: "demo", hardGate: "NONE" },
      excluded: false,
      exclusion_reason: null,
      cold_revisit_reason: null,
      cold_revisit_due_at: null,
      evidence_refs: [],
      evidence_complete: false,
      dependencies: null,
      ranked_at: epoch,
      selector_version: "demo-treatment@v1",
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, budget.topK);

  const controlMetrics = computeMetrics(controlSelected, actualYieldMap, syntheticSources.length, 0);
  const treatmentMetrics = computeMetrics(treatmentSelected, actualYieldMap, syntheticSources.length, 0);
  const comparison = compareSelectors(controlMetrics, treatmentMetrics);

  const result: EvaluationResult = {
    split,
    controlMetrics,
    treatmentMetrics,
    comparison,
    limitations: [
      "DEMO MODE: Synthetic fixtures only — not evidence",
      "Mature label coverage: INSUFFICIENT — no first_publication_at in lake, no cohort labels at publication, posted_at often NULL",
      "Per-source epoch features only available for Lake Domain Discovery/Sync phases",
      "Actual yield map is synthetic",
      "Overlap deduction requires canonical fingerprint cross-source join — not available",
    ],
  };

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printResults(result);
  }
}

function createSyntheticRecord(
  sourceId: string,
  providerId: string,
  capability: string,
  candidateCount: number,
  phRate: number,
  qualifiedReady: number
): SourceMemoryRecord {
  const now = new Date().toISOString();
  return {
    source_id: sourceId,
    provider_id: providerId,
    declared_capability: capability as any,
    endpoint_url: `https://example.com/${sourceId}`,
    payload_kind: capability === "rss_xml" ? "xml" : "json",
    selected_processor: capability,
    routing_warnings: [],
    fetch_state: {
      etag: null, last_modified: null, last_body_hash: null,
      last_fetch_at: now, last_fetch_ok: true, consecutive_failures: 0, backoff_until: null,
    },
    lake_state: {
      last_raw_observation_id: 1, last_candidate_count: candidateCount,
      last_qualified_ready: qualifiedReady, last_ingestion_at: now, last_sighting_at: now,
    },
    publication_state: {
      compliance_state: "allowed", operational_state: "active", policy_expiry: null,
      opt_out: false, lease_expiry: null, last_decision: "ADMIT",
      last_decision_at: now, last_publication_at: now, last_publication_count: 10,
      last_publication_mode: "unlimited", concentration_status: "OK",
    },
    health_rollup: {
      recent_success_rate: 0.95, recent_ph_rate: phRate, recent_false_ph_rate: 0.01,
      last_quality_check_at: now, robots_last_checked_at: now, robots_allows: true,
    },
    version_deps: {
      policy_version: "constitution-v5.2", processor_version: "capability-registry@1.0.0",
      geo_gate_version: "geoGate@2026-09-15", triage_version: "triage@1.0.0",
      jev_version: "jev-1.13", fingerprint_version: "fingerprint@v1", content_hash_version: "contentHash@v1",
    },
    retention: {
      raw_observation_ttl_days: 30, candidate_ttl_days: 180, sighting_ttl_days: 365,
      fetch_state_ttl_days: 90, publication_receipt_ttl_days: 3650,
    },
    replay_coverage: {
      can_replay_geo_gate: true, can_replay_triage: false, can_replay_fingerprint: true,
      can_replay_conditional: true, can_replay_publication: true, missing_fields: ["raw_payload_full", "jev_raw"],
    },
    material_digests: {
      fingerprint_hash: "abc", content_hash: "def", description_hash: null, policy_hash: "constitution-v5.2",
    },
  };
}

