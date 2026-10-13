import { defineMiddleware } from "astro:middleware";
import { applySecurityHeaders } from "@/lib/security-headers";
import { publicHtmlCacheKey, publicHtmlCacheControl, mayStorePublicHtml, runtimePublicHtmlCache, readPublicHtmlCache } from "@/lib/public-edge-cache";

// Cloudflare Pages `_headers` rules do not cover SSR/API responses. Apply the
// shared policy at Astro's server boundary, while static assets get their own
// Page-level policy in public/_headers.
//
// In addition, use Cloudflare's Edge Cache API (caches.default) to cache public
// HTML SSR pages within their snapshot's remaining lifetime. This protects D1 quota by serving
// repetitive traffic & search engine bots directly from Cloudflare's global Edge PoPs.
export const onRequest = defineMiddleware(async (context, next) => {
  const request = context.request;
  const cacheKey = publicHtmlCacheKey(request);

  // Access Cloudflare Edge Cache API (available in Cloudflare runtime)
  const edgeCache = runtimePublicHtmlCache();

  if (edgeCache && cacheKey) {
    try {
      const match = await readPublicHtmlCache(edgeCache, cacheKey);
      if (match && mayStorePublicHtml(match)) {
        const cached = new Response(match.body, match);
        cached.headers.set("Cache-Control", publicHtmlCacheControl(cached));
        cached.headers.set("X-Edge-Cache", "HIT");
        return cached;
      }
    } catch {
      // Degrade gracefully on cache lookup error
    }
  }

  const response = await next();
  applySecurityHeaders(response.headers);
  if (response.headers.has("X-Public-Snapshot")) {
    response.headers.set("Cache-Control", publicHtmlCacheControl(response));
  }

  // A saved/outage page must not pin old listings/diagnostics after the shared
  // board recovers. Rendering this page still uses the in-memory/edge snapshot.
  if (["stale", "lkg_fallback", "degraded"].includes(response.headers.get("X-Public-Snapshot") ?? "")) {
    response.headers.set("Cache-Control", "no-store");
  }

  if (edgeCache && cacheKey && mayStorePublicHtml(response)) {
    try {
      // Snapshot-backed HTML cannot outlive the data it describes.
      response.headers.set(
        "Cache-Control",
        publicHtmlCacheControl(response)
      );
      response.headers.set("X-Edge-Cache", "MISS");

      const responseToCache = response.clone();
      const waitUntil = (context.locals as any)?.runtime?.ctx?.waitUntil;
      if (typeof waitUntil === "function") {
        waitUntil.call((context.locals as any).runtime.ctx, edgeCache.put(cacheKey, responseToCache).catch(() => {}));
      } else {
        edgeCache.put(cacheKey, responseToCache).catch(() => {});
      }
    } catch {
      // Degrade gracefully if caching fails
    }
  }

  return response;
});
