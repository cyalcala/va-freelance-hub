import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createDb, systemHealth, opportunities } from "./lib/db";
import { sql, desc } from "drizzle-orm";

/**
 * 🛰️ RESILIENCE WATCHDOG
 * 
 * Runs every 6 hours to inspect the "Vitals" of the entire VA.INDEX pipeline.
 * It catches what scrapers miss: Logic Drift, Silent Blackouts, and Tier Volume Drops.
 */
export const resilienceWatchdogTask = schedules.task({
  id: "resilience-watchdog",
  cron: "0 */6 * * *", 
  maxDuration: 60,
  run: async () => {
    logger.info("[watchdog] Initiating Strategic Vitals Audit...");
    const db = await createDb();
    
    const now = new Date();
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
    
    const vitals = {
      pulseOk: false,
      purityOk: false,
      stagnationOk: false, // NEW: Detects if the ENTIRE feed is slowing down
      sourcesDegraded: [] as string[],
      goldCount: 0,
      avgFreshnessHrs: 0,
      lastPulse: null as Date | null,
    };

    // 1. CHECK THE PULSE (Freshness)
    const latestSignal = await db.select({ scrapedAt: opportunities.scrapedAt })
      .from(opportunities)
      .orderBy(desc(opportunities.scrapedAt))
      .limit(1);
    
    vitals.lastPulse = latestSignal[0]?.scrapedAt ? new Date(latestSignal[0].scrapedAt) : null;
    vitals.pulseOk = vitals.lastPulse ? vitals.lastPulse > oneHourAgo : false;

    if (!vitals.pulseOk) {
      logger.error(`[watchdog] CRITICAL: System Pulse is weak. Last job discovered at ${vitals.lastPulse?.toISOString() || "NEVER"}. Scrapers may be stalled.`);
    }

    // 1.5 REAL-TIME DELIVERY CHECK (20-MIN WINDOW)
    const recentWrites = await db.run(sql`SELECT COUNT(*) as cnt FROM opportunities WHERE scraped_at > ${twentyMinsAgo.getTime()}`);
    const recentCount = Number(recentWrites.rows[0]?.[0] || 0);
    if (recentCount === 0) {
      logger.warn("[watchdog] REAL-TIME GAP DETECTED: No writes in last 20 minutes. Triggering autonomous recovery.");
      const { tasks } = await import("@trigger.dev/sdk/v3");
      await tasks.trigger("harvest-opportunities", { source: "watchdog-realtime-recovery" });
    }

    // 2. CHECK THE PURITY (Volume)
    const goldTier = await db.run(sql`SELECT COUNT(*) as cnt FROM opportunities WHERE tier = 1 AND is_active = 1`);
    vitals.goldCount = Number(goldTier.rows[0]?.[0] || 0);
    vitals.purityOk = vitals.goldCount >= 10;

    if (!vitals.purityOk) {
      logger.warn(`[watchdog] WARNING: Gold Tier Volume is low (${vitals.goldCount} jobs). Sifter may be too strict or sources are drying up.`);
    }

    // 2.5 CHECK STAGNATION (Average Freshness of Gold Pool)
    const goldFreshness = await db.run(sql`SELECT AVG((unixepoch('now') * 1000 - scraped_at) / (3600.0 * 1000)) as avg_age FROM opportunities WHERE tier = 1 AND is_active = 1`);
    vitals.avgFreshnessHrs = Number(goldFreshness.rows[0]?.[0] || 0);
    vitals.stagnationOk = vitals.avgFreshnessHrs < 6; // Entire feed must be fresh on average < 6h

    if (!vitals.stagnationOk) {
      logger.error(`[watchdog] CRITICAL: System-Wide Stagnation. Average Gold age is ${vitals.avgFreshnessHrs.toFixed(1)}h. Heartbeat may be failing.`);
    }

    // 2.6 CHECK VOLUME STAGNATION (Total Active Count)
    // If volume is exactly the same as last health check, it's suspicious
    const healthLog = await db.select({ totalActive: opportunities.id }) // Placeholder for a real health log if we had one
      .from(opportunities) // We don't have a history of counts easily accessible here without a new table
      .limit(1);
    
    // For now, we'll rely on the existing stagnationOk (avg_age) but we could add a "lastSeenCount" if we added a table.
    // Instead, let's just make the stagnation check more aggressive.
    if (vitals.avgFreshnessHrs > 4) {
       logger.warn(`[watchdog] WARNING: Feed is aging (${vitals.avgFreshnessHrs.toFixed(1)}h). No fresh signals reaching Gold tier.`);
    }

    // 3. CHECK SOURCE HEALTH
    const unhealthySources = await db.select()
      .from(systemHealth)
      .where(sql`status = 'FAIL' OR updatedAt < ${oneHourAgo}`);
    
    vitals.sourcesDegraded = unhealthySources.map((s: any) => s.sourceName);
    
    // 🛠️ PHASE 4: AUTONOMOUS SELF-HEALING
    if (vitals.pulseOk && !vitals.purityOk) {
      logger.info("[watchdog] 🏥 SELF-HEALING: Imbalance detected. Forcing Flag Synchronization...");
      // Logic for sync-flags.ts inside the task
      await db.run(sql`UPDATE opportunities SET is_active = 0 WHERE tier = 4`);
      await db.run(sql`UPDATE opportunities SET is_active = 1 WHERE tier IN (0, 1, 2, 3)`);
      logger.info("[watchdog] Flags synchronized successfully.");
    }

    // 🆘 PHASE 5: EMERGENCY RECOVERY
    if (!vitals.pulseOk) {
      logger.error("[watchdog] 🆘 ALARM: Multi-hour blackout detected. Triggering Emergency Recovery Crawl...");
      // Trigger the main scraper task programmatically
      // In Trigger.dev v3, we'd use tasks.trigger("scrape-opportunities")
      // For now, we log the intent as this requires the task import which might cause circular deps
      const { tasks } = await import("@trigger.dev/sdk/v3");
      await tasks.trigger("scrape-opportunities", { source: "watchdog-emergency" });
    }

    // 4. SUMMARY
    const score = (vitals.pulseOk ? 30 : 0) + (vitals.stagnationOk ? 30 : 0) + (vitals.purityOk ? 30 : 0) + (vitals.sourcesDegraded.length === 0 ? 10 : 0);
    
    logger.info(`[watchdog] Audit Complete. Resilience Score: ${score}/100`);
    
    const status = score === 100 ? "TITANIUM 🛡️" : score > 70 ? "STABLE ✅" : "DEGRADED ⚠️";

    return {
      status,
      score,
      vitals,
      recommendation: score < 80 ? "Manual intervention or source replacement required." : "System healthy."
    };
  },
});
