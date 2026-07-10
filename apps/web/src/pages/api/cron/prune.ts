import type { APIRoute } from "astro";
import { getDb, opportunities } from "@va-hub/db";
import { sql } from "drizzle-orm";
import { nowUtcIso } from "@/lib/time";
import { isAuthorized } from "@/lib/auth";

export const prerender = false;

// 2026-07-04 major audit rewrite.
//
// The previous implementation hard-DELETEd rows, which violated the project's
// archive-only stale policy (ADR-001 posture: keep evidence, make mutations
// reversible) and caused two concrete failure modes:
//
// 1. Cross-company false positives: description_hash = sha256(title + first
//    1500 chars of description). Two different companies posting the same
//    generic title with an empty description collide, and one job was
//    permanently deleted.
// 2. Re-scrape churn: scrape dedup works against existing source_url rows.
//    Deleting a row whose URL still appears in a feed made the same job
//    re-insert as "new" on the next Hunter run, corrupting freshness data.
//
// This version only archives (is_active = 0), only considers ACTIVE rows,
// scopes the duplicate key to (description_hash, company) so distinct
// companies never collapse, and keeps the oldest row (MIN(id)) visible.
// Archived rows keep their source_url in the table, so scrape dedup still
// recognizes them and does not re-insert.
//
// The old second pass (DELETE duplicates by source_url) was dead code —
// source_url has a UNIQUE index, so duplicates cannot exist — and was removed.

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env ?? (import.meta as any).env;

    // Rate-limit before auth so an attacker cannot brute-force the shared
    // secret at unlimited speed. No-op if the binding is absent.
    const rateLimiter = env?.API_RATE_LIMITER;
    if (rateLimiter) {
      const clientIp = request.headers.get("cf-connecting-ip") || "unknown";
      const { success } = await rateLimiter.limit({ key: `prune:${clientIp}` });
      if (!success) {
        return new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429 });
      }
    }

    if (!isAuthorized(request, env.PROXY_SECRET || env.CRON_SECRET)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const db = getDb(env);
    const archivedAt = nowUtcIso();

    const result = await db.run(sql`
      UPDATE \`opportunities\`
      SET \`is_active\` = 0, \`updated_at\` = ${archivedAt}
      WHERE \`is_active\` = 1
      AND \`description_hash\` IS NOT NULL
      AND \`id\` NOT IN (
        SELECT MIN(\`id\`)
        FROM \`opportunities\`
        WHERE \`is_active\` = 1
        AND \`description_hash\` IS NOT NULL
        GROUP BY \`description_hash\`, lower(coalesce(\`company\`, ''))
      )
    `);

    const archived = (result as any).meta?.changes ?? 0;
    console.log(`[api/cron/prune] Archived ${archived} duplicate active rows (description_hash + company scoped). No rows deleted.`);

    return new Response(JSON.stringify({
      success: true,
      archivedHashDuplicates: archived,
      deleted: 0,
      mode: "soft-archive",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Prune API Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), { status: 500 });
  }
};
