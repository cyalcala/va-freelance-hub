import { schedules } from "@trigger.dev/sdk/v3";
import { createDb } from "./lib/db";
import { sql } from "drizzle-orm";

export const verifyDirectoryTask = schedules.task({
  id: "verify-directory",
  cron: "0 7 * * 1", // every Monday 7am UTC
  maxDuration: 180,
  run: async () => {
    console.log("[verify-directory] Checking agency entries...");
    const db = createDb();

    const entries = await db.all(
      sql`SELECT id, name, hiring_url FROM agencies WHERE hiring_url IS NOT NULL`
    ) as { id: string; name: string; hiring_url: string }[];

    console.log(`[verify-directory] Checking ${entries.length} entries...`);
    let verified = 0, failed = 0;

    for (const entry of entries) {
      if (!entry.hiring_url) continue;
      
      try {
        const res = await fetch(entry.hiring_url, { 
          method: "GET", 
          signal: AbortSignal.timeout(15_000), 
          redirect: "follow",
          headers: { "User-Agent": "Mozilla/5.0 (compatible; va-hub-verifier/1.2; +https://va-index.com)" }
        });

        // Some sites block programmatic access (403). We shouldn't penalize them to 'quiet' immediately if it's just Cloudflare blocking us.
        if (res.status === 403 || res.status === 401) {
          console.log(`[verify-directory] Blocked (Security): ${entry.name} - ${res.status}`);
          continue; // Leave status untouched
        }

        const finalUrl = res.url.toLowerCase();
        const originalUrl = entry.hiring_url.toLowerCase();
        // If they redirected a specific /careers path back to their homepage / it means the role is closed.
        const isHomepageRedirect = finalUrl.length < 30 && finalUrl !== originalUrl && (finalUrl.endsWith("/") || !finalUrl.includes("job"));

        const html = (await res.text()).toLowerCase();
        const recruitmentKeywords = ["apply", "career", "job", "hiring", "portal", "opportunity", "opening", "resume", "cv"];
        const hasRecruitmentSignal = recruitmentKeywords.some(kw => html.includes(kw));

        if (res.ok && hasRecruitmentSignal && !isHomepageRedirect) {
          await db.run(sql`UPDATE agencies SET status = 'active', verified_at = ${Math.floor(Date.now() / 1000)} WHERE id = ${entry.id}`);
          verified++;
        } else { 
          console.log(`[verify-directory] Fakery/Mismatch/Dead: ${entry.name}`);
          // actively downgrade them on the site so they lose the "Hiring Now" flame badge.
          await db.run(sql`UPDATE agencies SET status = 'quiet' WHERE id = ${entry.id}`);
          failed++; 
        }
      } catch (err) {
        console.log(`[verify-directory] Link Failed (Network/Timeout): ${entry.name} - ${(err as Error).message}`);
        // don't immediately penalize on a network error, they might just be down for 5 mins
      }
    }

    console.log(`[verify-directory] verified=${verified} failed=${failed}`);
    return { checked: entries.length, verified, failed };
  },
});
