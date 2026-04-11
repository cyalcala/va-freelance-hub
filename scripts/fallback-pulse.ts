import "dotenv/config";
import { runHarrier } from "./phantom-harrier";
// Note: scout-feeds and plater are usually run as standalone scripts via bun
import { $ } from "bun";

/**
 * 🛰️ V12 UNIVERSAL FALLBACK PULSE (The Chronos Heartbeat)
 * 
 * This script bypasses Trigger.dev and Inngest to manually prime the system
 * and ensure all categories have fresh, Philippine-centric freelance jobs.
 * 
 * Process:
 * 1. Phantom Harrier (Vector 2) -> Direct to Turso
 * 2. Scout Feeds (Vector 3) -> Supabase Pantry
 * 3. Plater (Plating) -> Supabase to Turso
 * 4. Sentinel Audit (Self-Healing)
 */

async function main() {
  console.log("\n═══ [FALLBACK PULSE] Initiating Multi-Vector Resurrection ═══\n");

  try {
    // 1. Phantom Harrier (Vector 2)
    console.log("🚀 [1/4] Launching Phantom Harrier...");
    await runHarrier();

    // 2. Scout Feeds (Vector 3)
    console.log("\n🚀 [2/4] Launching Scout Swarm...");
    await $`bun run scripts/scout-feeds.ts`.quiet();

    // 3. Plater (Plating)
    console.log("\n🚀 [3/4] Plating finished meals to Turso...");
    await $`bun run scripts/plater.ts`.quiet();

    // 🏆 V12 HEARTBEAT SYNC
    console.log("\n🚥 [HEARTBEAT] Syncing Regional Vitality...");
    const { emitIngestionHeartbeat } = await import("../packages/db/governance");
    await emitIngestionHeartbeat('Fallback Pulse', 'Global');
    await emitIngestionHeartbeat('Fallback Pulse', 'LATAM');

    // 4. Sentinel Audit
    console.log("\n🚀 [4/4] Final SRE Sentinel Audit...");
    const { sentinel } = await import("../packages/db/sentinel");
    await sentinel.diagnoseAndRepair("fallback-manual-pulse");

    console.log("\n✅ [SUCCESS] Fallback Pulse Complete. Jobs are flowing.");
    
    // Final Freshness Check
    console.log("\n--- Category Vitality Report ---");
    await $`bun run scripts/audit-freshness.ts`.inherit();

  } catch (err: any) {
    console.error(`\n❌ [FAILURE] Fallback Pulse Crashed: ${err.message}`);
    process.exit(1);
  }
}

main().catch(console.error);
