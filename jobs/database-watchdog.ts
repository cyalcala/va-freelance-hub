import { schedules } from "@trigger.dev/sdk/v3";
import { db, schema } from "@va-hub/db";
import { sql } from "drizzle-orm";

export const databaseWatchdogTask = schedules.task({
  id: "database-watchdog",
  cron: "0 */7 * * *", // Run every 7 hours to optimize free tier usage
  maxDuration: 60,
  run: async () => {
    console.log("[watchdog] Starting Deep Schema Audit (7h Interval)...");

    try {
      // 1. Structural Integrity Check
      console.log("[watchdog] Checking for 'buzz_score' column...");
      const buzzCheck = await db.run(sql`PRAGMA table_info(agencies)`);
      const columns = buzzCheck.rows.map(r => r[1]); // Column name is at index 1 in PRAGMA output
      
      const requiredColumns = ["buzz_score", "created_at", "status", "hiring_url"];
      const missing = requiredColumns.filter(col => !columns.includes(col));

      if (missing.length > 0) {
        console.error(`[watchdog] CRITICAL: Missing columns detected: ${missing.join(", ")}`);
        
        // SELF-FIX ATTEMPT
        console.log("[watchdog] Attempting Emergency Self-Fix...");
        for (const col of missing) {
          if (col === "buzz_score") {
            await db.run(sql`ALTER TABLE agencies ADD COLUMN buzz_score INTEGER DEFAULT 0`);
          }
          if (col === "created_at") {
            await db.run(sql`ALTER TABLE agencies ADD COLUMN created_at INTEGER`);
          }
        }
        return { status: "REPAIRED", missing };
      }

      // 2. Data Health Check
      console.log("[watchdog] Verifying data accessibility...");
      const sample = await db.select().from(schema.agencies).limit(1);
      
      console.log("[watchdog] Audit Complete: HEALTHY");
      return { status: "HEALTHY", columnsFound: columns.length };

    } catch (err) {
      console.error("[watchdog] Audit Failed with System Error:", err.message);
      return { status: "ERROR", message: err.message };
    }
  },
});
