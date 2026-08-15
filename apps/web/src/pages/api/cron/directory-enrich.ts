import type { APIRoute } from "astro";
import { getDb } from "@va-hub/db";
import { nowUtcIso } from "@/lib/time";
import { isAuthorized } from "@/lib/auth";
import { enrichDirectory } from "@/lib/directory-enrich";

export const prerender = false;

const DEFAULT_BUDGET = 40;

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
      `websites ${result.websiteSet}, hiring pages ${result.hiringPageSet}.`,
    );

    return new Response(JSON.stringify({
      ...result,
      budget,
      startedAt,
      finishedAt: nowUtcIso(),
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[api/cron/directory-enrich] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
