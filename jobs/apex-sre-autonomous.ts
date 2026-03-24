import { schedules, logger, task } from "@trigger.dev/sdk/v3";
import { execSync } from "child_process";

/**
 * 🛰️ AUTONOMOUS APEX SRE SENTINEL
 * 
 * This job executes the Apex SRE Interrogator Suite on a regular basis.
 * It handles both Hourly (Staleness/Health) and Daily (Performance/Growth) audits.
 * 
 * NEW: [Conditional Burst Mode]
 * If a problem is detected, it triggers a minute-by-minute burst (Max 7) 
 * until the system is healthy.
 */

// 1. CONDITIONAL BURST TASK
export const apexSreBurstTask = task({
  id: "apex-sre-burst",
  run: async (payload: { burstCount: number }) => {
    logger.info(`[apex-sre-burst] Initiating Burst Run #${payload.burstCount}...`);
    
    try {
      // Execute the bun script and capture exit code
      execSync("bun run scripts/apex-sre.ts");
      logger.info("[apex-sre-burst] System Healthy. Terminating Burst.");
      return { status: "RESOLVED" };
    } catch (error: any) {
      const exitCode = error.status;
      logger.warn(`[apex-sre-burst] Run #${payload.burstCount} failed with code ${exitCode}.`);

      if (payload.burstCount < 7) {
        logger.info(`[apex-sre-burst] Triggering next burst in 60s...`);
        await apexSreBurstTask.trigger({ burstCount: payload.burstCount + 1 }, { delay: new Date(Date.now() + 60000) });
        return { status: "BURSTING", count: payload.burstCount };
      } else {
        logger.error("[apex-sre-burst] Burst limit (7) reached. Reverting to standard schedule.");
        return { status: "FAILED_BURST_LIMIT" };
      }
    }
  },
});

// 2. CONSOLIDATED SRE EVOLUTION & HEALTH GUARD (15-Minute Cycle)
export const apexSreTask = schedules.task({
  id: "apex-sre-sentinel",
  cron: "*/15 * * * *", 
  run: async () => {
    const now = new Date();
    const isDailyWindow = now.getHours() === 0 && now.getMinutes() < 15;
    
    logger.info(`[apex-sre] Initiating ${isDailyWindow ? 'Daily Strategic' : '15-Minute Health'} Audit...`);
    
    try {
      execSync("bun run scripts/apex-sre.ts");
      return { status: "HEALTHY", type: isDailyWindow ? "DAILY" : "HEALTH" };
    } catch (error: any) {
      logger.error(`[apex-sre] Issue detected. Initiating 1-minute Burst Mode...`);
      await apexSreBurstTask.trigger({ burstCount: 1 }, { delay: new Date(Date.now() + 60000) });
      return { status: "BURST_INITIATED" };
    }
  },
});
