import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createDb } from "@va-hub/db/client";
import { sql } from "drizzle-orm";
import { opportunities, logs } from "@va-hub/db/schema";
import { v4 as uuidv4 } from "uuid";

export const databaseWatchdogTask = schedules.task({
  id: "database-watchdog",
  cron: "0 0 * * *", // Daily purification at midnight
  maxDuration: 300, 
  run: async () => {
    const { db, client } = createDb();
    try {
      logger.info("[watchdog] ══ Initiating Data Purification & Governance ══");
      
      const nowMs = Date.now();
      const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

      // 1. Hard-delete "Trash" tier after 7 days
      const purgeTrash = await db.run(sql`
        DELETE FROM opportunities 
        WHERE (tier = 4 OR tier IS NULL) 
        AND scraped_at < ${nowMs - SEVEN_DAYS_MS}
      `);

      // 2. Soft-delete/Deactivate "Watermelons" with Tiered Retention
      // Platinum (0): 7 Days | Gold (1): 4 Days | Silver (2): 48h | Others: 24h
      const deactivateWatermelons = await db.run(sql`
        UPDATE opportunities 
        SET is_active = 0 
        WHERE is_active = 1 
        AND scraped_at < CASE 
          WHEN tier = 0 THEN ${nowMs - 168 * 3600 * 1000}
          WHEN tier = 1 THEN ${nowMs - 96 * 3600 * 1000}
          WHEN tier = 2 THEN ${nowMs - 48 * 3600 * 1000}
          ELSE ${nowMs - 24 * 3600 * 1000}
        END
      `);

      // 3. Final Purge of Inactive dead-weight (60 days)
      const finalPurge = await db.run(sql`
        DELETE FROM opportunities 
        WHERE is_active = 0 
        AND scraped_at < ${nowMs - SIXTY_DAYS_MS}
      `);

      await db.insert(logs).values({
        id: uuidv4(),
        message: `System Governance Complete: Purged ${purgeTrash.rowsAffected + finalPurge.rowsAffected} rows; Deactivated ${deactivateWatermelons.rowsAffected} watermelons.`,
        level: "info",
        timestamp: new Date()
      });

      logger.info("[watchdog] Data Purification Complete.", {
        purgedTrash: purgeTrash.rowsAffected,
        deactivated: deactivateWatermelons.rowsAffected,
        finalPurged: finalPurge.rowsAffected
      });
      
      return { status: "GOVERNANCE_COMPLETE" };
    } catch (err) {
      logger.error("[watchdog] Purification Failed:", { error: (err as Error).message });
      return { status: "PURIFICATION_FAILED" };
    } finally {
      await client.close();
    }
  },
});

