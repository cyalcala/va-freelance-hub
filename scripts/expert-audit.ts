import { db, normalizeDate } from "../packages/db";
import { opportunities, systemHealth } from "../packages/db/schema";
import { desc, eq, sql } from "drizzle-orm";

async function expertAudit() {
  console.log("🛡️  VA.INDEX EXPERT SYSTEMS AUDIT 🛡️");
  console.log("-----------------------------------");

  // 1. TIMESTAMP PRECISION CHECK
  const latestOpp = await db.select({ scrapedAt: opportunities.scrapedAt })
    .from(opportunities)
    .orderBy(desc(opportunities.scrapedAt))
    .limit(1);
  
  const ts = latestOpp[0]?.scrapedAt;
  const normalized = normalizeDate(ts);
  const isMs = normalized.getTime() > 1000000000000;
  console.log(`[Vitals] Latest ScrapedAt: ${normalized.toISOString()}`);
  console.log(`[Vitals] Precision: ${isMs ? "Milliseconds ✅" : "Seconds (Potential Issue ⚠️)"}`);

  // 2. IS_ACTIVE FIELD CONSISTENCY
  const inactivePurity = await db.select({ count: sql`count(*)` })
    .from(opportunities)
    .where(sql`tier = 4 AND is_active = 1`);
  
  const activePurity = await db.select({ count: sql`count(*)` })
    .from(opportunities)
    .where(sql`tier IN (1, 2, 3) AND is_active = 0`);
  
  const leaks = Number((inactivePurity[0] as any).count || 0);
  const ghosts = Number((activePurity[0] as any).count || 0);
  
  console.log(`[Purity] Tier 4 Active Leaks: ${leaks} ${leaks === 0 ? "✅" : "❌"}`);
  console.log(`[Purity] Tier 1-3 Inactive Ghosts: ${ghosts} ${ghosts === 0 ? "✅" : "⚠️ (May be scheduled)"}`);

  // 3. SYSTEM HEALTH AUDIT
  const healthStats = await db.select().from(systemHealth).orderBy(desc(systemHealth.updatedAt));
  console.log("\n[Pipeline] Source Health Status:");
  healthStats.forEach(h => {
    const staleness = (Date.now() - normalizeDate(h.updatedAt).getTime()) / (1000 * 60 * 60);
    console.log(`  → ${h.sourceName}: ${h.status} (${staleness.toFixed(1)}h ago) ${staleness < 4 ? "✅" : "⚠️ STALE"}`);
  });

  // 4. BATCH INTEGRITY VERIFICATION (Logic Check)
  console.log("\n[Logic] Verifying sync-flags implementation...");
  const sample = await db.select().from(opportunities).limit(5);
  const logicOk = sample.every(o => (o.tier === 4 ? !o.isActive : o.isActive));
  console.log(`[Logic] Sifter-to-Active Mapping: ${logicOk ? "VALID ✅" : "OUT-OF-SYNC ❌"}`);

  console.log("\n-----------------------------------");
  console.log("AUDIT COMPLETE.");
}

expertAudit().catch(console.error);
