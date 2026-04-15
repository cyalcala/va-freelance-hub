import { db } from "../packages/db";
import { vitals } from "../packages/db/schema";
import { sql } from "drizzle-orm";

async function reset() {
  console.log("🧨 [APEX] Initiating Emergency Consensus Reset...");
  
  try {
     // 1. Force IDLE and Reset harvest timestamps to Year 2026 (or null)
     const result = await db.run(sql`
        UPDATE vitals 
        SET 
          lock_status = 'IDLE',
          last_harvest_at = NULL,
          last_harvest_engine = 'SRE_RESET'
        WHERE id LIKE 'HEARTBEAT_%' OR id = 'GLOBAL'
     `);
     
     console.log(`✅ [APEX] Reset complete. Rows affected: ${result.rowsAffected}`);
     console.log("🚥 [APEX] Future-Locks have been purged. Pulse should now respond to manual kickstarts.");
  } catch (err) {
    console.error("❌ [APEX] Reset failed:", err);
  }
}

reset();
