#!/usr/bin/env bun
/**
 * ==============================================================================
 * VA Freelance Hub — Cloud Run Job Lake Miner Runner
 * Authority: docs/SOURCE_UNIVERSE_GLOBAL_MINER_MASTER_PROMPT.md
 * Master Operating Constitution v3.0 (Part LXII & Global Miner Overlay)
 * ==============================================================================
 */

import { runLakeMiner, type LakeMinerOptions, type LakeMinerResult } from "../lake/run-lake-miner";

export interface GcpMinerLogPayload {
  severity: "INFO" | "WARNING" | "ERROR";
  component: "lake-miner";
  unit: "GCP-MINER";
  event: string;
  totalProbed?: number;
  totalAdmitted?: number;
  totalJobsIngested?: number;
  durationMs?: number;
  error?: string;
  timestamp: string;
}

export function formatGcpMinerLog(payload: GcpMinerLogPayload): string {
  return JSON.stringify(payload);
}

export async function runGcpLakeMiner(
  env = process.env,
  deps: {
    minerFn?: typeof runLakeMiner;
  } = {}
): Promise<{ ok: boolean; message: string; aggregate?: LakeMinerResult["aggregate"] }> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  const tursoUrl = env.TURSO_DATABASE_URL || "";
  const tursoToken = env.TURSO_AUTH_TOKEN || "";

  // 1. Missing credentials check (fail-safe skip)
  if (!tursoUrl || !tursoToken) {
    const msg = "Skipped: TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is not configured.";
    console.warn(
      formatGcpMinerLog({
        severity: "WARNING",
        component: "lake-miner",
        unit: "GCP-MINER",
        event: "lake_miner_skipped_missing_credentials",
        error: msg,
        timestamp,
      })
    );
    return { ok: true, message: msg };
  }

  const options: LakeMinerOptions = {
    reconcilePerFamily: env.RECONCILE_PER_FAMILY ? parseInt(env.RECONCILE_PER_FAMILY, 10) : 20,
    domainLimit: env.DOMAIN_LIMIT ? parseInt(env.DOMAIN_LIMIT, 10) : 25,
    probeDelayMs: env.PROBE_DELAY_MS ? parseInt(env.PROBE_DELAY_MS, 10) : 1500,
    dryRun: env.DRY_RUN === "true",
    skipReconcile: env.SKIP_RECONCILE === "true",
    skipDomainDiscovery: env.SKIP_DOMAIN_DISCOVERY === "true",
  };

  try {
    console.log(`[lake-miner] Starting GCP Cloud Run Lake Miner execution...`);
    const miner = deps.minerFn ?? runLakeMiner;
    const result = await miner(options, env);

    const durationMs = Date.now() - startTime;

    if (!result.ok) {
      const msg = result.message || "Unknown error during mining cycle";
      console.error(
        formatGcpMinerLog({
          severity: "ERROR",
          component: "lake-miner",
          unit: "GCP-MINER",
          event: "lake_miner_failed",
          error: msg,
          durationMs,
          timestamp: new Date().toISOString(),
        })
      );
      return { ok: false, message: msg };
    }

    console.log(
      formatGcpMinerLog({
        severity: "INFO",
        component: "lake-miner",
        unit: "GCP-MINER",
        event: "lake_miner_succeeded",
        totalProbed: result.aggregate.totalProbed,
        totalAdmitted: result.aggregate.totalAdmitted,
        totalJobsIngested: result.aggregate.totalJobsIngested,
        durationMs,
        timestamp: new Date().toISOString(),
      })
    );

    return {
      ok: true,
      message: `Successfully completed lake miner cycle in ${(durationMs / 1000).toFixed(1)}s`,
      aggregate: result.aggregate,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    const msg = err?.message || String(err);
    console.error(
      formatGcpMinerLog({
        severity: "ERROR",
        component: "lake-miner",
        unit: "GCP-MINER",
        event: "lake_miner_exception",
        error: msg,
        durationMs,
        timestamp: new Date().toISOString(),
      })
    );
    return { ok: false, message: msg };
  }
}

if (import.meta.main) {
  runGcpLakeMiner().then((res) => {
    if (!res.ok) {
      process.exit(1);
    }
  });
}
