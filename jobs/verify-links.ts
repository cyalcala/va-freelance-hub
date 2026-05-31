
import { eq, sql } from "drizzle-orm";
import { db, opportunities } from "@va-hub/db";

export async function verifyLinks() {
    const stale = await db.select({ id: opportunities.id })
      .from(opportunities)
      .where(sql`${opportunities.isActive} = 1 AND COALESCE(${opportunities.lastSeenInFeedAt}, ${opportunities.scrapedAt}) < datetime('now', '-30 days')`);
    
    if (stale.length > 0) {
      await db.update(opportunities)
        .set({ isActive: false })
        .where(sql`${opportunities.isActive} = 1 AND COALESCE(${opportunities.lastSeenInFeedAt}, ${opportunities.scrapedAt}) < datetime('now', '-30 days')`);
      console.log(`[verify-links] Auto-archived ${stale.length} stale jobs`);
    }

    const active = await db
      .select({ 
        id: opportunities.id, 
        sourceUrl: opportunities.sourceUrl,
        failedVerificationCount: opportunities.failedVerificationCount
      })
      .from(opportunities)
      .where(eq(opportunities.isActive, true));

    console.log(`[verify-links] Checking ${active.length} links...`);
    let deactivated = 0;

    for (let i = 0; i < active.length; i += 10) {
      const results = await Promise.allSettled(
        active.slice(i, i + 10).map(async ({ id, sourceUrl, failedVerificationCount }) => {
          let isClosed = false;
          let isTransientError = false;

          try {
            const res = await fetch(sourceUrl, { method: "HEAD", signal: AbortSignal.timeout(8_000), redirect: "follow" });
            if (res.status === 404 || res.status === 410) {
              isClosed = true;
            } else if (res.ok) {
              const finalUrl = new URL(res.url);
              const originalUrl = new URL(sourceUrl);
              
              if (finalUrl.hostname !== originalUrl.hostname) {
                isClosed = true;
              } else if (finalUrl.pathname === '/' || finalUrl.pathname === '/jobs' || finalUrl.pathname === '/vacancies') {
                isClosed = true;
              }
            } else {
              isTransientError = true;
            }
          } catch {
            isTransientError = true;
          }

          if (isClosed) {
            await db.update(opportunities).set({ isActive: false }).where(eq(opportunities.id, id));
            console.log(`[verify-links] Deactivated (Closed): ${sourceUrl}`);
            return 1;
          } else if (isTransientError) {
            const currentCount = failedVerificationCount ?? 0;
            if (currentCount >= 2) { // 3rd failure (0, 1, 2)
              await db.update(opportunities).set({ isActive: false }).where(eq(opportunities.id, id));
              console.log(`[verify-links] Deactivated (Transient Threshold): ${sourceUrl}`);
              return 1;
            } else {
              await db.update(opportunities).set({ failedVerificationCount: currentCount + 1 }).where(eq(opportunities.id, id));
            }
          } else {
            if ((failedVerificationCount ?? 0) > 0) {
              await db.update(opportunities).set({ failedVerificationCount: 0 }).where(eq(opportunities.id, id));
            }
          }
          return 0;
        })
      );
      deactivated += results.reduce((sum, r) => (r.status === "fulfilled" ? sum + (r.value as number) : sum), 0);
    }

    console.log(`[verify-links] Deactivated ${deactivated}`);
    return { checked: active.length, autoArchived: stale.length, deactivated };
}