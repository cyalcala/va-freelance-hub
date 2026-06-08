import type { APIRoute } from "astro";
import { getDb, opportunities } from "@va-hub/db";
import { eq, sql, inArray, asc } from "drizzle-orm";
import { daysAgoUtcIso, nowUtcIso } from "@/lib/time";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  console.log("[api/cron/verify-links] Starting verification...");
  
  const env = locals.runtime.env as any;
  const db = getDb(env);
  const startedAt = nowUtcIso();

  // Authorization Check — supports both header formats and env var names for compatibility
  const proxySecret = env?.PROXY_SECRET || env?.CRON_SECRET;
  const authHeader = request.headers.get("Authorization");
  const cronSecretHeader = request.headers.get("x-cron-secret");
  const providedSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : cronSecretHeader;
  if (!proxySecret || !providedSecret || providedSecret !== proxySecret) {
    console.warn("[api/cron/verify-links] Unauthorized access attempt");
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // 1. Auto-archive stale jobs that haven't been seen in feeds for 30 days
    const staleCutoff = daysAgoUtcIso(30);
    const stale = await db.select({ id: opportunities.id })
      .from(opportunities)
      .where(sql`${opportunities.isActive} = 1 AND unixepoch(COALESCE(${opportunities.lastSeenInFeedAt}, ${opportunities.scrapedAt})) < unixepoch(${staleCutoff})`);
      
    if (stale.length > 0) {
      await db.update(opportunities)
        .set({ isActive: false, updatedAt: startedAt })
        .where(inArray(opportunities.id, stale.map(s => s.id)));
      console.log(`[api/cron/verify-links] Auto-archived ${stale.length} stale jobs older than 30 days`);
    }

    // 2. Verify remaining active links
    const active = await db
      .select({ 
        id: opportunities.id, 
        sourceUrl: opportunities.sourceUrl,
        failedCount: opportunities.failedVerificationCount
      })
      .from(opportunities)
      .where(eq(opportunities.isActive, true))
      .orderBy(asc(opportunities.lastVerifiedAt))
      .limit(50);

    console.log(`[api/cron/verify-links] Checking ${active.length} oldest unverified links...`);
    let deactivated = 0;

    // Check in batches of 10
    for (let i = 0; i < active.length; i += 10) {
      const batch = active.slice(i, i + 10);
      const results = await Promise.allSettled(
        batch.map(async ({ id, sourceUrl, failedCount }) => {
          try {
            const res = await fetch(sourceUrl, {
              method: "HEAD",
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              },
              signal: AbortSignal.timeout(8_000),
              redirect: "follow",
            });
            
            if (res.status === 404 || res.status === 410 || res.status === 403 || res.status === 401) {
              const newFailCount = (failedCount || 0) + 1;
              const checkedAt = nowUtcIso();
              if (newFailCount >= 3) {
                await db.update(opportunities).set({ isActive: false, lastVerifiedAt: checkedAt, updatedAt: checkedAt }).where(eq(opportunities.id, id));
                console.log(`[api/cron/verify-links] Deactivated: ${sourceUrl} (failed 3 times)`);
                return 1;
              } else {
                await db.update(opportunities).set({ failedVerificationCount: newFailCount, lastVerifiedAt: checkedAt, updatedAt: checkedAt }).where(eq(opportunities.id, id));
                console.log(`[api/cron/verify-links] Transient error (${res.status}): ${sourceUrl} (strike ${newFailCount})`);
              }
            } else {
              // Success! Reset fail count and update verified timestamp
              const checkedAt = nowUtcIso();
              await db.update(opportunities).set({ failedVerificationCount: 0, lastVerifiedAt: checkedAt, updatedAt: checkedAt }).where(eq(opportunities.id, id));
            }
          } catch (err) {
            // Log warning but don't deactivate on network issues or timeouts to avoid false positives
            console.warn(`[api/cron/verify-links] Failed checking ${sourceUrl}:`, (err as Error).message);
          }
          return 0;
        })
      );

      deactivated += results.reduce((sum, r) => (r.status === "fulfilled" ? sum + r.value : sum), 0);
    }

    console.log(`[api/cron/verify-links] Completed. Checked ${active.length}, auto-archived ${stale.length}, deactivated ${deactivated} dead links.`);
    return new Response(JSON.stringify({ checked: active.length, autoArchived: stale.length, deactivated }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("[api/cron/verify-links] Error during link verification:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
