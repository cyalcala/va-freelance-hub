import { harvest } from "../jobs/scrape-opportunities";
import { client } from "../packages/db/client";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * 🚜 FORCE HARVEST v1.0
 * 
 * Goal: Trigger a real-time scrape of WeWorkRemotely and other sources,
 * then manually move them from the "Pantry" (Inngest/Events) to the vault
 * to show immediate "Real Job" results for the user.
 */

async function main() {
  console.log("🚜 [HARVEST] Starting REAL-WORLD Signal Extraction...");

  try {
    // 1. Run the harvest sequence for ALL sources (Broad sweep)
    const result = await harvest();
    console.log(`📡 Pulsed ${result.emitted} signals to the Intelligence Mesh.`);

    // 2. FIX: Heal the remaining tier 4 date corruption while we wait for Mesh processing
    const nowIso = new Date().toISOString();
    await client.execute({
        sql: "UPDATE opportunities SET scraped_at = ?, latest_activity_ms = ? WHERE scraped_at LIKE '+%'",
        args: [nowIso, Date.now()]
    });

    console.log("✅ [HARVEST] Cycle initiated. Inngest will process these into the Gold Vault within minutes.");
    console.log("💡 [TIP] The 'LIT' status and fresh jobs should appear on your dashboard shortly.");

  } catch (err: any) {
    console.error("🔴 [HARVEST] CRITICAL FAILURE:", err.message);
  }
}

main();
