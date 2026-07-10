import type { APIRoute } from "astro";
import { getDb, opportunities } from "@va-hub/db";
import { eq, sql, inArray, asc } from "drizzle-orm";
import { chunkArray } from "@va-hub/scraper";
import { daysAgoUtcIso, nowUtcIso } from "@/lib/time";
import { isAuthorized } from "@/lib/auth";

// D1 rejects statements binding >100 parameters. The archive UPDATE binds
// (2 SET params + N ids); batch-bumped lastSeenInFeedAt means 100+ rows from a
// dead source cross the 30-day cutoff in the same run, so N must be chunked or
// the entire verifier pipeline throws and wedges (same class as the 2026-07-04
// S-1 fetch-event fix). 90 keeps 90 + 2 comfortably under 100.
const ARCHIVE_ID_BATCH = 90;

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  console.log("[api/cron/verify-links] Starting verification...");
  
  const env = locals.runtime.env as any;
  const db = getDb(env);
  const startedAt = nowUtcIso();

  // Rate-limit before auth so the shared secret cannot be brute-forced at
  // unlimited speed. No-op if the binding is absent.
  const rateLimiter = env?.API_RATE_LIMITER;
  if (rateLimiter) {
    const clientIp = request.headers.get("cf-connecting-ip") || "unknown";
    const { success } = await rateLimiter.limit({ key: `verify-links:${clientIp}` });
    if (!success) {
      return new Response("Too Many Requests", { status: 429 });
    }
  }

  // Constant-time shared-secret check (supports Bearer and x-cron-secret).
  if (!isAuthorized(request, env?.PROXY_SECRET || env?.CRON_SECRET)) {
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
      for (const batch of chunkArray(stale.map(s => s.id), ARCHIVE_ID_BATCH)) {
        await db.update(opportunities)
          .set({ isActive: false, updatedAt: startedAt })
          .where(inArray(opportunities.id, batch));
      }
      console.log(`[api/cron/verify-links] Auto-archived ${stale.length} stale jobs older than 30 days`);
    }

    // 2. Verify remaining active links.
    // 2026-07-04 audit: at 50 links per run, twice a day, the queue could
    // never drain (456 active rows had never been verified against ~30+ new
    // rows arriving daily). 120 per run keeps the request bounded (HEAD only,
    // 8s timeout, batches of 10) while letting the backlog shrink.
    const VERIFY_LIMIT = 120;
    const active = await db
      .select({
        id: opportunities.id,
        sourceUrl: opportunities.sourceUrl,
        failedCount: opportunities.failedVerificationCount
      })
      .from(opportunities)
      .where(eq(opportunities.isActive, true))
      .orderBy(asc(opportunities.lastVerifiedAt))
      .limit(VERIFY_LIMIT);

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
                // Atomic increment (not JS read-modify-write from the run-start
                // snapshot) so overlapping runs cannot lose a strike.
                await db.update(opportunities).set({ failedVerificationCount: sql`${opportunities.failedVerificationCount} + 1`, lastVerifiedAt: checkedAt, updatedAt: checkedAt }).where(eq(opportunities.id, id));
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

    // Surface the verification backlog so the workflow summary shows whether
    // the queue is draining instead of silently growing.
    let neverVerifiedRemaining = -1;
    try {
      const backlog = await db.select({ count: sql<number>`COUNT(*)` })
        .from(opportunities)
        .where(sql`${opportunities.isActive} = 1 AND ${opportunities.lastVerifiedAt} IS NULL`);
      neverVerifiedRemaining = backlog[0]?.count ?? -1;
    } catch (err) {
      console.warn("[api/cron/verify-links] Failed to compute never-verified backlog:", (err as Error).message);
    }

    console.log(`[api/cron/verify-links] Completed. Checked ${active.length}, auto-archived ${stale.length}, deactivated ${deactivated} dead links, never-verified backlog: ${neverVerifiedRemaining}.`);
    return new Response(JSON.stringify({ checked: active.length, autoArchived: stale.length, deactivated, neverVerifiedRemaining }), {
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
