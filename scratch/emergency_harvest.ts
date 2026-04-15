import "dotenv/config";
import { harvest } from "../jobs/scrape-opportunities";
import { db } from "../packages/db/client";
import { vitals } from "../packages/db/schema";
import { eq } from "drizzle-orm";

/**
 * VA.INDEX EMERGENCY HARVEST (The Discovery Burst)
 * Restores system fidelity by manually triggering the V12 ingestion fleet.
 */

async function emergencyHarvest() {
  console.log("🚀 [EMERGENCY] Initiating Discovery Burst (Local Engine)...");
  
  try {
    // 1. Clear any existing lock to ensure we can acquire it
    await db.update(vitals)
      .set({ 
        lastHarvestAt: null,
        lastHarvestEngine: null,
        lockStatus: "IDLE"
      })
      .where(eq(vitals.id, "HEARTBEAT_Philippines"));

    console.log("📟 Cockpit CLEARED. Starting harvest fleet...");

    // 2. Execute Harvest (Targeting Philippines Goldmines)
    const result = await harvest({ 
      targetRegion: "Philippines", 
      runnerId: "manual-recovery-agent" 
    });

    console.log(`\n✅ HARVEST COMPLETE: ${result.emitted} signals pulsed to Inngest Mesh.`);
    console.log(`⏱️ Duration: ${result.durationMs}ms`);

  } catch (err) {
    console.error("❌ Emergency harvest failed:", err);
  } finally {
    // Release the seat
    await db.update(vitals)
      .set({ lockStatus: "IDLE" })
      .where(eq(vitals.id, "HEARTBEAT_Philippines"));
    
    process.exit(0);
  }
}

emergencyHarvest();
