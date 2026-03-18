import { schedules } from "@trigger.dev/sdk/v3";
import { createDb, opportunities } from "./lib/db";
import { eq, sql } from "drizzle-orm";

/**
 * Smart Link Verifier
 * 
 * Only checks links that:
 * - Are older than 7 days (new links don't go stale that fast)
 * - Are NOT from Reddit/HN (those links don't expire)
 * - Limits to 50 checks per run to stay lean
 */
export const verifyLinksTask = schedules.task({
  id: "verify-links",
  cron: "0 6 * * *", // daily 6am UTC
  maxDuration: 120,
  run: async () => {
    console.log("[verify-links] Starting smart link verification...");
    const db = createDb();

    // Only check non-Reddit/HN links older than 7 days, limit to 50
    const sevenDaysAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
    const active = await db.all(
      sql`SELECT id, source_url, source_platform FROM opportunities 
          WHERE is_active = 1 
            AND scraped_at < ${sevenDaysAgo}
            AND source_platform NOT IN ('HackerNews', 'Reddit r/forhire', 'Reddit r/remotejobs', 'Reddit r/phcareers', 'Reddit r/VirtualAssistant')
          LIMIT 50`
    ) as { id: string; source_url: string; source_platform: string }[];

    console.log(`[verify-links] Checking ${active.length} links (skipped Reddit/HN, <7d)...`);
    let deactivated = 0;

    for (let i = 0; i < active.length; i += 10) {
      const batch = active.slice(i, i + 10);
      await Promise.allSettled(
        batch.map(async ({ id, source_url }) => {
          try {
            const res = await fetch(source_url, {
              method: "HEAD", // HEAD is lighter than GET
              signal: AbortSignal.timeout(8_000),
              redirect: "follow",
              headers: { "User-Agent": "VA.INDEX/1.0 (link-verifier)" },
            });

            if (res.status === 404 || res.status === 410 || res.status === 403) {
              await db.run(sql`UPDATE opportunities SET is_active = 0 WHERE id = ${id}`);
              deactivated++;
            }
          } catch {
            // Network errors are not deactivation — could be temporary
          }
        })
      );
    }

    console.log(`[verify-links] Done. Deactivated ${deactivated} dead links.`);
    return { checked: active.length, deactivated };
  },
});
