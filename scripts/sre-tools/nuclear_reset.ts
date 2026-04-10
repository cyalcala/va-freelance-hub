import { createDb } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { like, or, eq } from "drizzle-orm";

async function nuclearReset() {
  const { db, client } = createDb();
  
  try {
    console.log("═══ SRE MASTER AUDIT: NUCLEAR MOCK PURGE ═══");
    
    // 1. Purge Sentinels and Simulated signals
    const result = await db.delete(opportunities)
      .where(
        or(
          eq(opportunities.title, "SRE_FORCE_WAKEUP"),
          like(opportunities.sourcePlatform, "%SIMULATED%"),
          like(opportunities.sourcePlatform, "%Backfill%"),
          like(opportunities.company, "V12_SENTINEL")
        )
      );

    console.log(`✅ PURGE COMPLETE. Signals removed: ${result.rowsAffected}`);

  } catch (err: any) {
    console.error("Purge Failed:", err.message);
  } finally {
    await client.close();
  }
}

nuclearReset();
