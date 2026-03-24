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

// 2. 15-MINUTE EVOLUTION & HEALTH GUARD (Trigger)
export const fifteenMinSreTask = schedules.task({
  id: "apex-sre-15min",
  cron: "*/15 * * * *", 
  run: async () => {
    logger.info("[apex-sre] Initiating Hourly Autonomous Health Audit...");
    try {
      execSync("bun run scripts/apex-sre.ts");
      return { status: "HEALTHY" };
    } catch (error: any) {
      logger.error(`[apex-sre] Issue detected. Initiating 1-minute Burst Mode...`);
      await apexSreBurstTask.trigger({ burstCount: 1 }, { delay: new Date(Date.now() + 60000) });
      return { status: "BURST_INITIATED" };
    }
  },
});

// 3. DAILY PERFORMANCE & GROWTH STRATEGY
export const dailySreTask = schedules.task({
  id: "apex-sre-daily",
  cron: "30 0 * * *", 
  run: async () => {
    logger.info("[apex-sre] Initiating Daily Strategic Performance & Growth Audit...");
    try {
      execSync("bun run scripts/apex-sre.ts");
      return { status: "SUCCESS" };
    } catch (error: any) {
      logger.error(`[apex-sre] Daily Audit Issue: ${error.message}`);
      await apexSreBurstTask.trigger({ burstCount: 1 }, { delay: new Date(Date.now() + 60000) });
      return { status: "BURST_INITIATED" };
    }
  },
});
