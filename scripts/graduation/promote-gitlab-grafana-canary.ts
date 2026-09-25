#!/usr/bin/env bun
/**
 * Constitutional Shadow -> Canary Promotion for Proven Mature Sources:
 *   - greenhouse:gitlab (cap: 2)
 *   - greenhouse:grafanalabs (cap: 2)
 *
 * Evaluates requirements against remote production D1, produces canonical
 * transition events via decideTypedTransition, executes atomic insertion into
 * source_transition_events, and verifies source_registry state transition.
 */

import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { decideTypedTransition } from "../../packages/scraper/transition-plane";

interface SourceToPromote {
  sourceId: string;
  cap: number;
}

const SOURCES: SourceToPromote[] = [
  { sourceId: "greenhouse:gitlab", cap: 2 },
  { sourceId: "greenhouse:grafanalabs", cap: 2 },
];

function runCmd(cmd: string, cwd = process.cwd()): string {
  try {
    return execSync(cmd, { cwd, encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 });
  } catch (err: any) {
    const stdout = err.stdout ? err.stdout.toString() : "";
    const stderr = err.stderr ? err.stderr.toString() : "";
    throw new Error(`Command failed: ${cmd}\n${stdout}\n${stderr}\n${err.message}`);
  }
}

function queryD1(sql: string): any[] {
  const singleLineSql = sql.replace(/\s+/g, " ").trim().replace(/"/g, '\\"');
  const cmd = `bunx wrangler@4.120.0 d1 execute DB --remote --env production --config apps/web/wrangler.jsonc --command "${singleLineSql}" --json`;
  const output = runCmd(cmd);
  const startIdx = output.indexOf("[");
  if (startIdx === -1) {
    throw new Error("No JSON in output: " + output);
  }
  const parsed = JSON.parse(output.slice(startIdx));
  return parsed[0]?.results ?? [];
}

function executeD1SqlFile(sql: string): string {
  const tmpFile = join(process.cwd(), `scripts/graduation/tmp_promote_greenhouse_${Date.now()}_${Math.random().toString(36).slice(2)}.sql`);
  writeFileSync(tmpFile, sql, "utf-8");
  try {
    const cmd = `bunx wrangler@4.120.0 d1 execute DB --remote --env production --config apps/web/wrangler.jsonc --file="${tmpFile}" --json`;
    return runCmd(cmd);
  } finally {
    try { unlinkSync(tmpFile); } catch {}
  }
}

async function main() {
  console.log("================================================================================");
  console.log("VA FREELANCE HUB — GREENHOUSE (GITLAB & GRAFANA LABS) CANARY PROMOTION");
  console.log("================================================================================");

  const now = new Date().toISOString();
  console.log(`Current Evaluation Clock (UTC): ${now}`);

  const promotionSummaries: any[] = [];

  for (const item of SOURCES) {
    console.log(`\nEvaluating source: ${item.sourceId}...`);

    // 1. Load source registry row
    const registryRows = queryD1(`
      SELECT source_id, provider_id, display_name, endpoint_url, compliance_state,
             operational_state, review_deadline, policy_expiry, canary_max_new_items_per_tick,
             governance_revision, last_transition_hash, opt_out
      FROM source_registry 
      WHERE source_id = '${item.sourceId}';
    `);

    if (registryRows.length === 0) {
      throw new Error(`Source ${item.sourceId} not found in source_registry.`);
    }
    const reg = registryRows[0];
    console.log(`  Current operational state: ${reg.operational_state}`);
    if (reg.operational_state !== "shadow") {
      console.log(`  Source is already ${reg.operational_state}, skipping promotion.`);
      continue;
    }

    // 2. Load current admission evidence
    const evidenceRows = queryD1(`
      SELECT id, source_id, provider_id, source_governance_revision, provider_governance_revision,
             endpoint_url, policy_version, captured_at, expires_at, adjudication_ref,
             packet_json, packet_sha256
      FROM source_admission_current_evidence
      WHERE source_id = '${item.sourceId}';
    `);

    if (evidenceRows.length === 0) {
      throw new Error(`No current admission evidence found for ${item.sourceId}.`);
    }
    const ev = evidenceRows[0];
    console.log(`  Evidence ID: ${ev.id}, captured: ${ev.captured_at}, expires: ${ev.expires_at}`);
    console.log(`  Evidence Hash: ${ev.packet_sha256}`);

    // Check authority actions
    const packet = JSON.parse(ev.packet_json);
    if (!packet.authorityActions?.includes("public_minimal_metadata_canary")) {
      throw new Error(`Evidence for ${item.sourceId} lacks public_minimal_metadata_canary authority.`);
    }

    // 3. Load qualifying observations from the view in the 14-day window
    const qualifyingRows = queryD1(`
      SELECT q.id, q.observed_at, q.outcome, q.plausible_items
      FROM source_admission_qualifying_observations q
      WHERE q.source_id = '${item.sourceId}'
        AND julianday(q.observed_at) <= julianday('${now}')
        AND julianday(q.observed_at) >= julianday('${now}') - 14
      ORDER BY q.observed_at, q.id;
    `);

    console.log(`  Qualifying observations in 14-day window: ${qualifyingRows.length}`);
    if (qualifyingRows.length < 8) {
      throw new Error(`Insufficient qualifying observations (${qualifyingRows.length} < 8) for ${item.sourceId}.`);
    }

    const firstObs = new Date(qualifyingRows[0].observed_at).getTime();
    const lastObs = new Date(qualifyingRows[qualifyingRows.length - 1].observed_at).getTime();
    const spanDays = (lastObs - firstObs) / (86_400 * 1000);
    console.log(`  Observation span: ${spanDays.toFixed(2)} days (min required: 7.00 days)`);
    if (spanDays < 7.0) {
      throw new Error(`Observation span too short (${spanDays.toFixed(2)}d < 7d) for ${item.sourceId}.`);
    }

    const maxItems = Math.max(...qualifyingRows.map((r: any) => r.plausible_items));
    console.log(`  Max plausible items: ${maxItems}`);
    if (maxItems <= 0) {
      throw new Error(`No plausible items observed for ${item.sourceId}.`);
    }

    const qualifyingIds = qualifyingRows.map((r: any) => r.id);

    // 4. Run typed decision engine
    const decision = decideTypedTransition({
      sourceId: item.sourceId,
      from: { compliance: reg.compliance_state, operational: "shadow" },
      to: { compliance: reg.compliance_state, operational: "canary" },
      cause: "requested_promotion",
      now,
      policyExpiry: reg.policy_expiry,
      evidenceHash: ev.packet_sha256,
      observedShadowCount: qualifyingIds.length,
      requiredShadowCount: 8,
      canaryMaxNewItemsPerTick: item.cap,
      proposedNewItems: null,
      optOut: Boolean(reg.opt_out),
      admission: {
        admissionEvidenceId: ev.id,
        sourceGovernanceRevision: ev.source_governance_revision,
        providerGovernanceRevision: ev.provider_governance_revision,
        observationPolicyVersion: ev.policy_version,
        shadowEntryHash: reg.last_transition_hash,
        qualifyingObservationIds: qualifyingIds,
      },
    });

    if (!decision.ok) {
      throw new Error(`Typed transition decision rejected for ${item.sourceId}: ${decision.reason}`);
    }
    console.log(`  ✓ Typed transition decision accepted! Decision hash: ${decision.event.decisionHash.slice(0, 16)}...`);

    // 5. Generate and execute SQL insertion into source_transition_events
    const event = decision.event;
    const sql = `
      INSERT INTO source_transition_events (
        transition_plane_version, source_id, from_compliance, from_operational,
        to_compliance, to_operational, cause, decided_at, evidence_hash,
        input_json, input_hash, decision_hash
      ) VALUES (
        '${event.input.version}', '${event.sourceId}', '${event.fromCompliance}', '${event.fromOperational}',
        '${event.toCompliance}', '${event.toOperational}', '${event.cause}', '${event.decidedAt}', '${event.evidenceHash}',
        '${event.inputJson.replace(/'/g, "''")}', '${event.inputHash}', '${event.decisionHash}'
      );
    `;

    console.log(`  Executing transition event insertion into remote D1...`);
    const output = executeD1SqlFile(sql);
    console.log(`  Insert result: ${output.includes('"success": true') || !output.includes("error") ? "OK" : output}`);

    // 6. Verify source_registry updated atomically
    const postRows = queryD1(`
      SELECT source_id, operational_state, last_decision, canary_max_new_items_per_tick
      FROM source_registry WHERE source_id = '${item.sourceId}';
    `);
    const post = postRows[0];
    console.log(`  ✓ Post-promotion state: operational_state='${post.operational_state}', last_decision='${post.last_decision}', cap=${post.canary_max_new_items_per_tick}`);
    if (post.operational_state !== "canary") {
      throw new Error(`Post-promotion check failed: operational_state is ${post.operational_state}, expected 'canary'.`);
    }

    promotionSummaries.push({
      sourceId: item.sourceId,
      operationalState: post.operational_state,
      cap: post.canary_max_new_items_per_tick,
      observations14d: qualifyingRows.length,
      spanDays: spanDays.toFixed(2),
      maxItems,
      decisionHash: decision.event.decisionHash.slice(0, 16),
    });
  }

  console.log("\n================================================================================");
  console.log("FINAL POST-PROMOTION VERIFICATION");
  console.log("================================================================================");
  const allCanaries = queryD1(`
    SELECT source_id, provider_id, operational_state, compliance_state, canary_max_new_items_per_tick, last_decision_at
    FROM source_registry WHERE operational_state = 'canary' ORDER BY source_id;
  `);
  console.table(allCanaries);
  console.log("Promotion summaries:", JSON.stringify(promotionSummaries, null, 2));
}

main().catch((err) => {
  console.error("FATAL PROMOTION ERROR:", err);
  process.exit(1);
});
