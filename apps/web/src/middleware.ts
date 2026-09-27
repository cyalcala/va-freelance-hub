import { defineMiddleware } from "astro:middleware";
import { applySecurityHeaders } from "@/lib/security-headers";
import { publicHtmlCacheKey, mayStorePublicHtml } from "@/lib/public-edge-cache";

// Cloudflare Pages `_headers` rules do not cover SSR/API responses. Apply the
// shared policy at Astro's server boundary, while static assets get their own
// Page-level policy in public/_headers.
//
// In addition, use Cloudflare's Edge Cache API (caches.default) to cache public
// HTML SSR pages for 5 minutes. This protects D1 daily row-read quota by serving
// repetitive traffic & search engine bots directly from Cloudflare's global Edge PoPs.
export const onRequest = defineMiddleware(async (context, next) => {
  const request = context.request;
  const cacheKey = publicHtmlCacheKey(request);

  // Access Cloudflare Edge Cache API (available in Cloudflare runtime)
  const edgeCache = typeof caches !== "undefined" ? (caches as any).default : null;

  if (edgeCache && cacheKey) {
    try {
      const match = await edgeCache.match(cacheKey);
      if (match) {
        const cached = new Response(match.body, match);
        cached.headers.set("X-Edge-Cache", "HIT");
        return cached;
      }
    } catch {
      // Degrade gracefully on cache lookup error
    }
  }

  const response = await next();
  applySecurityHeaders(response.headers);

  if (edgeCache && cacheKey && mayStorePublicHtml(response)) {
    try {
      // 5-minute (300s) Edge TTL matching the recommended cache policy
      response.headers.set(
        "Cache-Control",
        "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
      );
      response.headers.set("X-Edge-Cache", "MISS");

      const responseToCache = response.clone();
      const waitUntil = (context.locals as any)?.runtime?.ctx?.waitUntil;
      if (typeof waitUntil === "function") {
        waitUntil.call((context.locals as any).runtime.ctx, edgeCache.put(cacheKey, responseToCache));
      } else {
        edgeCache.put(cacheKey, responseToCache).catch(() => {});
      }
    } catch {
      // Degrade gracefully if caching fails
    }
  }

  return response;
});
