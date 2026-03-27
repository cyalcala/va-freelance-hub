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
      const STALENESS_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours
      
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
          metadata: JSON.stringify({ lastPulse, stalenessMins: Math.round((nowMs - lastPulse) / 60000) })
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

      // 2. Audit Source Degradation
      const degradedSources = await db.select()
        .from(systemHealth)
        .where(eq(systemHealth.status, 'FAIL'));
      
      if (degradedSources.length > 0) {
        logger.warn(`[watchdog] ${degradedSources.length} sources reported as DEGRADED.`);
        // Note: Specific source recovery is handled by the harvester's per-source try-catch.
      }

      return { status: "AUDIT_COMPLETE", isStale };
    } finally {
      await client.close();
    }
  },
});
