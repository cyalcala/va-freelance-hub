import { schedules, logger, tasks } from "@trigger.dev/sdk/v3";
import { createDb } from "@va-hub/db/client";
import { noteslog, systemHealth } from "@va-hub/db/schema";
import { v4 as uuidv4 } from "uuid";
import { eq, not } from "drizzle-orm";

/**
 * 🕵️ SILENT AUTO-HEALER (WATCHDOG)
 * 
 * Pillar 1: Live Edge Audit (Fetch /api/health)
 * Pillar 2: Vercel Defibrillator (POST to Hook URL)
 * Pillar 3: Engine Kickstart (Trigger Harvester)
 * Pillar 4: Silent Ledger (Write to noteslog)
 */
export const silentWatchdogTask = schedules.task({
  id: "silent-watchdog",
  cron: "*/15 * * * *", // Surgically monitor every 15 minutes
  maxDuration: 300,
  run: async () => {
    const { db, client } = createDb();
    const siteUrl = process.env.PUBLIC_SITE_URL || "https://va-freelance-hub-web.vercel.app";
    const deployHook = process.env.VERCEL_DEPLOY_HOOK_URL;
    
    let driftMinutes = 0;
    let actionsTaken: string[] = [];
    let status = "success";
    let metadata: any = {
        timestamp: new Date().toISOString(),
        siteUrl
    };

    try {
      logger.info(`[watchdog] Initiating Live Edge Audit: ${siteUrl}/api/health`);

      // Pillar 1: Live Edge Audit (Force cache bypass with timestamp)
      const response = await fetch(`${siteUrl}/api/health?t=${Date.now()}`, {
        headers: { 
          "Cache-Control": "no-cache",
          "User-Agent": "VA-Hub-Watchdog/2.0 (Autonomous)"
        }
      });
      
      if (!response.ok) {
        throw new Error(`Edge Audit HTTP Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      metadata.auditResponse = data;
      
      // Pillar 1.5: Granular System Health Awareness
      const unhealthySources = await db.select()
        .from(systemHealth)
        .where(not(eq(systemHealth.status, "OK")));
      
      metadata.unhealthySourcesCount = unhealthySources.length;
      metadata.unhealthySources = unhealthySources.map(s => s.sourceName);

      const stalenessHrs = data.vitals?.ingestionStalenessHrs ?? 0;
      driftMinutes = Math.round(stalenessHrs * 60);

      logger.info(`[watchdog] Current Signal Drift: ${driftMinutes} minutes.`);

      // Level 2 Autonomous Remediation Threshold (45 Minutes)
      if (driftMinutes > 45) {
        logger.warn(`[watchdog] ⚠️ DRIFT BREACH: ${driftMinutes}m. Initiating Remediation.`);
        
        // Pillar 2: Vercel Defibrillator (Cache Bust)
        if (deployHook) {
          try {
            await fetch(deployHook, { method: "POST" });
            actionsTaken.push("VERCEL_CACHE_BUST");
            logger.info("[watchdog] Vercel cache bust triggered via Deploy Hook.");
          } catch (hookErr: any) {
            logger.error(`[watchdog] Cache bust failed: ${hookErr.message}`);
            actionsTaken.push("VERCEL_CACHE_BUST_FAILED");
          }
        } else {
          logger.warn("[watchdog] VERCEL_DEPLOY_HOOK_URL not configured. Skipping cache bust.");
          actionsTaken.push("CACHE_BUST_SKIPPED");
        }

        // Pillar 3: Engine Kickstart (Out-of-band Harvester Trigger)
        try {
          await tasks.trigger("harvest-opportunities", { 
            source: "silent-watchdog-remediation",
            driftMinutes,
            unhealthySources: metadata.unhealthySources 
          });
          actionsTaken.push("ENGINE_KICKSTART");
          logger.info("[watchdog] Harvester task kickstarted out-of-band.");
        } catch (taskErr: any) {
          logger.error(`[watchdog] Harvester kickstart failed: ${taskErr.message}`);
          actionsTaken.push("ENGINE_KICKSTART_FAILED");
        }
      } else if (metadata.unhealthySourcesCount > 0) {
        // Targeted Healing for degraded/failed sources even without drift
        logger.warn(`[watchdog] 🕵️ HEALTH BREACH: ${metadata.unhealthySourcesCount} sources degraded. Initiating targeted heal.`);
        await tasks.trigger("harvest-opportunities", { 
           source: "silent-watchdog-target-heal",
           unhealthySources: metadata.unhealthySources 
        });
        actionsTaken.push("HEALTH_KICKSTART");
      } else {
        logger.info("[watchdog] Data freshness and source health verified. No action required.");
        actionsTaken.push("VERIFIED_IDENTITY_FRESH");
      }

    } catch (err: any) {
      status = "failure";
      metadata.criticalError = err.message;
      logger.error(`[watchdog] 🛑 Silent failure in remediation cycle: ${err.message}`);
    } finally {
      try {
        // Pillar 4: Silent Ledger (/noteslog)
        await db.insert(noteslog).values({
          id: uuidv4(),
          driftMinutes,
          actionsTaken: actionsTaken.join(", "),
          status,
          metadata: JSON.stringify(metadata),
          timestamp: new Date()
        });
        logger.info("[watchdog] 📝 Telemetry committed to /noteslog.");
      } catch (logErr: any) {
        logger.error(`[watchdog] Failed to write to /noteslog: ${logErr.message}`);
      }
      
      await client.close();
    }

    return { 
      driftMinutes, 
      actionsTaken, 
      status,
      triggeredAt: metadata.timestamp 
    };
  },
});
