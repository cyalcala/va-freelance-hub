import { schedules, logger, tasks } from "@trigger.dev/sdk/v3";
import { createDb } from "@va-hub/db/client";
import { noteslog } from "@va-hub/db/schema";
import { config } from "@va-hub/config";
import { v4 as uuidv4 } from "uuid";
import { eq, desc } from "drizzle-orm";

/**
 * 🕵️ SILENT AUTO-HEALER (WATCHDOG: GOLDILOCKS EDITION)
 * 
 * Pillar 1: Health API Audit (Prefer data-layer truth)
 * Pillar 2: Engine Kickstart (Trigger Harvester - Low Cost)
 * Pillar 3: Vercel Defibrillator (POST Hook - High Cost/Fallback)
 * Pillar 4: Silent Ledger (Write to noteslog)
 */
export const silentWatchdogTask = schedules.task({
  id: "silent-watchdog",
  cron: "*/15 * * * *", 
  maxDuration: 300,
  run: async () => {
    const { db, client } = createDb();
    const siteUrl = process.env.PUBLIC_SITE_URL || "https://va-freelance-hub-web.vercel.app";
    const deployHook = process.env.VERCEL_DEPLOY_HOOK_URL;
    const { slo } = config;
    
    let driftMinutes = 0;
    let actionsTaken: string[] = [];
    let status = "success";
    let metadata: any = {
        timestamp: new Date().toISOString(),
        siteUrl
    };

    try {
      logger.info(`[watchdog] Initiating Goldilocks Audit: ${siteUrl}/api/health`);

      // Pillar 1: Live Edge Audit (Force cache bypass)
      const response = await fetch(`${siteUrl}/api/health?t=${Date.now()}`, {
        headers: { 
          "Cache-Control": "no-cache",
          "User-Agent": "VA-Hub-Watchdog/3.0 (Goldilocks)"
        }
      });
      
      if (!response.ok) {
        throw new Error(`Edge Audit HTTP Error: ${response.status} ${response.statusText}`);
      }
      
      const healthData = await response.json();
      metadata.auditResponse = healthData;
      
      const heartbeat = healthData.vitals?.heartbeat;
      const heartbeatState = heartbeat?.state || "UNKNOWN";
      driftMinutes = Math.round((healthData.vitals?.ingestionStalenessHrs || 0) * 60);
      
      metadata.heartbeatState = heartbeatState;
      metadata.ingestionAgeMinutes = heartbeat?.ingestionAgeMinutes;
      metadata.processingAgeMinutes = heartbeat?.processingAgeMinutes;

      logger.info(`[watchdog] State: ${heartbeatState}. Drift: ${driftMinutes}m. Processing Age: ${heartbeat?.processingAgeMinutes}m.`);

      // Step 2: Cooldown Detection
      const [latestRemediation] = await db.select()
        .from(noteslog)
        .orderBy(desc(noteslog.timestamp))
        .where(eq(noteslog.status, "success"))
        .limit(1);

      let cooldownActive = false;
      if (latestRemediation) {
        const lastActionMs = new Date(latestRemediation.timestamp).getTime();
        const elapsedMin = (Date.now() - lastActionMs) / 60000;
        cooldownActive = elapsedMin < slo.remediation_cooldown_minutes;
        metadata.lastRemediationMinutesAgo = Math.round(elapsedMin);
        
        // Only consider it a relevant cooldown if an actual remediation action was taken
        const wasRealAction = latestRemediation.actionsTaken.includes("ENGINE_KICKSTART") || 
                             latestRemediation.actionsTaken.includes("VERCEL_CACHE_BUST");
        
        if (!wasRealAction) cooldownActive = false;
      }
      metadata.cooldownActive = cooldownActive;

      // Level 2: Regional Remediation (The Goldilocks surgical path)
      const regions = healthData.vitals?.regions || {};
      let remediationTriggers = 0;

      for (const [regionName, regionData] of Object.entries(regions) as any) {
        const isRegionStale = regionData.state === "STALE" || regionData.state === "SUSPECT_HEARTBEAT";
        
        if (isRegionStale && !cooldownActive) {
          logger.warn(`[watchdog] ⚠️ REGIONAL BREACH detected for ${regionName}. Triggering surgical restart.`);
          try {
            await tasks.trigger("harvest-opportunities", { 
              source: `watchdog-recovery-${regionName.toLowerCase()}`,
              region: regionName,
              heartbeatState: regionData.state
            });
            actionsTaken.push(`ENGINE_KICKSTART_${regionName.toUpperCase()}`);
            remediationTriggers++;
          } catch (taskErr: any) {
             logger.error(`[watchdog] Kickstart failed for ${regionName}: ${taskErr.message}`);
             actionsTaken.push(`KICKSTART_${regionName.toUpperCase()}_FAILED`);
          }
        }
      }

      // Level 3: Global Remediation (Fallback / Severe)
      // Only if global heartbeat is STALE or all regional restarts failed
      const needsGlobalHealing = (heartbeatState === "STALE" || driftMinutes > 120) && !cooldownActive;
      
      if (needsGlobalHealing) {
        // If we haven't triggered any specific regional restarts yet, try a global one
        if (remediationTriggers === 0) {
          try {
            await tasks.trigger("harvest-opportunities", { source: "watchdog-global-kickstart" });
            actionsTaken.push("ENGINE_KICKSTART_GLOBAL");
          } catch (err: any) {
            actionsTaken.push("KICKSTART_GLOBAL_FAILED");
          }
        }

        // VERCEL DEFIBRILLATOR (Final fallback)
        if (deployHook && (heartbeatState === "STALE" || actionsTaken.includes("KICKSTART_GLOBAL_FAILED"))) {
          try {
            await fetch(deployHook, { method: "POST" });
            actionsTaken.push("VERCEL_CACHE_BUST");
            logger.info("[watchdog] Vercel cache bust triggered.");
          } catch (hookErr: any) {
            logger.error(`[watchdog] Cache bust failed: ${hookErr.message}`);
            actionsTaken.push("VERCEL_CACHE_BUST_FAILED");
          }
        }
      } else if (cooldownActive && (heartbeatState !== "FRESH" || driftMinutes > 60)) {
        logger.info(`[watchdog] Remediation suppressed by ${slo.remediation_cooldown_minutes}m cooldown.`);
        actionsTaken.push("REMEDIATION_COOLDOWN_ACTIVE");
      } else if (actionsTaken.length === 0) {
        logger.info("[watchdog] System within SLOs. Verification successful.");
        actionsTaken.push("VERIFIED_IDENTITY_FRESH");
      }

    } catch (err: any) {
      status = "failure";
      metadata.criticalError = err.message;
      logger.error(`[watchdog] 🛑 Watchdog failure: ${err.message}`);
    } finally {
      try {
        // Pillar 4: Silent Ledger
        await db.insert(noteslog).values({
          id: uuidv4(),
          driftMinutes,
          actionsTaken: actionsTaken.join(", "),
          status,
          metadata: JSON.stringify(metadata),
          timestamp: new Date()
        });
      } catch (logErr: any) {
        logger.error(`[watchdog] Failed to write to noteslog: ${logErr.message}`);
      }
      await client.close();
    }

    return { driftMinutes, actionsTaken, status };
  },
});
