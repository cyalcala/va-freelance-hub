import { db } from "../../packages/db/client";
import { vitals } from "../../packages/db/schema";
import { eq } from "drizzle-orm";
import { releaseLease } from "../../packages/db/governance";
import { normalizeDate } from "../../packages/db/utils";
import fs from "fs";

async function runSentinel() {
  console.log("🧿 [SENTINEL] Initiating Autonomous Health Audit...");

  const [record] = await db.select().from(vitals).where(eq(vitals.id, "HEARTBEAT_Global")).limit(1);

  if (!record) {
    console.log("⚠️ [SENTINEL] No Vital records found for Global region.");
    process.exit(0);
  }

  const now = Date.now();
  const lastHarvestMs = normalizeDate(record.lastHarvestAt).getTime();
  const lastIngestionMs = record.lastIngestionHeartbeatMs || 0;
  const lastProcessingMs = record.lastProcessingHeartbeatMs || 0;

  const harvestStalenessMin = (now - lastHarvestMs) / (1000 * 60);
  const ingestionStalenessMin = (now - lastIngestionMs) / (1000 * 60);
  const processingStalenessMin = (now - lastProcessingMs) / (1000 * 60);

  console.log(`📊 [SENTINEL] Harvest Staleness: ${harvestStalenessMin.toFixed(1)}m`);
  console.log(`📊 [SENTINEL] Ingestion Staleness: ${ingestionStalenessMin.toFixed(1)}m`);
  console.log(`📊 [SENTINEL] Processing Staleness: ${processingStalenessMin.toFixed(1)}m`);

  let actionsTaken: string[] = [];

  // 1. STALE LOCK DETECTION (AUTONOMOUS RECOVERY)
  if (record.lockStatus === 'BUSY' && harvestStalenessMin > 35) {
    console.log("🧨 [SENTINEL] Deadlock detected! Engine crashed while holding the lease.");
    await releaseLease('Global');
    actionsTaken.push("🔓 Forced Lease Release (Deadlock Resolved)");
  }

  // 2. CRITICAL STALENESS ALERT
  const isHealthy = ingestionStalenessMin < 120; // 2 hours threshold

  // Write to summary for GHA
  const summary = `
### 🧿 Sovereign Sentinel Health Report
- **System Pulse**: ${isHealthy ? '🟢 HEALTHY' : '🔴 STALE'}
- **Ingestion Heartbeat**: ${ingestionStalenessMin.toFixed(1)}m ago
- **Processing Heartbeat**: ${processingStalenessMin.toFixed(1)}m ago
- **Lock Status**: ${record.lockStatus} (${record.lastHarvestEngine || 'None'})

#### Actions Taken:
${actionsTaken.length > 0 ? actionsTaken.map(a => `- ${a}`).join('\n') : '- None required'}
  `;

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }

  if (!isHealthy) {
    console.error("❌ [SENTINEL] System is CRITICALLY stale (>2h). failing for visibility.");
    process.exit(1);
  }

  console.log("✅ [SENTINEL] Audit concluded. System is within operational parameters.");
  process.exit(0);
}

runSentinel().catch(err => {
  console.error("❌ [SENTINEL] Fatal error during audit:", err);
  process.exit(1);
});
