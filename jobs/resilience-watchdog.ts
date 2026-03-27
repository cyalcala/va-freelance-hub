import { schedules, logger, tasks } from "@trigger.dev/sdk/v3";
import { createDb } from "@va-hub/db/client";
import { systemHealth, opportunities, vitals, logs } from "@va-hub/db/schema";
import { sql, desc, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export const resilienceWatchdogTask = schedules.task({
  id: "resilience-watchdog",
  cron: "0 */2 * * *", // Checked every 2 hours as per "Google Ethos"
  maxDuration: 300,
  run: async () => {
    const { db, client } = createDb();
    try {
      logger.info("[watchdog] ══ Initiating Autonomous Resilience Audit ══");
      
      const nowMs = Date.now();
      const stalenessThresholdHrs = Number(process.env.STALENESS_THRESHOLD_HRS || 2);
      const STALENESS_THRESHOLD_MS = stalenessThresholdHrs * 60 * 60 * 1000;
      
      // 1. Audit Ingestion Pulse
      const latestSignal = await db.select({ scrapedAt: opportunities.scrapedAt })
        .from(opportunities)
        .orderBy(desc(opportunities.scrapedAt))
        .limit(1);
      
      const lastPulse = latestSignal[0]?.scrapedAt ? new Date(latestSignal[0].scrapedAt).getTime() : 0;
      const isStale = (nowMs - lastPulse) > STALENESS_THRESHOLD_MS;

      if (isStale) {
        logger.error(`[watchdog] CRITICAL STALENESS DETECTED. Last ingestion: ${Math.round((nowMs - lastPulse) / 60000)} mins ago.`);
        
        // SELF-HEALING: Clear potential locks and trigger recovery burst
        await db.update(vitals)
          .set({ 
            lockStatus: 'IDLE', 
            lockUpdatedAt: new Date(),
            lastRecoveryAt: new Date() 
          });

        await db.insert(logs).values({
          id: uuidv4(),
          message: "RECOVERY MODE ACTIVATED: Clearing system locks and triggering emergency harvest.",
          level: "error",
          timestamp: new Date(),
          metadata: { lastPulse, stalenessMins: Math.round((nowMs - lastPulse) / 60000) }
        });

        // Trigger burst mode recovery
        await tasks.trigger("harvest-opportunities", { source: "resilience-watchdog-recovery", mode: "BURST" });
      } else {
        logger.info("[watchdog] System pulse within nominal range.");
        await db.insert(logs).values({
          id: uuidv4(),
          message: "System Health: Pulse Nominal.",
          level: "info",
          timestamp: new Date()
        });
      }

      // 2. Audit Source Degradation (Titanium Telemetry)
      const healthEntries = await db.select().from(systemHealth);
      const degradedSources = healthEntries.filter(s => s.status === 'FAIL');
      const healthySources = healthEntries.filter(s => s.status === 'OK');
      
      // 3. Signal Density Check (Ensure variety and volume)
      const signalCountResult = await db.run(sql`SELECT COUNT(*) as total FROM opportunities WHERE is_active = 1`);
      const totalSignals = (signalCountResult.rows[0]?.total as number) ?? 0;

      const isTitaniumHealthy = !isStale && totalSignals > 100 && healthySources.length > 5;

      if (isTitaniumHealthy) {
        logger.info(`[watchdog] 🛡️ TITANIUM SHIELD: ACTIVE. [Pulse: OK | Signals: ${totalSignals} | Healthy Sources: ${healthySources.length}]`);
        await db.insert(logs).values({
          id: uuidv4(),
          message: `Titanium Shield: Fully Operational. Volume: ${totalSignals} signals. Reach: ${healthySources.length} sources.`,
          level: "snapshot",
          timestamp: new Date()
        });
      } else if (totalSignals < 50 || isStale) {
        logger.error(`[watchdog] TITANIUM INTEGRITY COMPROMISED. Signals: ${totalSignals}. Triggering Deep Recovery.`);
        
        // RECOVERY: Flush stale indicators and trigger full harvest
        await db.update(vitals).set({ lockStatus: 'IDLE', lastRecoveryAt: new Date() });
        await tasks.trigger("harvest-opportunities", { source: "titanium-recovery", mode: "FULL_AUDIT" });
      }

      return { status: "TITANIUM_AUDIT_COMPLETE", isStale, totalSignals, healthySources: healthySources.length };
    } catch (err) {
      logger.error("[watchdog] Resilience Audit Failed (Possible DB Blackout):", { error: (err as Error).message });
      return { status: "AUDIT_FAILED", error: (err as Error).message };
    } finally {
      await client.close();
    }
  },
});
