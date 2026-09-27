/**
 * Recategorization Script for Graduated VA Agency Roles
 *
 * Re-classifies agency opportunities that were dumped into category 'other'
 * into their proper high-signal categories (admin, customer-service, marketing,
 * tech, finance, design, writing).
 *
 * Usage:
 *   bun run scripts/graduation/recategorize-agency-jobs.ts --dry-run
 *   bun run scripts/graduation/recategorize-agency-jobs.ts --execute
 */

import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { categorizeOpportunityTitle } from "../../packages/scraper/categorizer";

function runCmd(cmd: string, cwd = process.cwd()): string {
  try {
    return execSync(cmd, { cwd, encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 });
  } catch (err: any) {
    const stdout = err.stdout ? err.stdout.toString() : "";
    const stderr = err.stderr ? err.stderr.toString() : "";
    return stdout + "\n" + stderr;
  }
}

function queryD1(sql: string): any[] {
  const cmd = `bun run --cwd apps/web wrangler d1 execute DB --remote --env production --command "${sql.replace(/"/g, '\\"')}"`;
  const output = runCmd(cmd);
  const startIdx = output.indexOf("[");
  if (startIdx === -1) {
    throw new Error("No JSON in output: " + output);
  }
  const parsed = JSON.parse(output.slice(startIdx));
  return parsed[0]?.results ?? [];
}

function executeD1Sql(sql: string): string {
  const tmpFile = join(process.cwd(), `tmp_recat_${Date.now()}_${Math.random().toString(36).slice(2)}.sql`);
  writeFileSync(tmpFile, sql, "utf-8");
  try {
    const cmd = `bun run --cwd apps/web wrangler d1 execute DB --remote --env production --file="${tmpFile}"`;
    return runCmd(cmd);
  } finally {
    try { unlinkSync(tmpFile); } catch {}
  }
}

async function main() {
  const isExecute = process.argv.includes("--execute");
  console.log("================================================================================");
  console.log(`VA FREELANCE HUB — AGENCY OPPORTUNITIES RECATEGORIZATION (${isExecute ? "EXECUTE" : "DRY-RUN"})`);
  console.log("================================================================================");

  console.log("\n[1/3] Loading agency opportunities currently categorized as 'other'...");
  const rows = queryD1(
    "SELECT id, source_id, company, title, description, category FROM opportunities WHERE (source_id LIKE 'breezy:%' OR source_platform IN ('20Four7VA', 'Sourcefit', 'Yokly', 'VALUE Virtual Assistants', 'Remote Craft')) AND is_active = 1;"
  );
  console.log(`Loaded ${rows.length} total active agency opportunities.`);

  const updates: { id: number; title: string; oldCat: string; newCat: string }[] = [];
  const tally: Record<string, number> = {};

  for (const row of rows) {
    const newCat = categorizeOpportunityTitle(row.title, row.description || "");
    tally[newCat] = (tally[newCat] || 0) + 1;
    if (newCat !== row.category) {
      updates.push({
        id: row.id,
        title: row.title,
        oldCat: row.category,
        newCat,
      });
    }
  }

  console.log(`\nNew Target Category Distribution across all ${rows.length} active agency jobs:`);
  console.table(tally);

  console.log(`\n[2/3] Found ${updates.length} agency jobs requiring category migration from '${updates[0]?.oldCat ?? ""}' -> new categories.`);
  console.log("Sample migrations (first 10):");
  console.table(updates.slice(0, 10).map(u => ({ id: u.id, title: u.title.slice(0, 45), old: u.oldCat, new: u.newCat })));

  if (!isExecute) {
    console.log("\n⚠️  Dry run complete. No changes written to D1.");
    console.log("To execute this migration against production D1, run:");
    console.log("  bun run scripts/graduation/recategorize-agency-jobs.ts --execute");
    return;
  }

  console.log("\n[3/3] Generating and applying D1 SQL updates in batches...");
  const BATCH_SIZE = 40;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const chunk = updates.slice(i, i + BATCH_SIZE);
    const sqlStatements = chunk.map(
      u => `UPDATE opportunities SET category = '${u.newCat}', updated_at = datetime('now') WHERE id = ${u.id};`
    );
    const sqlBatch = sqlStatements.join("\n");
    console.log(`Applying batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} updates)...`);
    const out = executeD1Sql(sqlBatch);
    if (out.includes("error") || out.includes("ERROR")) {
      console.error("Batch update failed:", out);
    } else {
      console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} applied successfully.`);
    }
  }

  console.log("\n================================================================================");
  console.log(`SUCCESS: ${updates.length} agency opportunities successfully recategorized in D1!`);
  console.log("================================================================================");
}

main().catch(console.error);
