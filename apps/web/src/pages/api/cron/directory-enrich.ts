import type { APIRoute } from "astro";
import { getDb, sourceFetchState } from "@va-hub/db";
import { nowUtcIso } from "@/lib/time";
import { isAuthorized } from "@/lib/auth";
import { enrichDirectory } from "@/lib/directory-enrich";
import {
  DIAG_ERROR_MAX_LENGTH,
  buildEnrichDiagRow,
  buildEnrichDiagUpdate,
  type RunDiagnosticsSummary,
} from "@/lib/run-diagnostics";

export const prerender = false;

const DEFAULT_BUDGET = 40;

function enrichDiagSummary(errors: number, fallbackError?: string): RunDiagnosticsSummary {
  if (errors > 0) {
    return { degraded: true, signalCount: 1, summary: `enrichErrors=${errors}`.slice(0, DIAG_ERROR_MAX_LENGTH) };
  }
  if (fallbackError) {
    return { degraded: true, signalCount: 1, summary: `routeError=${fallbackError}`.slice(0, DIAG_ERROR_MAX_LENGTH) };
  }
  return { degraded: false, signalCount: 0, summary: null };
}

async function recordEnrichDiagnostics(
  db: ReturnType<typeof getDb>,
  observedAt: string,
  summary: RunDiagnosticsSummary,
) {
  try {
    await db.insert(sourceFetchState)
      .values(buildEnrichDiagRow(observedAt, summary))
      .onConflictDoUpdate({
        target: sourceFetchState.sourceId,
        set: buildEnrichDiagUpdate(observedAt, summary),
      });
  } catch (err) {
    console.warn(
      "[api/cron/directory-enrich] Failed to record diagnostics:",
      err instanceof Error ? err.message : String(err),
    );
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  console.log("[api/cron/directory-enrich] Starting directory enrichment pulse...");
  const env = locals.runtime.env as any;
  const db = getDb(env);
  const startedAt = nowUtcIso();

  const rateLimiter = env?.API_RATE_LIMITER;
  if (rateLimiter) {
    const clientIp = request.headers.get("cf-connecting-ip") || "unknown";
    const { success } = await rateLimiter.limit({ key: `directory-enrich:${clientIp}` });
    if (!success) return new Response("Too Many Requests", { status: 429 });
  }

  if (!isAuthorized(request, env?.PROXY_SECRET || env?.CRON_SECRET)) {
    console.warn("[api/cron/directory-enrich] Unauthorized access attempt");
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const budget = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") || String(DEFAULT_BUDGET), 10) || DEFAULT_BUDGET, 1),
    100,
  );

  try {
    const result = await enrichDirectory(db, budget);

    console.log(
      `[api/cron/directory-enrich] Done. Enriched ${result.enriched}, verified ${result.verified}, ` +
      `websites ${result.websiteSet}, hiring pages ${result.hiringPageSet}, errors ${result.errors}.`,
    );

    await recordEnrichDiagnostics(db, startedAt, enrichDiagSummary(result.errors));

    return new Response(JSON.stringify({
      ...result,
      budget,
      startedAt,
      finishedAt: nowUtcIso(),
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[api/cron/directory-enrich] Error:", error);
    await recordEnrichDiagnostics(db, startedAt, enrichDiagSummary(0, msg));
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
