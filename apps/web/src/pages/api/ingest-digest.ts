import type { APIRoute } from "astro";
import { getDb, contentDigests } from "@va-hub/db";
import { chunkArray, maxRowsPerD1Batch } from "@va-hub/scraper";
import { nowUtcIso } from "@/lib/time";
import { isAuthorized } from "@/lib/auth";
import { parseDigestItems } from "@/lib/digest-payload";
import { readJsonBodyLimited } from "@/lib/request-body";

export const prerender = false;

// contentDigests inserts ~9 columns/row; D1 caps a statement at 100 bound
// parameters, so a single insert 500s once the payload exceeds ~11 items —
// while the endpoint advertised a 200-item limit. Chunk to honor that limit.
const DIGEST_COLUMNS = 9;
const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024;

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

    const proxySecret = env?.PROXY_SECRET || env?.CRON_SECRET;

    if (!proxySecret) {
      console.error("PROXY_SECRET/CRON_SECRET not configured in environment");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), { status: 500 });
    }

    if (!isAuthorized(request, proxySecret)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const parsedBody = await readJsonBodyLimited(request, MAX_PAYLOAD_BYTES);
    if (!parsedBody.ok) {
      return new Response(JSON.stringify({ error: parsedBody.message }), {
        status: parsedBody.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parsedItems = parseDigestItems(parsedBody.value, nowUtcIso());
    if (!parsedItems.ok) {
      return new Response(JSON.stringify({ error: parsedItems.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const normalizedItems = parsedItems.items;

    if (normalizedItems.length === 0) {
      return new Response(JSON.stringify({ success: true, inserted: 0 }), { status: 200 });
    }

    const db = getDb(env);
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
      totalReceived: normalizedItems.length
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Ingest-digest API Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
};
