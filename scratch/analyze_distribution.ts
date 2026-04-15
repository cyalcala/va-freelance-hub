import "dotenv/config";
import { db } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { sql, desc, gte } from "drizzle-orm";

async function analyzeSourceDistribution() {
  const now = Date.now();
  const fortyEightHrsAgo = now - 48 * 60 * 60 * 1000;
  
  try {
    const results = await db.select({ 
      source: opportunities.sourcePlatform, 
      count: sql<number>`count(*)` 
    })
    .from(opportunities)
    .where(gte(opportunities.latestActivityMs, fortyEightHrsAgo))
    .groupBy(opportunities.sourcePlatform)
    .orderBy(desc(sql`count(*)`));
    
    console.log("═══ Signal Distribution (Last 48h) ═══");
    console.log(JSON.stringify(results, null, 2));
    
    // 🎯 ACTUALLY CHECK THE UI SORTING (V12.11 EFFECT)
    const { getSortedSignals } = await import("../packages/db/sorting");
    const top100 = await getSortedSignals(100, now);

    const top100Breakdown: Record<string, number> = {};
    top100.forEach(j => {
      const src = j.sourcePlatform || "Unknown";
      top100Breakdown[src] = (top100Breakdown[src] || 0) + 1;
    });

    console.log("\n═══ Top 100 Breakdown (The User View) ═══");
    console.log(JSON.stringify(top100Breakdown, null, 2));

  } catch (err) {
    console.error("Analysis failed:", err);
  } finally {
    process.exit(0);
  }
}

analyzeSourceDistribution();
