import "dotenv/config";
import { db } from "../packages/db/client";
import { vitals } from "../packages/db/schema";
import { eq } from "drizzle-orm";

/**
 * VA.INDEX GOVERNANCE RESET
 * Pauses Trigger.dev and clears the Atomic Seat lock.
 */

async function resetGovernance() {
  console.log("🚥 Resetting System Governance...");
  try {
    // 1. Pause Trigger.dev
    await db.update(vitals)
      .set({ 
        triggerCreditsOk: false, 
        triggerLastExhaustion: new Date(),
        lockStatus: "PAUSED_BY_ADMIN",
        lockUpdatedAt: new Date()
      })
      .where(eq(vitals.id, "GLOBAL"));
    
    console.log("🛑 Trigger.dev PAUSED in vitals.");

    // 2. Clear Ingestion Locks (Atomic Seat)
    await db.update(vitals)
      .set({ 
        lastHarvestAt: null,
        lastHarvestEngine: null 
      })
      .where(eq(vitals.id, "HEARTBEAT_Philippines"));

    console.log("🛰️ Atomic Seat lock CLEARED.");

  } catch (err) {
    console.error("Governance reset failed:", err);
  } finally {
    process.exit(0);
  }
}

resetGovernance();
