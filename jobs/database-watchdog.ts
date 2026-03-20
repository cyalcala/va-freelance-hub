import { schedules } from "@trigger.dev/sdk/v3";
import { createDb } from "./lib/db";
import { sql } from "drizzle-orm";

export const databaseWatchdogTask = schedules.task({
  id: "database-watchdog",
  cron: "0 */7 * * *", // Run every 7 hours to optimize free tier usage
  maxDuration: 60,
  run: async () => {
    console.log("[watchdog] Starting Deep Schema Audit (7h Interval)...");

    const db = createDb();

    try {
      // 1. Structural Integrity Check
      const buzzCheck = await db.run(sql`PRAGMA table_info(agencies)`);
      const columns = buzzCheck.rows.map((r: any) => r[1]);
      
      const requiredColumns = ["buzz_score", "created_at", "hiring_heat", "friction_level"];
      const missing = requiredColumns.filter(col => !columns.includes(col));

      if (missing.length > 0) {
        console.error(`[watchdog] CRITICAL: Missing columns detected: ${missing.join(", ")}`);
        
        for (const col of missing) {
          try {
            if (col === "buzz_score") await db.run(sql`ALTER TABLE agencies ADD COLUMN buzz_score INTEGER DEFAULT 0`);
            if (col === "created_at") await db.run(sql`ALTER TABLE agencies ADD COLUMN created_at INTEGER`);
            if (col === "hiring_heat") await db.run(sql`ALTER TABLE agencies ADD COLUMN hiring_heat INTEGER DEFAULT 1`);
            if (col === "friction_level") await db.run(sql`ALTER TABLE agencies ADD COLUMN friction_level INTEGER DEFAULT 3`);
          } catch { /* column might already exist */ }
        }
        return { status: "REPAIRED", missing };
      }

      // 2. Data Health Check
      const agencyCount = await db.run(sql`SELECT COUNT(*) as cnt FROM agencies`);
      const oppCount = await db.run(sql`SELECT COUNT(*) as cnt FROM opportunities`);
      
      // 3. Feed Integrity Check (Live URL)
      const feedUrl = "https://va-freelance-hub-web.vercel.app";
      try {
        const response = await fetch(`${feedUrl}?v=${Date.now()}`);
        const html = await response.text();
        if (html.includes("No matching signals found.")) {
          console.error("[watchdog] CRITICAL: Feed is EMPTY on production!");
          return { status: "FEED_EMPTY", url: feedUrl };
        }
        console.log("[watchdog] Feed Integrity: OK");
      } catch (err) {
        console.warn("[watchdog] Feed URL unreachable:", (err as Error).message);
      }

      console.log(`[watchdog] Agencies: ${agencyCount.rows[0]?.[0]}, Opportunities: ${oppCount.rows[0]?.[0]}`);
      console.log("[watchdog] Audit Complete: HEALTHY");
      return { status: "HEALTHY", columnsFound: columns.length };

    } catch (err) {
      console.error("[watchdog] Audit Failed:", (err as Error).message);
      return { status: "ERROR", message: (err as Error).message };
    }
  },
});
