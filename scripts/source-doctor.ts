#!/usr/bin/env bun
/**
 * Source Doctor V1 — CLI entry point.
 *
 * Usage:
 *   bun scripts/source-doctor.ts --source <source-id> [--json]
 *
 * Options:
 *   --source <id>     Source ID to diagnose (required)
 *   --json            Output raw JSON (default: pretty)
 *   --commit <sha>    Override commit SHA for output
 *   --help            Show this help
 *
 * Outputs machine-readable JSON with exactly one terminal outcome:
 *   HEALTHY_WITH_RESULTS | HEALTHY_EMPTY | DEGRADED_ANOMALOUS |
 *   SCHEMA_BROKEN | RATE_LIMITED | UNREACHABLE | POLICY_BLOCKED |
 *   INTERNAL_PIPELINE_FAILURE | UNKNOWN
 *
 * Safety guarantees:
 *   - Zero D1 writes
 *   - Zero AI calls
 *   - Bounded requests (robots + one fetch max)
 *   - Read-only diagnostics only
 */

import { runSourceDoctor, type SourceDoctorResult } from "../packages/scraper/source-doctor";

function printHelp() {
  console.log(`
Source Doctor V1 — compliance-first source diagnostics

Usage:
  bun scripts/source-doctor.ts --source <source-id> [--json]

Options:
  --source <id>     Source ID to diagnose (required)
  --json            Output compact JSON (default: pretty)
  --commit <sha>    Override commit SHA for output
  --help            Show this help

Examples:
  bun scripts/source-doctor.ts --source we-work-remotely
  bun scripts/source-doctor.ts --source remotive --json
  bun scripts/source-doctor.ts --source jobicy-admin-support-apac --commit abc123

Safety:
  - Zero D1 writes
  - Zero AI calls
  - Bounded network requests
  - Read-only diagnostics only
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const sourceIndex = args.indexOf("--source");
  if (sourceIndex === -1 || sourceIndex + 1 >= args.length) {
    console.error("Error: --source <id> is required");
    printHelp();
    process.exit(1);
  }

  const sourceId = args[sourceIndex + 1];
  const jsonFlag = args.includes("--json");

  const commitIndex = args.indexOf("--commit");
  const commit = commitIndex !== -1 && commitIndex + 1 < args.length
    ? args[commitIndex + 1]
    : undefined;

  try {
    const result = await runSourceDoctor(sourceId, { commit, json: jsonFlag });

    if (jsonFlag) {
      console.log(JSON.stringify(result));
    } else {
      console.log(JSON.stringify(result, null, 2));
    }

    // Exit code reflects outcome severity
    const outcome = result.diagnostic.outcome;
    const healthyOutcomes = ["HEALTHY_WITH_RESULTS", "HEALTHY_EMPTY"];
    process.exit(healthyOutcomes.includes(outcome) ? 0 : 1);
  } catch (error) {
    console.error("Source Doctor error:", error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
}

main();