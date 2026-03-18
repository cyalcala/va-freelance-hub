import { schedules } from "@trigger.dev/sdk/v3";
import { db, schema } from "@va-hub/db";
import { eq } from "drizzle-orm";

export const verifyLinksTask = schedules.task({
  id: "verify-links",
  cron: "0 6 * * *", // daily 6am UTC
  maxDuration: 300,
  run: async () => {
    console.log("[verify-links] Checking opportunity links...");
    const active = await db
      .select({ id: schema.opportunities.id, sourceUrl: schema.opportunities.sourceUrl })
      .from(schema.opportunities)
      .where(eq(schema.opportunities.isActive, true));

    console.log(`[verify-links] Checking ${active.length} links...`);
    let deactivated = 0;

    for (let i = 0; i < active.length; i += 10) {
      const batch = active.slice(i, i + 10);
      await Promise.allSettled(
        batch.map(async ({ id, sourceUrl }) => {
          try {
            const res = await fetch(sourceUrl, { 
              method: "HEAD", 
              signal: AbortSignal.timeout(8_000), 
              redirect: "follow",
              headers: { "User-Agent": "Mozilla/5.0 (compatible; va-hub-verifier/1.0)" }
            });
            if (res.status === 404 || res.status === 410) {
              await db.update(schema.opportunities)
                .set({ isActive: false })
                .where(eq(schema.opportunities.id, id));
              deactivated++;
            }
          } catch {}
        })
      );
    }

    console.log(`[verify-links] Deactivated ${deactivated}`);
    return { checked: active.length, deactivated };
  },
});
