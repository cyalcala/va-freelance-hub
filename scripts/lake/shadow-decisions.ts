/**
 * SSAE-05 — Shadow Decisions Without Extra Probes
 *
 * Pure read-only evaluation that runs the SSAE-03 ranker (treatment) and the
 * deterministic family-stratified control selector on the same frozen epoch state,
 * producing advisory shadow decisions for comparison. No additional probes, no
 * network fetches beyond Turso read queries, no production mutations.
 *
 * Depends on: SSAE-03 (source-ranker), SSAE-04 (holdout baseline), SSAE-01 (dataset)
 * Enables: SSAE-06 (measurement contracts), SSAE-10 (allocator)
 *
 * Run: bun run scripts/lake/shadow-decisions.ts --help
 *
 * All runtime counts UNKNOWN unless measured in this session with live Turso access.
 * No network/production mutations. No hold-list edits.
 */

import { getLakeClient, isLakeConfigured } from "./client";
import {
  rankSources,
  buildSourceMemoryRecords,
  DEFAULT_RANKER_CONFIG,
  type RankerInput,
  type SourceMemoryRecord,
  type RankedSource,
  type RankerOutput,
} from "./source-ranker";
import { HOLDOUT_SPLITS, controlSelector } from "./temporal-holdout-eval";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShadowDecisionRecord {
  source_id: string;
  provider_id: string;
  control: {
    selected: boolean;
    rank: number | null;
    score: number;
    mode: string;
    reason: string;
  };
  treatment: {
    selected: boolean;
    rank: number | null;
    score: number;
    mode: string;
    reason: string;
    feasibility: string;
    excluded: boolean;
    exclusion_reason: string | null;
    cold_revisit_reason: string | null;
  };
  agreement: "BOTH_SELECTED" | "CONTROL_ONLY" | "TREATMENT_ONLY" | "NEITHER";
  overlap_score: number; // 0-1 similarity
}

interface ShadowCycleResult {
  epoch_timestamp: string;
  epoch_label: string;
  control: {
    selector_version: string;
    top_k: number;
    selected_count: number;
    selected_ids: string[];
    excluded_count: number;
    cold_revisit_count: number;
    total_feasible: number;
    ranking_latency_ms: number;
  };
  treatment: {
    selector_version: string;
    top_k: number;
    selected_count: number;
    selected_ids: string[];
    excluded_count: number;
    cold_revisit_count: number;
    total_feasible: number;
    ranking_latency_ms: number;
  };
  overlap: {
    selected_overlap_count: number;
    selected_overlap_rate: number; // Jaccard on selected sets
    rank_correlation: number; // Spearman on common sources
    mode_agreement_rate: number;
  };
  decisions: ShadowDecisionRecord[];
  coverage: {
    known_outcome_sources: number;
    unknown_outcome_sources: number;
    censored_sources: number;
    total_sources_evaluated: number;
  };
  limitations: string[];
  disposition: "LIMITED" | "EVALUATED";
}

interface ShadowConfig {
  topK: number;
  maxCostPerSourceCents: number;
  coldRevisitDays: number;
  epochTimestamp: string;
  holdoutSplit?: string;
}

// ─── Core Shadow Evaluation ──────────────────────────────────────────────────

/**
 * Runs a single shadow decision cycle on frozen epoch state.
 * Returns advisory comparison between control and treatment selectors.
 */
export async function runShadowDecisionCycle(
  config: ShadowConfig,
  sources: SourceMemoryRecord[],
  concentration?: { sourceShares: Record<string, number>; familyShares: Record<string, number> }
): Promise<ShadowCycleResult> {
  const startedAt = Date.now();
  const now = new Date(config.epochTimestamp);

  // Compute concentration from current source distribution (same as ranker)
  let sourceShares: Record<string, number>;
  let familyShares: Record<string, number>;

  if (concentration) {
    sourceShares = concentration.sourceShares;
    familyShares = concentration.familyShares;
  } else if (isLakeConfigured()) {
    const client = getLakeClient();
    const candidateRes = await client.execute(`
      SELECT source_id, provider_id, COUNT(*) as cnt
      FROM lake_candidate_jobs
      WHERE status IN ('QUALIFIED_READY', 'SYNCED_TO_D1')
      GROUP BY source_id, provider_id
    `);
    const total = (candidateRes.rows as any[]).reduce((sum, r) => sum + r.cnt, 0);
    sourceShares = {};
    familyShares = {};
    for (const r of candidateRes.rows as any[]) {
      sourceShares[r.source_id] = r.cnt / (total || 1);
      familyShares[r.provider_id] = (familyShares[r.provider_id] || 0) + r.cnt / (total || 1);
    }
  } else {
    // Fallback: uniform concentration from in-memory sources
    const providerCounts: Record<string, number> = {};
    for (const s of sources) {
      providerCounts[s.provider_id] = (providerCounts[s.provider_id] || 0) + 1;
    }
    const totalSources = sources.length;
    sourceShares = {};
    familyShares = {};
    for (const s of sources) {
      sourceShares[s.source_id] = 1 / (totalSources || 1);
      familyShares[s.provider_id] = (providerCounts[s.provider_id] || 0) / (totalSources || 1);
    }
  }

  const rankerConfig = {
    ...DEFAULT_RANKER_CONFIG,
    topK: config.topK,
    maxCostPerSourceCents: config.maxCostPerSourceCents,
    coldRevisitDays: config.coldRevisitDays,
  };

  const input: RankerInput = {
    sources,
    currentConcentration: { sourceShares, familyShares },
    epochTimestamp: config.epochTimestamp,
    config: rankerConfig,
  };

  // Run control selector (deterministic stride sampler)
  const controlStart = Date.now();
  const controlSelected = controlSelector(sources, config.epochTimestamp, {
    topK: config.topK,
    maxCostPerSourceCents: config.maxCostPerSourceCents,
  });
  const controlLatency = Date.now() - controlStart;

  // Run treatment selector (SSAE-03 ranker)
  const treatmentStart = Date.now();
  const treatmentOutput = rankSources(input);
  const treatmentLatency = Date.now() - treatmentStart;

  const treatmentSelected = treatmentOutput.ranked;

   // Use additive helper to compare ranker output to control selector (SSAE-05)
   const allSourceIds = new Set(sources.map(s => s.source_id));
   const controlSelectedIds = new Set(controlSelected.map(s => s.source_id));
   const treatmentSelectedIds = new Set(treatmentOutput.ranked.map(s => s.source_id));
   const {
     decisions,
     overlap: { selectedOverlapCount, selectedOverlapRate, rankCorrelation, modeAgreementRate }
   } = compareSelectorOutputs(
     controlSelected,
     treatmentOutput.ranked,
     treatmentOutput.excluded,
     treatmentOutput.coldRevisit,
     sources
   );

   // Coverage assessment (known vs unknown outcomes)
   // In production, this would check lake_candidate_jobs for qualified_ready counts
   // and source_publication_ledger for actual publication outcomes
   let knownOutcomes = 0;
   let unknownOutcomes = 0;
   let censoredOutcomes = 0;

   // Placeholder: would query actual lake state for publication outcomes
   // For now, mark all as unknown per LIMITED disposition
   unknownOutcomes = allSourceIds.size;

  const limitations = [
    "All outcome coverage UNKNOWN without live Turso access in this session",
    "Mature label coverage: INSUFFICIENT — no first_publication_at in lake, no cohort labels at publication, posted_at often NULL",
    "Per-source epoch features only available for Lake Domain Discovery/Sync phases; Hunter Scrape and Lake Reconcile lack per-source granularity",
    "No network probes performed — feasibility based on stored state only",
    "Concentration computed from lake_candidate_jobs only; D1 publication state not joined",
    "Control selector operates at corpus level (reconcile-discovered-corpus.ts), not per-source epoch level",
    "Treatment ranker uses synthetic cost estimates (no per-stage latency instrumentation)",
    "Right-censored outcomes near data cutoff not distinguished",
  ];

  return {
    epoch_timestamp: config.epochTimestamp,
    epoch_label: config.holdoutSplit ?? "custom",
    control: {
      selector_version: "control-stride@v1",
      top_k: config.topK,
      selected_count: controlSelected.length,
      selected_ids: Array.from(controlSelectedIds),
      excluded_count: 0, // Control doesn't explicitly exclude
      cold_revisit_count: 0,
      total_feasible: sources.length,
      ranking_latency_ms: controlLatency,
    },
    treatment: {
      selector_version: rankerConfig.version,
      top_k: config.topK,
      selected_count: treatmentSelected.length,
      selected_ids: Array.from(treatmentSelectedIds),
      excluded_count: treatmentOutput.excluded.length,
      cold_revisit_count: treatmentOutput.coldRevisit.length,
      total_feasible: treatmentOutput.metadata.feasibleSources,
      ranking_latency_ms: treatmentLatency,
    },
    overlap: {
      selected_overlap_count: selectedOverlapCount,
      selected_overlap_rate: selectedOverlapRate,
      rank_correlation: rankCorrelation,
      mode_agreement_rate: modeAgreementRate,
    },
    decisions,
    coverage: {
      known_outcome_sources: knownOutcomes,
      unknown_outcome_sources: unknownOutcomes,
      censored_sources: censoredOutcomes,
      total_sources_evaluated: allSourceIds.size,
    },
    limitations,
    disposition: knownOutcomes > 0 ? "EVALUATED" : "LIMITED",
  };
}

/**
 * Runs shadow decisions across multiple epochs (e.g., holdout splits).
 */
export async function runMultiEpochShadowDecisions(
  configs: ShadowConfig[],
  sourceSnapshots: Map<string, SourceMemoryRecord[]>
): Promise<ShadowCycleResult[]> {
  const results: ShadowCycleResult[] = [];

   for (const config of configs) {
     const sources = sourceSnapshots.get(config.epochTimestamp) ?? [];
     const result = await runShadowDecisionCycle(config, sources);
     results.push(result);
   }

  return results;
}

/**
 * Generates shadow decision receipt for audit trail.
 */
export function generateShadowReceipt(result: ShadowCycleResult): string {
  const lines: string[] = [
    "=== SSAE-05 Shadow Decision Receipt ===",
    `Epoch: ${result.epoch_label} (${result.epoch_timestamp})`,
    `Disposition: ${result.disposition}`,
    "",
    "--- Control (Deterministic Stride) ---",
    `  Selector: ${result.control.selector_version}`,
    `  Top-K: ${result.control.top_k}`,
    `  Selected: ${result.control.selected_count}`,
    `  Latency: ${result.control.ranking_latency_ms}ms`,
    `  Selected IDs: ${result.control.selected_ids.join(", ") || "(none)"}`,
    "",
    "--- Treatment (SSAE-03 Ranker) ---",
    `  Selector: ${result.treatment.selector_version}`,
    `  Top-K: ${result.treatment.top_k}`,
    `  Selected: ${result.treatment.selected_count}`,
    `  Excluded: ${result.treatment.excluded_count}`,
    `  Cold Revisit: ${result.treatment.cold_revisit_count}`,
    `  Feasible: ${result.treatment.total_feasible}`,
    `  Latency: ${result.treatment.ranking_latency_ms}ms`,
    `  Selected IDs: ${result.treatment.selected_ids.join(", ") || "(none)"}`,
    "",
    "--- Overlap ---",
    `  Selected Overlap: ${result.overlap.selected_overlap_count} (Jaccard: ${(result.overlap.selected_overlap_rate * 100).toFixed(1)}%)`,
    `  Rank Correlation (Spearman): ${result.overlap.rank_correlation.toFixed(4)}`,
    `  Mode Agreement Rate: ${(result.overlap.mode_agreement_rate * 100).toFixed(1)}%`,
    "",
    "--- Coverage ---",
    `  Known Outcomes: ${result.coverage.known_outcome_sources}`,
    `  Unknown Outcomes: ${result.coverage.unknown_outcome_sources}`,
    `  Censored: ${result.coverage.censored_sources}`,
    `  Total Evaluated: ${result.coverage.total_sources_evaluated}`,
    "",
    "--- Limitations ---",
    ...result.limitations.map(l => `  - ${l}`),
    "",
    `=== DISPOSITION: ${result.disposition} ===`,
  ];
  return lines.join("\n");
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
SSAE-05 Shadow Decisions Without Extra Probes

Usage:
  bun run scripts/lake/shadow-decisions.ts [options]

Options:
  --top-k=N                Number of sources to select (default: 50)
  --max-cost=N             Max cost per source in cents (default: 500)
  --cold-revisit-days=N    Days before cold revisit (default: 7)
  --epoch=ISO8601          Selection epoch timestamp (default: now)
  --holdout-split=NAME     Use holdout split epoch (primary_2026_09, extended_2026_08_09)
  --json                   Output JSON
  --help                   Show this help

This is a READ-ONLY evaluation tool. It queries Turso for source evidence,
runs control/treatment selectors on frozen inputs, and compares decisions.
No additional probes, no network fetches beyond Turso reads, no mutations.

NOTE: All runtime counts are UNKNOWN without live Turso access.
The evaluation produces a LIMITED disposition per SSAE-01/04 gaps.
`);
}

function parseArgs(argv: string[]): ShadowConfig & { json: boolean } {
  let topK = DEFAULT_RANKER_CONFIG.topK;
  let maxCostPerSourceCents = DEFAULT_RANKER_CONFIG.maxCostPerSourceCents;
  let coldRevisitDays = DEFAULT_RANKER_CONFIG.coldRevisitDays;
  let epochTimestamp = new Date().toISOString();
  let holdoutSplit: string | undefined;
  let json = false;

  for (const arg of argv) {
    if (arg === "--help") { printHelp(); process.exit(0); }
    if (arg === "--json") { json = true; continue; }
    if (arg.startsWith("--top-k=")) { topK = parseInt(arg.split("=")[1], 10); continue; }
    if (arg.startsWith("--max-cost=")) { maxCostPerSourceCents = parseInt(arg.split("=")[1], 10); continue; }
    if (arg.startsWith("--cold-revisit-days=")) { coldRevisitDays = parseInt(arg.split("=")[1], 10); continue; }
    if (arg.startsWith("--epoch=")) { epochTimestamp = arg.split("=")[1]; continue; }
    if (arg.startsWith("--holdout-split=")) { holdoutSplit = arg.split("=")[1]; continue; }
  }

  // If holdout split specified, use its validation window midpoint as epoch
  if (holdoutSplit) {
    const split = HOLDOUT_SPLITS.find(s => s.name === holdoutSplit);
    if (split) {
      const valStart = new Date(split.valStart).getTime();
      const valEnd = new Date(split.valEnd).getTime();
      epochTimestamp = new Date(valStart + (valEnd - valStart) / 2).toISOString();
    }
  }

  return { topK, maxCostPerSourceCents, coldRevisitDays, epochTimestamp, holdoutSplit, json };
}

if (import.meta.main) {
  const { json, holdoutSplit, ...config } = parseArgs(process.argv.slice(2));

  console.log("=== SSAE-05 Shadow Decisions Without Extra Probes ===");
  console.log(`Config: topK=${config.topK} maxCost=${config.maxCostPerSourceCents}¢ coldRevisit=${config.coldRevisitDays}d epoch=${config.epochTimestamp}`);
  if (holdoutSplit) console.log(`Holdout split: ${holdoutSplit}`);
  console.log("");

  if (!isLakeConfigured()) {
    console.log("TURSO_DATABASE_URL not set. Running demo mode with synthetic fixtures.\n");
    runDemoMode(config, json);
  } else {
    runShadowDecisionCycle(config, await buildSourceMemoryRecords())
      .then(result => {
        if (json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(generateShadowReceipt(result));
        }
      })
      .catch(err => {
        console.error("Shadow decision cycle failed:", err);
        process.exit(1);
      });
  }
}

// ─── Demo Mode ────────────────────────────────────────────────────────────────

function runDemoMode(config: ShadowConfig, json: boolean) {
  console.log("\n=== DEMO MODE (Synthetic Fixtures) ===");
  console.log("This demonstrates the shadow decision structure without live data.\n");

  // Reuse synthetic sources from temporal-holdout-eval
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

  runShadowDecisionCycle(config, syntheticSources)
    .then(result => {
      if (json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(generateShadowReceipt(result));
      }
      console.log("\n=== DEMO COMPLETE ===");
      console.log("All counts synthetic. Disposition: LIMITED (no live Turso).");
    })
    .catch(err => {
      console.error("Demo failed:", err);
      process.exit(1);
    });
}

  // Re-export createSyntheticRecord from temporal-holdout-eval for demo
  export function createSyntheticRecord(
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

  // ─── Additive Helper: Compare Ranker Output to Control Selector ────────────────────────
  /**
   * Small additive pure read-only helper derived from SSAE-03 ranker output + SSAE-04 holdout/control contract.
   * Compares ranker (treatment) vs deterministic control (SSAE-04) on frozen/synthetic state.
   * Returns advisory decisions and overlap metrics without additional probes or network fetches.
   *
   * @param controlSelected - Sources selected by deterministic control selector (SSAE-04)
   * @param treatmentRanked - Sources ranked by SSAE-03 ranker (treatment)
   * @param treatmentExcluded - Sources excluded by SSAE-03 ranker due to feasibility/cost
   * @param treatmentColdRevisit - Sources flagged for cold revisit by SSAE-03 ranker
   * @param allSources - All source memory records for provider_id lookup and universe size
   * @returns Object containing shadow decisions and overlap metrics
   */
  export function compareSelectorOutputs(
    controlSelected: RankedSource[],
    treatmentRanked: RankedSource[],
    treatmentExcluded: RankedSource[],
    treatmentColdRevisit: RankedSource[],
    allSources: SourceMemoryRecord[]
  ): {
    decisions: ShadowDecisionRecord[];
    overlap: {
      selectedOverlapCount: number;
      selectedOverlapRate: number;
      rankCorrelation: number;
      modeAgreementRate: number;
    };
  } {
    // Create lookup maps for details
    const controlMap = new Map(controlSelected.map((s, i) => [s.source_id, { ...s, rank: i + 1 }]));
    const treatmentMap = new Map(
      treatmentRanked.map((s, i) => [s.source_id, { ...s, rank: i + 1 }])
    );
    const treatmentExcludedMap = new Map(
      treatmentExcluded.map(s => [s.source_id, s])
    );
    const treatmentColdMap = new Map(
      treatmentColdRevisit.map(s => [s.source_id, s])
    );

    // Build decision records for all evaluated sources (union of all inputs for robustness)
    const allSourceIds = new Set([
      ...allSources.map(s => s.source_id),
      ...controlSelected.map(s => s.source_id),
      ...treatmentRanked.map(s => s.source_id),
      ...treatmentExcluded.map(s => s.source_id),
      ...treatmentColdRevisit.map(s => s.source_id),
    ]);
    const controlSelectedIds = new Set(controlSelected.map(s => s.source_id));
    const treatmentSelectedIds = new Set(treatmentRanked.map(s => s.source_id));

     const decisions: ShadowDecisionRecord[] = [];

     for (const sourceId of Array.from(allSourceIds)) {
       const c = controlMap.get(sourceId);
       const t = treatmentMap.get(sourceId);
       const te = treatmentExcludedMap.get(sourceId);
       const tc = treatmentColdMap.get(sourceId);

      const controlSelectedFlag = controlSelectedIds.has(sourceId);
      const treatmentSelectedFlag = treatmentSelectedIds.has(sourceId);

      let agreement: ShadowDecisionRecord["agreement"];
      if (controlSelectedFlag && treatmentSelectedFlag) agreement = "BOTH_SELECTED";
      else if (controlSelectedFlag) agreement = "CONTROL_ONLY";
      else if (treatmentSelectedFlag) agreement = "TREATMENT_ONLY";
      else agreement = "NEITHER";

const treatmentRecord = t || te || tc;
      const treatmentMode = treatmentRecord?.processing_mode ?? "N/A";
      const treatmentReason = treatmentRecord?.mode_reason ?? (te ? "excluded" : tc ? "cold_revisit" : "not_ranked");
      const treatmentScore = treatmentRecord?.score ?? 0;
      // Rank is only meaningful for actually ranked sources
      const treatmentRank = t ? t.rank : null;
      const treatmentFeasibility = treatmentRecord?.feasibility.reason ?? "unknown";
      const isTreatmentExcluded = !!te;
      const treatmentExclusionReason = te?.exclusion_reason ?? null;
      const treatmentColdRevisitReason = tc?.cold_revisit_reason ?? treatmentRecord?.cold_revisit_reason ?? null;

      // Overlap score: 1 if both selected and similar rank, else 0 for binary
      const overlapScore = controlSelectedFlag && treatmentSelectedFlag ? 1 : 0;

      decisions.push({
        source_id: sourceId,
        provider_id: allSources.find(s => s.source_id === sourceId)?.provider_id ??
          controlSelected.find(s => s.source_id === sourceId)?.provider_id ??
          treatmentRanked.find(s => s.source_id === sourceId)?.provider_id ??
          treatmentExcluded.find(s => s.source_id === sourceId)?.provider_id ??
          treatmentColdRevisit.find(s => s.source_id === sourceId)?.provider_id ??
          "unknown",
        control: {
          selected: controlSelectedFlag,
          rank: c?.rank ?? null,
          score: c?.score ?? 0,
          mode: c?.processing_mode ?? "N/A",
          reason: c?.mode_reason ?? "not_selected",
        },
        treatment: {
          selected: treatmentSelectedFlag,
          rank: treatmentRank,
          score: treatmentScore,
          mode: treatmentMode,
          reason: treatmentReason,
          feasibility: treatmentFeasibility,
          excluded: isTreatmentExcluded,
          exclusion_reason: treatmentExclusionReason,
          cold_revisit_reason: treatmentColdRevisitReason,
        },
        agreement,
        overlap_score: overlapScore,
      });
    }

     // Compute overlap metrics
     const controlSet = controlSelectedIds;
     const treatmentSet = treatmentSelectedIds;
     const intersectionSet = new Set();
     for (const id of controlSet) {
       if (treatmentSet.has(id)) {
         intersectionSet.add(id);
       }
     }
     const unionSet = new Set();
     for (const id of controlSet) {
       unionSet.add(id);
     }
     for (const id of treatmentSet) {
       unionSet.add(id);
     }
     const selectedOverlapCount = intersectionSet.size;
     const selectedOverlapRate = unionSet.size > 0 ? intersectionSet.size / unionSet.size : 0;

     // Rank correlation (Spearman) on common selected sources
     let rankCorrelation = 0;
     if (intersectionSet.size >= 2) {
       const commonSources = Array.from(intersectionSet);
       const controlRanks = commonSources.map(id => controlMap.get(id)?.rank ?? 0);
       const treatmentRanks = commonSources.map(id => treatmentMap.get(id)?.rank ?? 0);

       // Spearman correlation
       const n = commonSources.length;
       const sumD2 = controlRanks.reduce((sum, cr, i) => {
         const tr = treatmentRanks[i];
         return sum + Math.pow(cr - tr, 2);
       }, 0);
       const denom = n * (n * n - 1);
       rankCorrelation = denom > 0 ? 1 - (6 * sumD2) / denom : 0;
       // Clamp to [-1, 1] for numerical stability
       rankCorrelation = Math.max(-1, Math.min(1, rankCorrelation));
     }

      // Mode agreement rate on commonly selected sources
      let modeAgreementCount = 0;
      for (const id of Array.from(intersectionSet)) {
        const cMode = controlMap.get(id)?.processing_mode;
        const tMode = treatmentMap.get(id)?.processing_mode;
        if (cMode && tMode && cMode === tMode) modeAgreementCount++;
      }
      const modeAgreementRate = intersectionSet.size > 0 ? modeAgreementCount / intersectionSet.size : 0;

    return {
      decisions,
      overlap: {
        selectedOverlapCount,
        selectedOverlapRate,
        rankCorrelation,
        modeAgreementRate,
      }
    };
  }