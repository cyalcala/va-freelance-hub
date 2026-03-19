import { db } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { siftOpportunity } from "../jobs/lib/sifter";
import { eq, sql } from "drizzle-orm";

async function reSiftAll() {
  console.log("🛠️ INITIATING GLOBAL RE-SIFT (TITANIUM PURITY)...");
  
  const allOpps = await db.select().from(opportunities);
  console.log(`Processing ${allOpps.length} records...`);

  let updated = 0;
  for (const opp of allOpps) {
    const newTier = siftOpportunity(
      opp.title || "",
      opp.company || "",
      opp.description || "",
      opp.sourcePlatform || ""
    );

    if (newTier !== opp.tier) {
      await db.update(opportunities)
        .set({ 
          tier: newTier,
          isActive: newTier !== 4
        })
        .where(eq(opportunities.id, opp.id));
      updated++;
    } else {
      // Even if tier is same, ensure isActive is correct
      const shouldBeActive = newTier !== 4;
      if (opp.isActive !== shouldBeActive) {
        await db.update(opportunities)
          .set({ isActive: shouldBeActive })
          .where(eq(opportunities.id, opp.id));
        updated++;
      }
    }
  }

  console.log(`✅ Re-Sift Complete: ${updated} records updated.`);
}

reSiftAll().catch(console.error);
