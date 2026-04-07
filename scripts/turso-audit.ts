import { db } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { count, eq, not, sql } from "drizzle-orm";

async function audit() {
  console.log("🕵️ [AUDIT] Checking Turso Gold Vault...");
  
  try {
    const total = await db.select({ value: count() }).from(opportunities);
    console.log(`📊 Total Opportunities: ${total[0].value}`);
    const active = await db.select({ value: count() }).from(opportunities).where(eq(opportunities.isActive, true));
    console.log(`✅ Active: ${active[0].value}`);
    const trash = await db.select({ value: count() }).from(opportunities).where(eq(opportunities.tier, 4));
    console.log(`🗑️ Trash (Tier 4): ${trash[0].value}`);
    
    // Check Niche Distribution
    const distribution = await db.select({ 
      niche: opportunities.niche, 
      count: count() 
    })
    .from(opportunities)
    .groupBy(opportunities.niche);
    console.log(`📊 Niche Distribution:`, JSON.stringify(distribution, null, 2));

    const sample = await db.select().from(opportunities).limit(5);
    console.log(`📜 Sample Data:`, JSON.stringify(sample, null, 2));
  } catch (err: any) {
    console.error(`🔴 [AUDIT] FAILED to read Turso:`, err.message);
  }
}

audit();
