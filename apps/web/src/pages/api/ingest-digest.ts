import type { APIRoute } from "astro";
import { getDb, contentDigests } from "@va-hub/db";
import { chunkArray, maxRowsPerD1Batch } from "@va-hub/scraper";
import { normalizeUtcIso, nowUtcIso } from "@/lib/time";

export const prerender = false;

// contentDigests inserts ~9 columns/row; D1 caps a statement at 100 bound
// parameters, so a single insert 500s once the payload exceeds ~11 items —
// while the endpoint advertised a 200-item limit. Chunk to honor that limit.
const DIGEST_COLUMNS = 9;

function normalizeDigestForInsert(item: any, processedAt: string) {
  return {
    ...item,
    publishedAt: normalizeUtcIso(item.publishedAt),
    processedAt: normalizeUtcIso(item.processedAt) ?? processedAt,
  };
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env ?? (import.meta as any).env;

    // 1. Rate Limiting Check
    const rateLimiter = env?.API_RATE_LIMITER as any;
    if (rateLimiter) {
      const clientIp = request.headers.get("cf-connecting-ip") || "unknown";
      const { success } = await rateLimiter.limit({ key: clientIp });
      if (!success) {
        return new Response(JSON.stringify({ error: "Too Many Requests" }), { 
          status: 429, 
          headers: { "Content-Type": "application/json" } 
        });
      }
    }

    // 2. Payload Content-Length Safeguard (Max 2MB)
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 2 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "Payload too large (max 2MB)" }), { status: 413 });
    }

    const authHeader = request.headers.get("Authorization");
    const cronSecretHeader = request.headers.get("x-cron-secret");
    const proxySecret = env.PROXY_SECRET || env.CRON_SECRET;

    if (!proxySecret) {
      console.error("PROXY_SECRET/CRON_SECRET not configured in environment");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), { status: 500 });
    }

    const providedSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : cronSecretHeader;
    if (!providedSecret || providedSecret !== proxySecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const payload = await request.json() as any;
    const { items } = payload;

    if (!items || !Array.isArray(items)) {
      return new Response(JSON.stringify({ error: "Invalid payload format. Expected { items: [...] }" }), { status: 400 });
    }

    if (items.length > 200) {
      return new Response(JSON.stringify({ error: "Payload items count exceeds safety limit (max 200)" }), { status: 400 });
    }

    if (items.length === 0) {
      return new Response(JSON.stringify({ success: true, inserted: 0 }), { status: 200 });
    }


    const db = getDb(locals.runtime?.env);
    const processedAt = nowUtcIso();
    const normalizedItems = items.map((item) => normalizeDigestForInsert(item, processedAt));

    // Insert with deduplication based on videoId, chunked under the D1 limit.
    let inserted = 0;
    for (const chunk of chunkArray(normalizedItems, maxRowsPerD1Batch(DIGEST_COLUMNS))) {
      const result = await db.insert(contentDigests)
        .values(chunk)
        .onConflictDoNothing({ target: contentDigests.videoId })
        .returning({ id: contentDigests.id });
      inserted += result.length;
    }

    return new Response(JSON.stringify({
      success: true,
      inserted,
      totalReceived: items.length
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error("Ingest API Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), { status: 500 });
  }
};
