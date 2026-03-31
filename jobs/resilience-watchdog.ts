import { schedules, logger, tasks } from "@trigger.dev/sdk/v3";
import { db } from "@va-hub/db/client";
import { systemHealth, opportunities, vitals, logs } from "@va-hub/db/schema";
import { sql, desc, eq, and, lt } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkAndIncrementAiQuota } from "./lib/job-utils";

/**
 * VA.INDEX Resilience Watchdog (The Auditor)
 * Audits pulse, staleness, and manages circuit-breaker transitions.
 */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const auditModel = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  generationConfig: {
    temperature: 0.1,
    responseMimeType: "application/json",
  }
});

export const resilienceWatchdogTask = schedules.task({
  id: "resilience-watchdog",
  cron: "0 */2 * * *", // Checked every 2 hours
  maxDuration: 300,
  run: async () => {
    try {
      logger.info("[watchdog] ══ Initiating Autonomous Resilience Audit ══");
      
      const nowMs = Date.now();
      const stalenessThresholdHrs = Number(process.env.STALENESS_THRESHOLD_HRS || 2);
      const STALENESS_THRESHOLD_MS = stalenessThresholdHrs * 60 * 60 * 1000;
      
      // 1. Audit Ingestion Pulse
      const latestSignal = await db.select({ lastSeenAt: opportunities.lastSeenAt })
        .from(opportunities)
        .orderBy(desc(opportunities.lastSeenAt))
        .limit(1);
      
      const lastPulse = latestSignal[0]?.lastSeenAt ? new Date(latestSignal[0].lastSeenAt).getTime() : 0;
      const isStale = (nowMs - lastPulse) > STALENESS_THRESHOLD_MS;

      if (isStale) {
        logger.error(`[watchdog] CRITICAL STALENESS DETECTED. Last pulse: ${Math.round((nowMs - lastPulse) / 60000)} mins ago.`);
        
        // SELF-HEALING: Clear potential locks
        await db.update(vitals).set({ 
          lockStatus: 'IDLE', 
          lockUpdatedAt: new Date(),
          lastRecoveryAt: new Date() 
        });

        await db.insert(logs).values({
          id: uuidv4(),
          message: "RECOVERY MODE: System stale. Resetting locks.",
          level: "error",
          timestamp: new Date()
        });

        await tasks.trigger("harvest-opportunities", { source: "resilience-watchdog-recovery", mode: "BURST" });
      }

      // 2. CIRCUIT BREAKER MANAGEMENT
      // Reset circuits that have been open for > 4 hours to allow cooling-off retry
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const openCircuits = await db.select()
        .from(systemHealth)
        .where(and(eq(systemHealth.status, 'CIRCUIT_OPEN'), lt(systemHealth.updatedAt, fourHoursAgo)));

      for (const circuit of openCircuits) {
        logger.warn(`[watchdog] Cooling off circuit for ${circuit.sourceName}. Resetting for retry.`);
        await db.update(systemHealth)
          .set({ 
            status: 'FAIL', 
            consecutiveFailures: 0, 
            updatedAt: new Date() 
          })
          .where(eq(systemHealth.id, circuit.id));
      }

      // 3. AI-DRIVEN ANOMALY DETECTION (The Sentinel Audit)
      // Audit one sample signal from each source to catch silent data drift
      const activeSources = await db.select().from(systemHealth).where(eq(systemHealth.status, 'OK'));
      let auditedSourceCount = 0;
      let anomaliesFound = 0;

      for (const source of activeSources) {
        try {
          const sample = await db.select()
            .from(opportunities)
            .where(eq(opportunities.sourcePlatform, source.sourceName))
            .orderBy(desc(opportunities.lastSeenAt))
            .limit(1);

          if (sample.length === 0) continue;

          const { title, company, description } = sample[0];
          const canCallAi = await checkAndIncrementAiQuota(db);
          if (!canCallAi) break;

          const auditResult = await auditModel.generateContent(`
            EVALUATE THIS JOB SIGNAL FOR VALIDITY.
            Is this structured job data or junk/noise/error messages?
            TITLE: ${title}
            COMPANY: ${company}
            DESCRIPTION: ${description?.slice(0, 500)}
            
            RESPOND WITH JSON: { "is_valid": boolean, "reason": string }
          `);

          const audit = JSON.parse(auditResult.response.text());
          auditedSourceCount++;

          if (!audit.is_valid) {
            anomaliesFound++;
            logger.error(`[watchdog] ANOMALY DETECTED for ${source.sourceName}: ${audit.reason}`);
            await db.update(systemHealth)
              .set({ 
                status: 'FAIL', 
                errorMessage: `Sentinel Audit Failed: ${audit.reason}`,
                updatedAt: new Date() 
              })
              .where(eq(systemHealth.id, source.id));
            
            await db.insert(logs).values({
              id: uuidv4(),
              message: `SENTINEL AUDIT CRITICAL: ${source.sourceName} is returning invalid data. Reason: ${audit.reason}`,
              level: "error",
              timestamp: new Date()
            });
          }
        } catch (auditErr) {
          logger.warn(`[watchdog] Audit failed for ${source.sourceName}: ${ (auditErr as Error).message }`);
        }
      }

      // 4. Signal Density Check
      const signalCountResult = await db.run(sql`SELECT COUNT(*) as total FROM opportunities WHERE is_active = 1`);
      const totalSignals = (signalCountResult.rows[0]?.total as number) ?? 0;

      const healthEntries = await db.select().from(systemHealth);
      const healthySources = healthEntries.filter(s => s.status === 'OK');

      const isTitaniumHealthy = !isStale && anomaliesFound === 0 && totalSignals > 100 && healthySources.length > 5;

      if (isTitaniumHealthy) {
        logger.info(`[watchdog] 🛡️ TITANIUM SHIELD: ACTIVE. [Signals: ${totalSignals} | Sources: ${healthySources.length} | Audits: ${auditedSourceCount}]`);
      } else if (totalSignals < 50) {
        logger.warn(`[watchdog] Low signal count detected (${totalSignals}). Triggering discovery burst.`);
        await tasks.trigger("harvest-opportunities", { source: "low-density-recovery", mode: "FULL_AUDIT" });
      }

      return { status: "TITANIUM_AUDIT_COMPLETE", isStale, totalSignals, healthySources: healthySources.length, audited: auditedSourceCount, anomalies: anomaliesFound, circuitsReset: openCircuits.length };
    } catch (err) {
      logger.error("[watchdog] Resilience Audit Failed:", { error: (err as Error).message });
      return { status: "AUDIT_FAILED", error: (err as Error).message };
    } finally {
      // Singleton db reuse, no need to close client manually unless shutting down worker
    }
  },
});
