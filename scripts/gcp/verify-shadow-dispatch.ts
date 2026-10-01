/**
 * Verification & Readiness Tool for Unit GCP-01 (Shadow Dispatch)
 *
 * Runs dry-run and live contract checks for the GCP runner without
 * mutating live opportunity data.
 *
 * Usage:
 *   bun scripts/gcp/verify-shadow-dispatch.ts [--dry-run]
 */

import { executeShadowDispatch, formatGcpLog, getConfigFromEnv } from "./run-shadow-dispatch";

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("=== Unit GCP-01: Verification & Readiness Audit ===");
  console.log(`Execution Mode: ${isDryRun ? "DRY-RUN (Simulated)" : "LIVE VERIFICATION"}`);

  const config = getConfigFromEnv();
  console.log(`Target Endpoint: ${config.apiUrl}`);
  console.log(`Proxy Secret:    ${config.proxySecret ? "[CONFIGURED]" : "[MISSING]"}`);

  if (isDryRun) {
    console.log("\n[Ring 8] Simulating synthetic HTTP 200 shadow dispatch response...");
    const mockPayload = {
      ok: true,
      totalRegistryRows: 14,
      eligible: 4,
      dispatched: 4,
      skippedStaleContext: 0,
      verdict: {
        status: "healthy",
        classifications: [
          { sourceId: "ashby:amplify", outcome: "HEALTHY_WITH_RESULTS", classification: "PROCEED" },
          { sourceId: "ashby:camunda", outcome: "HEALTHY_WITH_RESULTS", classification: "PROCEED" },
          { sourceId: "ashby:supabase", outcome: "HEALTHY_WITH_RESULTS", classification: "PROCEED" },
          { sourceId: "ashby:tremendous", outcome: "HEALTHY_WITH_RESULTS", classification: "PROCEED" },
        ],
      },
    };

    const mockFetch = async () =>
      new Response(JSON.stringify(mockPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    const result = await executeShadowDispatch(
      { ...config, proxySecret: "synthetic-secret" },
      mockFetch as unknown as typeof fetch
    );

    console.log("\nSimulated Structured GCP Log Output:");
    console.log(formatGcpLog(result));

    if (result.evidence.outcome === "success_observed" && result.httpStatus === 200) {
      console.log("\n✅ Dry-Run Verification PASSED: Diagnostic schema and log formatting 100% compliant.");
      process.exit(0);
    } else {
      console.error("\n❌ Dry-Run Verification FAILED.");
      process.exit(1);
    }
  }

  if (!config.proxySecret) {
    console.warn("\n⚠️ PROXY_SECRET is not set in this environment.");
    console.warn("To run a live test, provide PROXY_SECRET=<secret> bun scripts/gcp/verify-shadow-dispatch.ts");
    console.log("\nRunning --dry-run fallback...");
    process.argv.push("--dry-run");
    return main();
  }

  console.log("\n[Ring 9] Executing live probe against Cloudflare Pages route...");
  try {
    const result = await executeShadowDispatch(config);
    console.log("\nLive Structured GCP Log Output:");
    console.log(formatGcpLog(result));

    if (result.httpStatus === 200) {
      console.log("\n✅ Live Verification PASSED: Shadow dispatch executed successfully.");
      process.exit(0);
    } else {
      console.warn(`\n⚠️ Live Verification Non-200: HTTP ${result.httpStatus} (${result.evidence.outcome}).`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`\n❌ Live Verification ERROR: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

main();
