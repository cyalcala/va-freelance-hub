import { schedules } from "@trigger.dev/sdk/v3";
import { execSync } from "child_process";
import { logger } from "@trigger.dev/sdk/v3";

/**
 * 🔒 AUTOMATED SNAPSHOT ENGINE
 * 
 * Creates a "Mythical Restore Point" every 24 hours.
 * This captures the entire database state and locks it to a named snapshot.
 */
export const backupSnapshotTask = schedules.task({
  id: "backup-snapshot",
  cron: "0 0 * * *", // Daily at Midnight
  maxDuration: 120,
  run: async () => {
    logger.info("[snapshot] Initiating Automated Backup...");
    
    try {
      // We use the existing save.ts script with the --automated flag
      // which skips Git commit/tagging (since Trigger.dev doesn't have Git write access)
      const output = execSync("bun run scripts/save.ts --automated --msg 'Scheduled Trigger.dev Backup'").toString();
      logger.info("[snapshot] Success:", { output });
      
      return { success: true, message: "Snapshot created successfully." };
    } catch (err) {
      logger.error("[snapshot] Failed:", { error: (err as Error).message });
      throw err;
    }
  },
});
