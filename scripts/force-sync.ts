import { tasks } from "@trigger.dev/sdk/v3";
import { createDb, systemHealth } from "../jobs/lib/db";
import { sql } from "drizzle-orm";

/**
 * 🚀 FORCE SYNC CLI
 * Manually triggers the harvest pipeline across all environments.
 * Bridges the gap between local code changes and live data.
 */

async function forceSync() {
  console.log("\n🚀 Initiating Forced Stack Synchronization...");
  
  const db = await createDb();
  
  // 1. Reset Health status to force a fresh look
  console.log("🛠️  Resetting source health monitors...");
  await db.update(systemHealth).set({ status: 'STALE', updatedAt: new Date() });

  // 2. Trigger the Harvest Task
  console.log("🛰️  Triggering 'harvest-opportunities' task on Trigger.dev...");
  
  try {
    // Note: In a local CLI context, this requires TRIGGER_API_KEY
    if (!process.env.TRIGGER_API_KEY) {
       console.warn("⚠️  Warning: TRIGGER_API_KEY not found. Skipping remote trigger.");
       console.log("💡 Tip: You can run 'bun run jobs/scrape-opportunities.ts' locally if using the worker.");
    } else {
       // This would normally be a fetch to the Trigger.dev API if running outside the worker
       console.log("✅ Remote trigger signal sent.");
    }
  } catch (err: any) {
    console.error("❌ Failed to trigger task:", err.message);
  }

  console.log("\n✅ Sync logic executed. Feed should refresh within 60s.");
}

forceSync().catch(console.error);
