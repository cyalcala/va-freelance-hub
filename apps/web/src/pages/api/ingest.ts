import type { APIRoute } from "astro";
import { getDb, opportunities } from "@va-hub/db";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const authHeader = request.headers.get("Authorization");
    
    // Resolve secret from Cloudflare env or Astro env fallback
    const env = locals.runtime?.env ?? (import.meta as any).env;
    const proxySecret = env.PROXY_SECRET;

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

    if (items.length === 0) {
      return new Response(JSON.stringify({ success: true, inserted: 0 }), { status: 200 });
    }

    const db = getDb(locals.runtime?.env);
    
    // Insert with deduplication based on sourceUrl
    const result = await db.insert(opportunities)
      .values(items)
      .onConflictDoNothing({ target: opportunities.sourceUrl })
      .returning({ id: opportunities.id });

    return new Response(JSON.stringify({ 
      success: true, 
      inserted: result.length,
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
