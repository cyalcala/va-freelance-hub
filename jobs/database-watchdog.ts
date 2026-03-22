import { schedules } from "@trigger.dev/sdk/v3";
import { createDb } from "./lib/db";
import { sql } from "drizzle-orm";

export const databaseWatchdogTask = schedules.task({
  id: "database-watchdog",
  cron: "0 */7 * * *", // Run every 7 hours to optimize free tier usage
  maxDuration: 60,
  run: async () => {
    console.log("[watchdog] Starting Deep Schema Audit (7h Interval)...");

    const db = await createDb();

    try {
      // 1. Structural Integrity Check
      const buzzCheck = await db.run(sql`PRAGMA table_info(agencies)`);
      const columns = buzzCheck.rows.map((r: any) => r[1]);
      
      const requiredColumns = ["buzz_score", "created_at", "hiring_heat", "friction_level"];
      const missing = requiredColumns.filter(col => !columns.includes(col));

      if (missing.length > 0) {
        console.error(`[watchdog] CRITICAL: Missing columns detected: ${missing.join(", ")}`);
        
        // Optimize: Send all ALTER TABLE statements concurrently.
        // This avoids the N+1 sequential waterfall.
        // Using Promise.allSettled preserves the error isolation of the original code,
        // so if one column modification fails (e.g. already exists), the rest still succeed.
        const promises = missing.map(async (col) => {
          if (col === "buzz_score") return db.run(sql`ALTER TABLE agencies ADD COLUMN buzz_score INTEGER DEFAULT 0`);
          if (col === "created_at") return db.run(sql`ALTER TABLE agencies ADD COLUMN created_at INTEGER`);
          if (col === "hiring_heat") return db.run(sql`ALTER TABLE agencies ADD COLUMN hiring_heat INTEGER DEFAULT 1`);
          if (col === "friction_level") return db.run(sql`ALTER TABLE agencies ADD COLUMN friction_level INTEGER DEFAULT 3`);
        });

        if (promises.length > 0) {
          await Promise.allSettled(promises);
        }

        return { status: "REPAIRED", missing };
      }

      // ====== TRIGGER.DEV PIPELINE VERSION CHECK ======
      // Monitor version staleness after deployments
      try {
        const tasksResponse = await fetch("https://api.trigger.dev/api/v3/tasks", {
          headers: { "Authorization": `Bearer ${process.env.TRIGGER_SECRET_KEY}` }
        });
        if (tasksResponse.ok) {
          const tasks = await tasksResponse.json();
          const harvest = tasks.data?.find((t: any) => t.slug === "harvest-opportunities");
          if (harvest) {
            console.log("VERSION_CHECK", {
              currentVersion: harvest.currentVersion,
              checkedAt: new Date().toISOString()
            });
          }
        }
      } catch (e) {
        console.error("Failed to fetch Trigger.dev task version", e);
      }

      // ====== DATABASE HEALTH PIPELINE ======
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

      // 4. Schedule Health Check
      try {
        const scheduleRes = await fetch(
          "https://api.trigger.dev/api/v1/schedules",
          {
            headers: {
              "Authorization": `Bearer ${process.env.TRIGGER_SECRET_KEY}`
            }
          }
        );
        const schedules = await scheduleRes.json();
        const harvest = schedules.data?.find(
          (s: any) => s.task === "harvest-opportunities" || s.task?.identifier === "harvest-opportunities"
        );
        
        if (!harvest) {
          console.error("[watchdog] SCHEDULE_MISSING: harvest-opportunities not found in cloud");
        } else if (!harvest.lastRun) {
          console.error("[watchdog] SCHEDULE_NEVER_RUN: triggering manual recovery run");
          await fetch(
            "https://api.trigger.dev/api/v1/tasks/harvest-opportunities/trigger",
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${process.env.TRIGGER_SECRET_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ payload: {} })
            }
          );
        } else {
          const lastRunTs = new Date(harvest.lastRun);
          const hrsAgo = (Date.now() - lastRunTs.getTime()) / 3600000;
          if (hrsAgo > 1) {
            console.warn(`[watchdog] SCHEDULE_STALE: ${hrsAgo.toFixed(1)} hrs ago. Triggering recovery.`);
            await fetch(
              "https://api.trigger.dev/api/v1/tasks/harvest-opportunities/trigger",
              {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${process.env.TRIGGER_SECRET_KEY}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({ payload: {} })
              }
            );
          } else {
            console.log("[watchdog] SCHEDULE_HEALTHY");
          }
        }
      } catch (err: any) {
        console.warn("[watchdog] Schedule health check failed:", err.message);
      }

      // ====== 5. AUTOMATED MAINTENANCE (AUDIT V4.0) ======
      console.log("[watchdog] Starting Automated Maintenance Purge...");
      
      // P0: Purge Saturated Fingerprints
      const purgeInactive = await db.run(sql`
        DELETE FROM opportunities 
        WHERE is_active = 0 
        AND scraped_at < unixepoch('now', '-60 days')
      `);
      
      const purgeTier4 = await db.run(sql`
        DELETE FROM opportunities 
        WHERE (tier = 4 OR tier IS NULL)
        AND scraped_at < unixepoch('now', '-7 days')
      `);

      // P1: Deactivate Temporal Inversions (Zombies)
      const deactivateZombies = await db.run(sql`
        UPDATE opportunities 
        SET is_active = 0 
        WHERE is_active = 1 
        AND posted_at IS NOT NULL 
        AND posted_at > 0 
        AND posted_at < unixepoch('now', '-21 days')
      `);

      console.log(`[watchdog] Maintenance: Purged Inactive: ${purgeInactive.rowsAffected || 0}, Purged Tier4: ${purgeTier4.rowsAffected || 0}, Deactivated Zombies: ${deactivateZombies.rowsAffected || 0}`);

      console.log(`[watchdog] Agencies: ${agencyCount.rows[0]?.[0]}, Opportunities: ${oppCount.rows[0]?.[0]}`);
      console.log("[watchdog] Audit Complete: HEALTHY");
      return { status: "HEALTHY", columnsFound: columns.length };

    } catch (err) {
      console.error("[watchdog] Audit Failed:", (err as Error).message);
      return { status: "ERROR", message: (err as Error).message };
    }
  },
});
