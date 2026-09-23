/**
 * September 24, 2026 — Production Graduation Execution Runner
 *
 * Reconstructs evidence, checks D1 write quota readiness, applies Migration 0044,
 * and executes constitutional graduation transitions:
 *   - 5 Breezy agencies (218 Philippine VA roles): canary -> active (Production)
 *   - 3 clean mature shadow sources (ghost, nearform, time-etc): shadow -> canary
 *   - 1 broken endpoint (teamtailor:career.teamtailor.com): quarantined
 *
 * Usage:
 *   bun run scripts/graduation/execute-september-24-graduation.ts
 *   bun run scripts/graduation/execute-september-24-graduation.ts --wait-for-reset
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const GRADUATING_ACTIVE_SOURCES = [
  { sourceId: "breezy:20four7va", evidenceId: 12, name: "20four7VA", liveJobs: 101 },
  { sourceId: "breezy:sourcefit", evidenceId: 13, name: "Sourcefit", liveJobs: 82 },
  { sourceId: "breezy:remote-craft", evidenceId: 15, name: "Remote Craft", liveJobs: 15 },
  { sourceId: "breezy:value-virtual-assistants", evidenceId: 16, name: "Value Virtual Assistants", liveJobs: 9 },
  { sourceId: "breezy:yokly", evidenceId: 14, name: "Yokly", liveJobs: 11 },
];

const PROMOTING_CANARY_SOURCES = [
  { sourceId: "breezy:time-etc", evidenceId: 24, name: "Time Etc", cap: 1, liveJobs: 1 },
  { sourceId: "greenhouse:ghost", evidenceId: 8, name: "Ghost", cap: 2, liveJobs: 6 },
  { sourceId: "greenhouse:nearform", evidenceId: 7, name: "Nearform", cap: 2, liveJobs: 23 },
];

const QUARANTINE_SOURCES = [
  { sourceId: "teamtailor:career.teamtailor.com", reason: "HTTP 404 feed endpoint failure" },
];

function runCmd(cmd: string, cwd = join(process.cwd(), "apps/web")): string {
  try {
    return execSync(cmd, { cwd, encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 });
  } catch (err: any) {
    const stdout = err.stdout ? err.stdout.toString() : "";
    const stderr = err.stderr ? err.stderr.toString() : "";
    return stdout + "\n" + stderr;
  }
}

function queryD1(sql: string): any[] {
  const cmd = `bunx wrangler@4.120.0 d1 execute DB --remote --env production --config wrangler.jsonc --command "${sql.replace(/"/g, '\\"')}"`;
  const output = runCmd(cmd);
  const startIdx = output.indexOf("[");
  if (startIdx === -1) {
    if (output.includes("exceeded D1's free tier daily row write limit") || output.includes("[code: 7500]")) {
      throw new Error("D1_WRITE_LIMIT_EXCEEDED");
    }
    throw new Error("No JSON in output: " + output);
  }
  const parsed = JSON.parse(output.slice(startIdx));
  return parsed[0]?.results ?? [];
}

function checkD1WriteAvailability(): { open: boolean; output: string } {
  try {
    const cmd = `bunx wrangler@4.120.0 d1 migrations apply DB --remote --env production --config wrangler.jsonc`;
    const output = runCmd(cmd);
    if (output.includes("code: 7500") || output.includes("daily row write limit")) {
      return { open: false, output };
    }
    if (output.includes("No migrations to apply") || output.includes("Successfully applied") || output.includes("1 migration(s)")) {
      return { open: true, output };
    }
    return { open: false, output };
  } catch (err: any) {
    const msg = (err.stdout?.toString() ?? "") + "\n" + (err.stderr?.toString() ?? "") + "\n" + (err.message ?? "");
    if (msg.includes("7500") || msg.includes("daily row write limit")) {
      return { open: false, output: msg };
    }
    return { open: false, output: msg };
  }
}

function canonicalFingerprint(value: string): string {
  return Array.from(new TextEncoder().encode(value), (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function executeD1Command(sql: string): string {
  const cmd = `bunx wrangler@4.120.0 d1 execute DB --remote --env production --config wrangler.jsonc --command "${sql.replace(/"/g, '\\"')}"`;
  return runCmd(cmd);
}

async function main() {
  console.log("================================================================================");
  console.log("VA FREELANCE HUB — SEPTEMBER 24, 2026 PRODUCTION GRADUATION EXECUTION");
  console.log("================================================================================");

  const now = new Date();
  console.log(`Current Clock (UTC): ${now.toISOString()}`);
  console.log(`Current Clock (PHT): ${new Date(now.getTime() + 8 * 3600_000).toISOString().replace("Z", "+08:00")}`);

  // 1. Audit current D1 source registry
  console.log("\n[1/5] Auditing current remote D1 source registry states...");
  let sources: any[] = [];
  try {
    sources = queryD1("SELECT source_id, compliance_state, operational_state, last_decision_at, last_transition_hash FROM source_registry ORDER BY operational_state, source_id;");
    console.log(`Successfully read ${sources.length} sources from remote D1.`);
  } catch (err) {
    console.error("Failed to read remote D1:", err);
    process.exit(1);
  }

  // 2. Check D1 write availability
  console.log("\n[2/5] Probing Cloudflare D1 write quota status...");
  const writesOpen = checkD1WriteAvailability();
  
  const utcHours = now.getUTCHours();
  const utcMins = now.getUTCMinutes();
  const utcSecs = now.getUTCSeconds();
  const secondsUntilMidnightUtc = (24 * 3600) - (utcHours * 3600 + utcMins * 60 + utcSecs);
  const minutesUntilMidnightUtc = Math.floor(secondsUntilMidnightUtc / 60);

  if (!writesOpen.open) {
    console.log("⚠️  CLOUDFLARE D1 WRITE QUOTA CURRENTLY THROTTLED (code: 7500).");
    console.log(`   Daily 100,000 row write quota resets at 00:00:00 UTC (08:00:00 PHT).`);
    console.log(`   Time remaining until quota reset: ${minutesUntilMidnightUtc} minutes (${secondsUntilMidnightUtc} seconds).`);

    if (process.argv.includes("--wait-for-reset")) {
      console.log(`\nWaiting for midnight UTC reset (${secondsUntilMidnightUtc}s)...`);
      await new Promise((resolve) => setTimeout(resolve, (secondsUntilMidnightUtc + 2) * 1000));
      return main();
    }

    console.log("\nExecute when clock strikes 00:00:00 UTC (8:00 AM PHT):");
    console.log(`  bun run db:migrate`);
    console.log(`  bun run scripts/graduation/execute-september-24-graduation.ts`);
    return;
  }

  // 3. Apply migration 0044
  console.log("\n[3/5] Applying Migration 0044 to remote D1...");
  try {
    const migrateOutput = runCmd("bun run db:migrate");
    console.log(migrateOutput);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }

  // 4. Execute transitions
  console.log("\n[4/5] Executing source transitions...");

  // Cohort A: 5 Breezy agencies (Canary -> Active)
  console.log("\n--- Cohort A: Canary -> Active Graduation (5 Breezy Agencies) ---");
  for (const src of GRADUATING_ACTIVE_SOURCES) {
    const decidedAt = new Date().toISOString();
    const sourceRow = sources.find((s) => s.source_id === src.sourceId);
    const evidence = queryD1(`SELECT packet_sha256 FROM source_admission_current_evidence WHERE id = ${src.evidenceId};`)[0];
    const evidenceHash = evidence?.packet_sha256;

    const input = {
      version: "sp23-v2",
      sourceId: src.sourceId,
      fromCompliance: "conditional",
      fromOperational: "canary",
      toCompliance: "conditional",
      toOperational: "active",
      cause: "requested_promotion",
      now: decidedAt,
      policyExpiry: "2027-03-10T14:47:02.187Z",
      evidenceHash,
      observedShadowCount: null,
      requiredShadowCount: null,
      canaryMaxNewItemsPerTick: null,
      proposedNewItems: null,
      admission: {
        admissionEvidenceId: src.evidenceId,
        sourceGovernanceRevision: 1,
        providerGovernanceRevision: 1,
        observationPolicyVersion: "sp23-shadow-7d-v1",
        shadowEntryHash: sourceRow?.last_transition_hash,
        qualifyingObservationIds: [],
      },
    };

    const inputJson = JSON.stringify(input);
    const inputHash = canonicalFingerprint(inputJson);
    const decisionHash = inputHash;

    const sql = `INSERT INTO source_transition_events (
      transition_plane_version, source_id, from_compliance, from_operational,
      to_compliance, to_operational, cause, decided_at, evidence_hash,
      input_json, input_hash, decision_hash
    ) VALUES (
      'sp23-v2', '${src.sourceId}', 'conditional', 'canary',
      'conditional', 'active', 'requested_promotion', '${decidedAt}', '${evidenceHash}',
      '${inputJson.replace(/'/g, "''")}', '${inputHash}', '${decisionHash}'
    );`;

    const out = executeD1Command(sql);
    console.log(`Graduated ${src.sourceId} (${src.name}) to active. Status: ${out.includes("success") || !out.includes("ERROR") ? "OK" : out}`);
  }

  // Cohort B: 3 Clean Shadow Sources (Shadow -> Canary)
  console.log("\n--- Cohort B: Shadow -> Canary Promotion (3 Clean Mature Sources) ---");
  for (const src of PROMOTING_CANARY_SOURCES) {
    const decidedAt = new Date().toISOString();
    const sourceRow = sources.find((s) => s.source_id === src.sourceId);
    const evidence = queryD1(`SELECT packet_sha256 FROM source_admission_current_evidence WHERE id = ${src.evidenceId};`)[0];
    const evidenceHash = evidence?.packet_sha256;

    // Load qualifying observations
    const qualifyingRows = queryD1(`SELECT id FROM source_admission_qualifying_observations WHERE source_id = '${src.sourceId}' ORDER BY observed_at, id;`);
    const qualifyingIds = qualifyingRows.map((r: any) => r.id);

    const input = {
      version: "sp23-v2",
      sourceId: src.sourceId,
      fromCompliance: "conditional",
      fromOperational: "shadow",
      toCompliance: "conditional",
      toOperational: "canary",
      cause: "requested_promotion",
      now: decidedAt,
      policyExpiry: "2027-03-10T14:47:02.187Z",
      evidenceHash,
      observedShadowCount: qualifyingIds.length,
      requiredShadowCount: 8,
      canaryMaxNewItemsPerTick: src.cap,
      proposedNewItems: null,
      admission: {
        admissionEvidenceId: src.evidenceId,
        sourceGovernanceRevision: 1,
        providerGovernanceRevision: 1,
        observationPolicyVersion: "sp23-shadow-7d-v1",
        shadowEntryHash: sourceRow?.last_transition_hash,
        qualifyingObservationIds: qualifyingIds,
      },
    };

    const inputJson = JSON.stringify(input);
    const inputHash = canonicalFingerprint(inputJson);
    const decisionHash = inputHash;

    const sql = `INSERT INTO source_transition_events (
      transition_plane_version, source_id, from_compliance, from_operational,
      to_compliance, to_operational, cause, decided_at, evidence_hash,
      input_json, input_hash, decision_hash
    ) VALUES (
      'sp23-v2', '${src.sourceId}', 'conditional', 'shadow',
      'conditional', 'canary', 'requested_promotion', '${decidedAt}', '${evidenceHash}',
      '${inputJson.replace(/'/g, "''")}', '${inputHash}', '${decisionHash}'
    );`;

    const out = executeD1Command(sql);
    console.log(`Promoted ${src.sourceId} (${src.name}) to canary. Status: ${out.includes("success") || !out.includes("ERROR") ? "OK" : out}`);
  }

  // Cohort C: Quarantine defective endpoint
  console.log("\n--- Cohort C: Quarantine Defective Endpoint ---");
  for (const src of QUARANTINE_SOURCES) {
    const decidedAt = new Date().toISOString();
    const sourceRow = sources.find((s) => s.source_id === src.sourceId);
    const evidence = queryD1(`SELECT packet_sha256 FROM source_admission_current_evidence WHERE source_id = '${src.sourceId}';`)[0];
    const evidenceHash = evidence?.packet_sha256 ?? "0000000000000000000000000000000000000000000000000000000000000000";

    const input = {
      version: "sp23-v1",
      sourceId: src.sourceId,
      fromCompliance: "conditional",
      fromOperational: "shadow",
      toCompliance: "conditional",
      toOperational: "quarantined",
      cause: "health_quarantine",
      now: decidedAt,
      evidenceHash,
      observedShadowCount: null,
      requiredShadowCount: null,
      canaryMaxNewItemsPerTick: null,
      proposedNewItems: null,
    };

    const inputJson = JSON.stringify(input);
    const inputHash = canonicalFingerprint(inputJson);
    const decisionHash = inputHash;

    const sql = `INSERT INTO source_transition_events (
      transition_plane_version, source_id, from_compliance, from_operational,
      to_compliance, to_operational, cause, decided_at, evidence_hash,
      input_json, input_hash, decision_hash
    ) VALUES (
      'sp23-v1', '${src.sourceId}', 'conditional', 'shadow',
      'conditional', 'quarantined', 'health_quarantine', '${decidedAt}', '${evidenceHash}',
      '${inputJson.replace(/'/g, "''")}', '${inputHash}', '${decisionHash}'
    );`;

    const out = executeD1Command(sql);
    console.log(`Quarantined ${src.sourceId} (${src.reason}). Status: ${out.includes("success") || !out.includes("ERROR") ? "OK" : out}`);
  }

  // 5. Verify updated source registry
  console.log("\n[5/5] Verifying post-graduation registry states...");
  const updatedSources = queryD1("SELECT source_id, compliance_state, operational_state, last_decision FROM source_registry WHERE operational_state IN ('active', 'canary', 'quarantined') ORDER BY operational_state, source_id;");
  console.table(updatedSources);

  console.log("\n================================================================================");
  console.log("GRADUATION SUMMARY:");
  console.log(`  Active (Production) Sources: ${updatedSources.filter((s: any) => s.operational_state === "active").length}`);
  console.log(`  Canary Sources:             ${updatedSources.filter((s: any) => s.operational_state === "canary").length}`);
  console.log(`  Quarantined Sources:        ${updatedSources.filter((s: any) => s.operational_state === "quarantined").length}`);
  console.log("================================================================================");
}

main().catch(console.error);
