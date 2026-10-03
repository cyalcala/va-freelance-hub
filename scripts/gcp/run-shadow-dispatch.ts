/**
 * Google Cloud Run Job Entrypoint for EX-03 Candidate Shadow Dispatch (Unit GCP-01)
 *
 * Invokes the authenticated Cloudflare Pages route /api/cron/shadow-dispatch,
 * parses the diagnostic payload, evaluates error classifications with
 * extractShadowDispatchEvidence, and emits structured Google Cloud Logging JSON.
 *
 * Authority: docs/plans/UNIT_GCP_01_SHADOW_DISPATCH_MIGRATION.md
 */

import { extractShadowDispatchEvidence, type ShadowDispatchEvidence } from "../diagnostics/extract-shadow-dispatch-evidence";

export interface ShadowDispatchConfig {
  apiUrl: string;
  proxySecret: string;
  timeoutMs: number;
}

export interface ShadowDispatchRunResult {
  httpStatus: number;
  evidence: ShadowDispatchEvidence;
  rawBody: string;
  durationMs: number;
}

export function getConfigFromEnv(): ShadowDispatchConfig {
  const proxySecret = process.env.PROXY_SECRET || "";
  const apiUrl = process.env.SHADOW_DISPATCH_API_URL || "https://remotejobs-ph.pages.dev/api/cron/shadow-dispatch";
  const timeoutMs = parseInt(process.env.TIMEOUT_MS || "60000", 10);

  return { apiUrl, proxySecret, timeoutMs };
}

export async function executeShadowDispatch(
  config: ShadowDispatchConfig,
  customFetch: typeof fetch = fetch
): Promise<ShadowDispatchRunResult> {
  if (!config.proxySecret) {
    throw new Error("PROXY_SECRET is required to execute shadow dispatch");
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await customFetch(config.apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.proxySecret}`,
        "Content-Type": "application/json",
        "User-Agent": "va-freelance-hub-gcp-scheduler/1.0",
      },
      signal: controller.signal,
    });

    const durationMs = Date.now() - startTime;
    const rawBody = await response.text();
    const httpStatus = response.status;

    const evidence = extractShadowDispatchEvidence(httpStatus, rawBody);

    return {
      httpStatus,
      evidence,
      rawBody,
      durationMs,
    };
  } finally {
    clearTimeout(timer);
  }
}

export function formatGcpLog(result: ShadowDispatchRunResult): string {
  const isSuccess = result.httpStatus === 200 && result.evidence.outcome === "success_observed";
  const severity = isSuccess ? "INFO" : result.httpStatus >= 500 ? "ERROR" : "WARNING";

  const logPayload = {
    severity,
    message: `Shadow dispatch completed with HTTP ${result.httpStatus}: ${result.evidence.outcome}`,
    execution_time_ms: result.durationMs,
    outcome: result.evidence.outcome,
    total_registry_rows: result.evidence.totalRegistryRows,
    eligible: result.evidence.eligible,
    dispatched: result.evidence.dispatched,
    skipped_ineligible: result.evidence.skippedIneligible,
    skipped_stale_context: result.evidence.skippedStaleContext,
    verdict: result.evidence.verdict,
    error_class: result.evidence.errorClass,
    failure_stage: result.evidence.failureStage,
    error_fingerprint: result.evidence.errorFingerprint,
    next_action: result.evidence.nextAction,
    timestamp: new Date().toISOString(),
  };

  return JSON.stringify(logPayload);
}

// CLI runner if executed directly
if (import.meta.main) {
  try {
    const config = getConfigFromEnv();
    if (!config.proxySecret) {
      console.error(
        JSON.stringify({
          severity: "ERROR",
          message: "Fatal: PROXY_SECRET environment variable is missing",
          timestamp: new Date().toISOString(),
        })
      );
      process.exit(2);
    }

    const result = await executeShadowDispatch(config);
    console.log(formatGcpLog(result));

    if (result.httpStatus !== 200) {
      process.exit(1);
    }
    process.exit(0);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(
      JSON.stringify({
        severity: "ERROR",
        message: `Unhandled exception during shadow dispatch: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      })
    );
    process.exit(1);
  }
}
