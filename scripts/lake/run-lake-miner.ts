#!/usr/bin/env bun
/**
 * ==============================================================================
 * Autonomous Worldwide Source Universe & ATS Miner Runner — scripts/lake/run-lake-miner.ts
 * Authority: docs/SOURCE_UNIVERSE_GLOBAL_MINER_MASTER_PROMPT.md
 * Master Operating Constitution v3.0 (Part LXII & Global Miner Overlay)
 * ==============================================================================
 *
 * Chains bounded, polite discovery cycles:
 *  1. Discovered-corpus reconciliation (evaluates stratified unvalidated claims).
 *  2. Live domain ATS discovery (extracts employer domains and probes known ATS templates).
 *  3. Ingests qualified opportunities into lake_candidate_jobs (Turso Data Lake).
 *  4. Safe Dual-Gate publishing remains protected: lake rows stay held in the Lake
 *     reservoir until clearing the Wilson lower bound or verified receipts.
 *  5. Records execution telemetry to lake_runs.
 */

import { getLakeClient } from "./client";
import { reconcileDiscoveredCorpus, type ReconciliationSummary } from "./reconcile-discovered-corpus";
import { runDomainAtsDiscovery, type DiscoveryStats } from "./domain-ats-discovery";

export interface LakeMinerOptions {
  reconcilePerFamily: number;
  domainLimit: number;
  probeDelayMs: number;
  dryRun: boolean;
  skipReconcile: boolean;
  skipDomainDiscovery: boolean;
}

export interface LakeMinerResult {
  ok: boolean;
  skipped?: boolean;
  message?: string;
  durationMs: number;
  reconciliation?: ReconciliationSummary;
  domainDiscovery?: DiscoveryStats;
  aggregate: {
    totalProbed: number;
    totalAdmitted: number;
    totalShadowed: number;
    totalRejected: number;
    totalJobsIngested: number;
  };
}

export interface MinerLogPayload {
  severity: "INFO" | "WARNING" | "ERROR";
  component: "lake-miner";
  event: string;
  reconcilePerFamily?: number;
  domainLimit?: number;
  totalProbed?: number;
  totalAdmitted?: number;
  totalJobsIngested?: number;
  durationMs?: number;
  error?: string;
  timestamp: string;
}

export function formatMinerLog(payload: MinerLogPayload): string {
  return JSON.stringify(payload);
}

export function parseLakeMinerArgs(argv: string[]): LakeMinerOptions {
  const get = (prefix: string) => {
    const hit = argv.find((a) => a.startsWith(prefix));
    return hit ? hit.slice(prefix.length) : undefined;
  };

  const perFamilyArg = get("--reconcile-per-family=");
  const domainLimitArg = get("--domain-limit=");
  const delayArg = get("--delay-ms=");

  return {
    reconcilePerFamily: perFamilyArg ? Math.max(1, parseInt(perFamilyArg, 10)) : 20,
    domainLimit: domainLimitArg ? Math.max(1, parseInt(domainLimitArg, 10)) : 25,
    probeDelayMs: delayArg ? Math.max(500, parseInt(delayArg, 10)) : 1500,
    dryRun: argv.includes("--dry-run"),
    skipReconcile: argv.includes("--skip-reconcile"),
    skipDomainDiscovery: argv.includes("--skip-domain-discovery"),
  };
}

export async function runLakeMiner(
  options: LakeMinerOptions,
  env = process.env,
  deps: {
    reconcileFn?: typeof reconcileDiscoveredCorpus;
    domainDiscoveryFn?: typeof runDomainAtsDiscovery;
    client?: ReturnType<typeof getLakeClient>;
  } = {}
): Promise<LakeMinerResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  const tursoUrl = env.TURSO_DATABASE_URL || "";
  const tursoToken = env.TURSO_AUTH_TOKEN || "";

  // 1. Fail-safe skip when credentials are not configured (e.g. CI without lake secrets)
  if (!tursoUrl || !tursoToken) {
    const msg = "Skipped: TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is not configured.";
    console.warn(
      formatMinerLog({
        severity: "WARNING",
        component: "lake-miner",
        event: "lake_miner_skipped_missing_credentials",
        error: msg,
        timestamp,
      })
    );
    return {
      ok: true,
      skipped: true,
      message: msg,
      durationMs: Date.now() - startTime,
      aggregate: {
        totalProbed: 0,
        totalAdmitted: 0,
        totalShadowed: 0,
        totalRejected: 0,
        totalJobsIngested: 0,
      },
    };
  }

  console.log("=======================================================");
  console.log("   VA FREELANCE HUB — AUTONOMOUS LAKE MINER ENGINE     ");
  console.log("=======================================================");
  console.log(`Reconcile Per-Family:  ${options.skipReconcile ? "SKIPPED" : options.reconcilePerFamily}`);
  console.log(`Domain Limit:          ${options.skipDomainDiscovery ? "SKIPPED" : options.domainLimit}`);
  console.log(`Probe Delay:           ${options.probeDelayMs}ms`);
  console.log(`Dry Run:               ${options.dryRun}`);
  console.log("=======================================================\n");

  let reconciliationSummary: ReconciliationSummary | undefined;
  let domainDiscoveryStats: DiscoveryStats | undefined;

  const reconcile = deps.reconcileFn ?? reconcileDiscoveredCorpus;
  const domainDiscovery = deps.domainDiscoveryFn ?? runDomainAtsDiscovery;

  try {
    // 2. Step 1: Stratified Discovered Corpus Reconciliation
    if (!options.skipReconcile) {
      console.log("\n--- Phase 1: Stratified Discovered Corpus Reconciliation ---");
      reconciliationSummary = await reconcile({
        perFamily: options.reconcilePerFamily,
        dryRun: options.dryRun,
        probeDelayMs: options.probeDelayMs,
      });
    }

    // 3. Step 2: Live Domain ATS Discovery
    if (!options.skipDomainDiscovery) {
      console.log("\n--- Phase 2: Live Domain ATS Discovery ---");
      domainDiscoveryStats = await domainDiscovery({
        domainLimit: options.domainLimit,
        dryRun: options.dryRun,
        probeDelayMs: options.probeDelayMs,
      });
    }

    // 4. Compute aggregate metrics
    const totalProbed =
      (reconciliationSummary?.domainsScanned ?? 0) + (domainDiscoveryStats?.domainsScanned ?? 0);
    const totalAdmitted =
      (reconciliationSummary?.admitted ?? 0) + (domainDiscoveryStats?.admitted ?? 0);
    const totalShadowed =
      (reconciliationSummary?.shadowed ?? 0) + (domainDiscoveryStats?.shadowed ?? 0);
    const totalRejected =
      (reconciliationSummary?.rejected ?? 0) + (domainDiscoveryStats?.rejected ?? 0);
    const totalJobsIngested =
      (reconciliationSummary?.jobsIngested ?? 0) + (domainDiscoveryStats?.jobsIngested ?? 0);

    const durationMs = Date.now() - startTime;

    const result: LakeMinerResult = {
      ok: true,
      durationMs,
      reconciliation: reconciliationSummary,
      domainDiscovery: domainDiscoveryStats,
      aggregate: {
        totalProbed,
        totalAdmitted,
        totalShadowed,
        totalRejected,
        totalJobsIngested,
      },
    };

    console.log("\n=======================================================");
    console.log("          LAKE MINER AGGREGATE EXECUTION RUN           ");
    console.log("=======================================================");
    console.log(`Total Probed:          ${totalProbed}`);
    console.log(`Total Admitted:        ${totalAdmitted}`);
    console.log(`Total Shadowed:        ${totalShadowed}`);
    console.log(`Total Rejected:        ${totalRejected}`);
    console.log(`Total Jobs Ingested:   ${totalJobsIngested}`);
    console.log(`Duration:              ${(durationMs / 1000).toFixed(1)}s`);
    console.log("=======================================================\n");

    // 5. Persist aggregate run evidence into lake_runs
    if (!options.dryRun) {
      try {
        const client = deps.client ?? getLakeClient();
        await client.execute({
          sql: `INSERT INTO lake_runs (script, status, stats_json) VALUES (?, ?, ?);`,
          args: [
            "run-lake-miner",
            "completed",
            JSON.stringify({
              timestamp: new Date().toISOString(),
              durationMs,
              aggregate: result.aggregate,
              reconciliation: reconciliationSummary,
              domainDiscovery: domainDiscoveryStats,
            }),
          ],
        });
      } catch (ledgerErr: any) {
        console.warn(`[lake-miner] Ledger write skipped: ${ledgerErr?.message ?? ledgerErr}`);
      }
    }

    console.log(
      formatMinerLog({
        severity: "INFO",
        component: "lake-miner",
        event: "lake_miner_cycle_completed",
        reconcilePerFamily: options.reconcilePerFamily,
        domainLimit: options.domainLimit,
        totalProbed,
        totalAdmitted,
        totalJobsIngested,
        durationMs,
        timestamp: new Date().toISOString(),
      })
    );

    return result;
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    const errorMsg = err?.message || String(err);
    console.error(`[lake-miner] Fatal error during mining cycle:`, errorMsg);

    console.error(
      formatMinerLog({
        severity: "ERROR",
        component: "lake-miner",
        event: "lake_miner_cycle_failed",
        error: errorMsg,
        durationMs,
        timestamp: new Date().toISOString(),
      })
    );

    // Persist failure evidence into lake_runs so failed cycles are durably
    // visible (MATH-12); best-effort only — a ledger failure must never mask
    // the original error. Preserves partial phase results completed before
    // the failure instead of discarding them.
    if (!options.dryRun) {
      try {
        const client = deps.client ?? getLakeClient();
        await client.execute({
          sql: `INSERT INTO lake_runs (script, status, stats_json) VALUES (?, ?, ?);`,
          args: [
            "run-lake-miner",
            "failed",
            JSON.stringify({
              timestamp: new Date().toISOString(),
              durationMs,
              error: errorMsg,
              aggregate: {
                totalProbed:
                  (reconciliationSummary?.domainsScanned ?? 0) +
                  (domainDiscoveryStats?.domainsScanned ?? 0),
                totalAdmitted:
                  (reconciliationSummary?.admitted ?? 0) + (domainDiscoveryStats?.admitted ?? 0),
                totalShadowed:
                  (reconciliationSummary?.shadowed ?? 0) + (domainDiscoveryStats?.shadowed ?? 0),
                totalRejected:
                  (reconciliationSummary?.rejected ?? 0) + (domainDiscoveryStats?.rejected ?? 0),
                totalJobsIngested:
                  (reconciliationSummary?.jobsIngested ?? 0) +
                  (domainDiscoveryStats?.jobsIngested ?? 0),
              },
              reconciliation: reconciliationSummary,
              domainDiscovery: domainDiscoveryStats,
            }),
          ],
        });
      } catch (ledgerErr: any) {
        console.warn(`[lake-miner] Failure ledger write skipped: ${ledgerErr?.message ?? ledgerErr}`);
      }
    }

    return {
      ok: false,
      message: errorMsg,
      durationMs,
      reconciliation: reconciliationSummary,
      domainDiscovery: domainDiscoveryStats,
      aggregate: {
        totalProbed:
          (reconciliationSummary?.domainsScanned ?? 0) +
          (domainDiscoveryStats?.domainsScanned ?? 0),
        totalAdmitted:
          (reconciliationSummary?.admitted ?? 0) + (domainDiscoveryStats?.admitted ?? 0),
        totalShadowed:
          (reconciliationSummary?.shadowed ?? 0) + (domainDiscoveryStats?.shadowed ?? 0),
        totalRejected:
          (reconciliationSummary?.rejected ?? 0) + (domainDiscoveryStats?.rejected ?? 0),
        totalJobsIngested:
          (reconciliationSummary?.jobsIngested ?? 0) + (domainDiscoveryStats?.jobsIngested ?? 0),
      },
    };
  }
}

if (import.meta.main) {
  const options = parseLakeMinerArgs(process.argv.slice(2));
  runLakeMiner(options).then((res) => {
    if (!res.ok) {
      process.exit(1);
    }
  });
}
