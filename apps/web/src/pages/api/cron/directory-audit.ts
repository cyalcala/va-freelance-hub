import type { APIRoute } from "astro";
import { getDb, vaDirectory } from "@va-hub/db";
import { eq, and, isNotNull, asc, sql } from "drizzle-orm";
import { checkDirectoryLink } from "@va-hub/scraper";
import { nowUtcIso } from "@/lib/time";
import { isAuthorized } from "@/lib/auth";
import { buildDirectoryHealthUpdate, directoryHealthStatus } from "@/lib/directory-health";

// Automated directory pulse (2026-07). Recurring link-health check over the
// va_directory company list, mirroring the manual 2026-07 audit's classifier
// (bot-wall vs genuinely dead). Runs on a rotating budget so the whole
// directory is re-checked over a few days at $0.
//
// SAFETY: this never deletes and never edits a website URL. A company must
// return a HARD-DEAD verdict (dead_dns / dead_http / parked) on THREE
// consecutive checks before it is de-verified (is_verified = 0) and annotated
// for human review. Any healthy check resets the strike counter. Bot walls
// (403/429 from live sites like Canva/Fiverr) never count a strike.

const DEFAULT_BUDGET = 60;   // companies re-checked per run (4 runs/day = full ~368 sweep in ~1.5 days)
const CHECK_CONCURRENCY = 8;

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  console.log("[api/cron/directory-audit] Starting directory link-health pulse...");
  const env = (locals.runtime?.env ?? (import.meta as any).env) as any;
  const db = getDb(env);
  const startedAt = nowUtcIso();

  const rateLimiter = env?.API_RATE_LIMITER;
  if (rateLimiter) {
    const clientIp = request.headers.get("cf-connecting-ip") || "unknown";
    const { success } = await rateLimiter.limit({ key: `directory-audit:${clientIp}` });
    if (!success) return new Response("Too Many Requests", { status: 429 });
  }

  if (!isAuthorized(request, env?.PROXY_SECRET || env?.CRON_SECRET)) {
    console.warn("[api/cron/directory-audit] Unauthorized access attempt");
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const budget = Math.min(Math.max(parseInt(url.searchParams.get("limit") || String(DEFAULT_BUDGET), 10) || DEFAULT_BUDGET, 1), 100);

  try {
    // Oldest-checked first (NULLs first), and only rows that actually have a
    // website to check — no_url rows carry no link-health signal.
    const targets = await db
      .select({
        id: vaDirectory.id,
        companyName: vaDirectory.companyName,
        website: vaDirectory.website,
        failCount: vaDirectory.linkFailCount,
        isVerified: vaDirectory.isVerified,
      })
      .from(vaDirectory)
      .where(and(isNotNull(vaDirectory.website), sql`trim(coalesce(${vaDirectory.website}, '')) <> ''`))
      .orderBy(sql`${vaDirectory.linkCheckedAt} IS NOT NULL`, asc(vaDirectory.linkCheckedAt))
      .limit(budget);

    console.log(`[api/cron/directory-audit] Checking ${targets.length} company links (budget ${budget}).`);

    const tally: Record<string, number> = { ok: 0, bot_wall: 0, dead_http: 0, unreachable: 0, dead_dns: 0, parked: 0, no_url: 0 };
    let newlyFlagged = 0;
    const flaggedThisRun: { id: number; company: string; status: string; strikes: number }[] = [];

    for (let i = 0; i < targets.length; i += CHECK_CONCURRENCY) {
      const batch = targets.slice(i, i + CHECK_CONCURRENCY);
      await Promise.all(
        batch.map(async (row) => {
          const verdict = await checkDirectoryLink(row.website);
          tally[verdict.status] = (tally[verdict.status] ?? 0) + 1;
          const checkedAt = nowUtcIso();

          const update = buildDirectoryHealthUpdate({
            verdict,
            priorFailCount: row.failCount,
            isVerified: row.isVerified,
            checkedAt,
          });
          const strikes = update.values.linkFailCount;
          await db.update(vaDirectory).set({
            ...update.values,
            // Human-gated: de-verify (hide from the "vetted" set) only at the
            // threshold, and only if currently verified. Never delete, never
            // touch the website URL — a human decides removal.
            ...(update.reachedThreshold
              ? { notes: sql`coalesce(${vaDirectory.notes} || ' | ', '') || ${'[auto ' + checkedAt.slice(0, 10) + '] link ' + verdict.status + ' x' + strikes + ': ' + verdict.evidence}` }
              : {}),
          }).where(eq(vaDirectory.id, row.id));

          if (update.reachedThreshold) {
            newlyFlagged += 1;
            flaggedThisRun.push({ id: row.id, company: row.companyName, status: verdict.status, strikes });
          }
        })
      );
    }

    // Backlog: how many rows still carry an active strike (1-2), i.e. suspected
    // dead but not yet at the threshold — surfaced so the digest shows movement.
    let suspected = -1;
    try {
      const [row] = await db.select({ n: sql<number>`COUNT(*)` }).from(vaDirectory)
        .where(sql`${vaDirectory.linkFailCount} > 0`);
      suspected = row?.n ?? -1;
    } catch { /* best-effort */ }

    const health = directoryHealthStatus(targets.length, tally);
    console.log(`[api/cron/directory-audit] Done. Checked ${targets.length}, flagged ${newlyFlagged}, tally ${JSON.stringify(tally)}.`);
    return new Response(JSON.stringify({
      checked: targets.length,
      budget,
      tally,
      ...health,
      newlyFlagged,
      flaggedThisRun,
      suspectedDeadWithStrikes: suspected,
      startedAt,
      finishedAt: nowUtcIso(),
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[api/cron/directory-audit] Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
};
