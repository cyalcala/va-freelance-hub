import type { APIRoute } from "astro";
import { getDb, opportunities } from "@va-hub/db";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env ?? (import.meta as any).env;

    // 1. Rate Limiting Check
    const rateLimiter = env?.API_RATE_LIMITER;
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
    const proxySecret = env?.PROXY_SECRET;

    if (!proxySecret) {
      console.error("PROXY_SECRET not configured in environment");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), { status: 500 });
    }

    if (authHeader !== `Bearer ${proxySecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const payload = await request.json();
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
    
    // Insert with deduplication based on sourceUrl, chunked to avoid SQLite limits
    const CHUNK_SIZE = 10;
    let insertedCount = 0;
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE);
      const result = await db.insert(opportunities)
        .values(chunk)
        .onConflictDoNothing({ target: opportunities.sourceUrl })
        .returning({ id: opportunities.id });
      insertedCount += result.length;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      inserted: insertedCount,
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
