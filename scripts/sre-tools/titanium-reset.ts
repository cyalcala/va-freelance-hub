import { supabase } from "../../packages/db/supabase";
import { db } from "../../packages/db";
import { vitals } from "../../packages/db/schema";
import { sql } from "drizzle-orm";

async function titaniumReset() {
  console.log("🛠️ [TITANIUM] Initiating Master SRE Reset...");

  // 1. Unblock AI Mesh
  console.log("🧠 Unblocking AI Providers in Supabase...");
  const { error: aiError } = await supabase
    .from("ai_cooldowns")
    .update({ 
      is_blocked: false, 
      error_count: 0, 
      last_error: "SRE_TITANIUM_RESET",
      updated_at: new Date().toISOString() 
    })
    .neq("provider_name", ""); // Update all

  if (aiError) {
    console.error("❌ Failed to unblock AI Mesh:", aiError.message);
  } else {
    console.log("✅ AI Mesh unblocked (Groq restored).");
  }

  // 2. Clear Stale Staging Locks
  console.log("📡 Sanitizing Supabase Staging Locks...");
  const { error: stageError } = await supabase
    .from("raw_job_harvests")
    .update({
      status: 'RAW',
      locked_by: null,
      updated_at: new Date().toISOString(),
    })
    .not('locked_by', 'is', null);

  if (stageError) {
    console.warn("⚠️ Warning: Could not clear staging locks:", stageError.message);
  }

  // 3. Emit Goldilocks Master Heartbeat
  console.log("📀 Emitting Master Heartbeat to Turso Vault...");
  try {
     // Check if GLOBAL record exists
     const existingVitals = await db.select().from(vitals).limit(1);
     
     if (existingVitals.length === 0) {
       await db.insert(vitals).values({
         id: 'GLOBAL',
         lastIngestionHeartbeatMs: Date.now(),
         heartbeatSource: 'TITANIUM_SRE_RESET',
         sentinelState: JSON.stringify({ version: "3.0.0", mode: "TITANIUM" })
       });
     } else {
       await db.update(vitals)
         .set({ 
           lastIngestionHeartbeatMs: Date.now(),
           heartbeatSource: 'TITANIUM_SRE_RESET',
           sentinelState: JSON.stringify({ version: "3.0.0", mode: "TITANIUM" })
         })
         .where(sql`id = 'GLOBAL'`);
     }
     console.log("✅ Master Heartbeat Plated.");
  } catch (err: any) {
    console.error("❌ Failed to emit Turso heartbeat:", err.message);
  }

  console.log("\n🚀 [TITANIUM] Reset Complete. System is now in NOMINAL steady-state.");
  process.exit(0);
}

titaniumReset();
