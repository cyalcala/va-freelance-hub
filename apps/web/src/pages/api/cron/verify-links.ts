import type { APIRoute } from "astro";
import { getDb, opportunities } from "@va-hub/db";
import { eq, sql, inArray } from "drizzle-orm";
import { chunkArray, classifyLinkResponse, linkCheckHeaders, sanitizeSourceUrl, scanLandingPageForGeoLock } from "@va-hub/scraper";
import { daysAgoUtcIso, nowUtcIso } from "@/lib/time";
import { isAuthorized } from "@/lib/auth";
import {
  buildVerifierFailureUpdate,
  buildVerifierSelectionQuery,
  summarizeVerifierAttempts,
  type VerifierAttemptResult,
} from "@/lib/verifier-attempt";

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
          .set({ isActive: false, inactiveReason: "stale-feed", updatedAt: startedAt })
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
    const active = await db.all<{ id: number; sourceUrl: string; failedCount: number }>(
      buildVerifierSelectionQuery(VERIFY_LIMIT),
    );

    console.log(`[api/cron/verify-links] Checking ${active.length} oldest unverified links...`);
    let deactivated = 0;
    let attempted = 0;
    let succeeded = 0;
    let failedChecks = 0;
    // Geo masterplan L4: a budget of each run's link checks are upgraded from
    // HEAD to GET so the landing page's visible text can be scanned for
    // disqualifiers our 1500-char stored description can't show (non-English
    // page, residence locks). Rows rotate through lastVerifiedAt ordering, so
    // the whole board gets page-scanned over time — drift detection included.
    const DEEP_SCAN_BUDGET = 15;
    let geoPageDeactivated = 0;

    // Check in batches of 10
    for (let i = 0; i < active.length; i += 10) {
      const batch = active.slice(i, i + 10);
      const results = await Promise.allSettled(
        batch.map(async ({ id, sourceUrl, failedCount }, batchIndex) => {
          const deepScan = i + batchIndex < DEEP_SCAN_BUDGET;
          const safeSourceUrl = sanitizeSourceUrl(sourceUrl);
          if (!safeSourceUrl) {
            const checkedAt = nowUtcIso();
            await db.update(opportunities).set({
              isActive: false,
              inactiveReason: "invalid-source-url",
              lastVerifiedAt: checkedAt,
              updatedAt: checkedAt,
            }).where(eq(opportunities.id, id));
            console.warn(`[api/cron/verify-links] Deactivated #${id}: invalid stored source URL`);
            return { deactivated: 1, succeeded: true } satisfies VerifierAttemptResult;
          }
          try {
            const res = await fetch(safeSourceUrl, {
              method: deepScan ? "GET" : "HEAD",
              // Browser identity is deliberate here: this request asks "would
              // a job seeker clicking this link still reach the posting?", so
              // it stands in for their browser. See packages/scraper/userAgent.ts.
              headers: linkCheckHeaders(),
              signal: AbortSignal.timeout(8_000),
              redirect: "follow",
            });

            // Deep scan on a live page: the application page is the ground
            // truth for geo-eligibility. Conservative signals only.
            if (deepScan && res.ok) {
              try {
                const html = (await res.text()).slice(0, 200_000);
                const geoLock = scanLandingPageForGeoLock(html);
                if (geoLock) {
                  const checkedAt = nowUtcIso();
                  await db.update(opportunities).set({
                    isActive: false,
                    inactiveReason: "policy-rejected",
                    phEligibility: "ineligible",
                    geoEvidence: `Verifier page scan: ${geoLock.slice(0, 250)}`,
                    geoCheckedAt: checkedAt,
                    lastVerifiedAt: checkedAt,
                    updatedAt: checkedAt,
                  }).where(eq(opportunities.id, id));
                  geoPageDeactivated += 1;
                  console.log(`[api/cron/verify-links] Geo page-scan deactivated #${id}: ${geoLock}`);
                  return { deactivated: 1, succeeded: true } satisfies VerifierAttemptResult;
                }
              } catch (scanErr) {
                // Scan failures must never fail link verification itself.
                console.warn(`[api/cron/verify-links] Page scan failed for #${id}:`, (scanErr as Error).message);
              }
            }

            const verdict = classifyLinkResponse(res.status, "");
            if (verdict.isHardDead) {
              const newFailCount = (failedCount || 0) + 1;
              const checkedAt = nowUtcIso();
              if (newFailCount >= 3) {
                await db.update(opportunities).set({
                  isActive: false,
                  inactiveReason: "link-unavailable",
                  lastVerifiedAt: checkedAt,
                  updatedAt: checkedAt,
                }).where(eq(opportunities.id, id));
                console.log(`[api/cron/verify-links] Deactivated: ${safeSourceUrl} (failed 3 times)`);
                return { deactivated: 1, succeeded: true } satisfies VerifierAttemptResult;
              } else {
                // Atomic increment (not JS read-modify-write from the run-start
                // snapshot) so overlapping runs cannot lose a strike.
                await db.update(opportunities).set({ failedVerificationCount: sql`${opportunities.failedVerificationCount} + 1`, lastVerifiedAt: checkedAt, updatedAt: checkedAt }).where(eq(opportunities.id, id));
                console.log(`[api/cron/verify-links] Definitively gone (${res.status}): ${safeSourceUrl} (strike ${newFailCount})`);
              }
            } else {
              // Success, bot wall, or transient origin error: none are proof a
              // listing is gone, so reset stale strikes and keep it active.
              const checkedAt = nowUtcIso();
              await db.update(opportunities).set({ failedVerificationCount: 0, lastVerifiedAt: checkedAt, updatedAt: checkedAt }).where(eq(opportunities.id, id));
            }
          } catch (err) {
            // A network failure is still an attempt: rotate the row without
            // changing strikes or active state. This prevents one bad cohort
            // from starving every later row while remaining non-authoritative.
            const attemptedAt = nowUtcIso();
            await db.update(opportunities).set(
              buildVerifierFailureUpdate(attemptedAt),
            ).where(eq(opportunities.id, id));
            console.warn(`[api/cron/verify-links] Failed checking ${safeSourceUrl}:`, (err as Error).message);
            return { deactivated: 0, succeeded: false } satisfies VerifierAttemptResult;
          }
          return { deactivated: 0, succeeded: true } satisfies VerifierAttemptResult;
        })
      );

      const summary = summarizeVerifierAttempts(results);
      attempted += summary.attempted;
      succeeded += summary.succeeded;
      failedChecks += summary.failedChecks;
      deactivated += summary.deactivated;
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

    console.log(`[api/cron/verify-links] Completed. Attempted ${attempted}, succeeded ${succeeded}, failed ${failedChecks}, auto-archived ${stale.length}, deactivated ${deactivated} dead links (${geoPageDeactivated} by geo page-scan), never-verified backlog: ${neverVerifiedRemaining}.`);
    return new Response(JSON.stringify({ attempted, succeeded, failedChecks, checked: succeeded, autoArchived: stale.length, deactivated, geoPageDeactivated, neverVerifiedRemaining }), {
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
