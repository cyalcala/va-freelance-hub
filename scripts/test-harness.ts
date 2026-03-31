import { createDb } from "../packages/db/client";
import { opportunities as opportunitiesSchema, agencies as agenciesSchema, noteslog } from "../packages/db/schema";
import { runAtsSniper } from "../jobs/ats-harvester";
import { sql } from "drizzle-orm";

/**
 * 🧪 APEX SRE LOCAL HARNESS
 * Bypasses Trigger.dev for 60-second Pass/Fail verification.
 */
async function main() {
  console.log("🚀 APEX SRE: Initializing Local Harness...");
  const { db, client } = createDb();

  try {
    // 1. Audit Current State
    const [stats] = await db.select({
      totalOpps: sql<number>`count(*)`,
    }).from(opportunitiesSchema);
    console.log(`📊 DB Audit: ${stats.totalOpps} opportunities found.`);

    // 2. Execute Harvester Logic
    console.log("🛰️ Triggering ATS Sniper...");
    const result = await runAtsSniper(db);
    console.log("✅ Sniper Result:", result);

    // 3. Verify Coherency (lastSeenAt update)
    // Note: will verify after schema update in Phase 2
    
    // 4. Log to NotesLog
    await db.insert(noteslog).values({
      id: crypto.randomUUID(),
      driftMinutes: 0,
      actionsTaken: "Local Harness Execution: runAtsSniper",
      status: "SUCCESS",
      metadata: JSON.stringify(result)
    });
    console.log("💾 Silent audit logged to /noteslog.");

  } catch (error) {
    console.error("🔴 HARNESS FAILURE:", error);
    await db.insert(noteslog).values({
      id: crypto.randomUUID(),
      driftMinutes: 0,
      actionsTaken: "Local Harness Execution: FAILED",
      status: "FAILURE",
      metadata: JSON.stringify({ error: error.message })
    });
    process.exit(1);
  } finally {
    client.close();
  }
}

main();
