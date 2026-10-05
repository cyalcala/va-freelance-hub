/**
 * A resolved-rows cache for `/sitemap.xml`, whose route reads **every**
 * public-eligible row on every render. The route is absent from the shared Cloudflare
 * edge cache allowlist (`publicHtmlCacheKey()` in `public-edge-cache.ts` covers the HTML
 * pages only), so a crawl burst reaches it once per hit and each hit paid the full
 * eligible-corpus read from prod D1 — while the response it returns advertises
 * `max-age=3600, s-maxage=3600` to every client.
 *
 * This shape follows the `/directory` listing cache that is already in production
 * (`directory-page.ts`, PR #200): a bounded TTL, an explicit payload bound, and
 * deliberately **no in-flight coalescing**. Coalescing would hand a caller a promise whose
 * I/O belongs to a different request, and in a Workers/Pages isolate a promise whose
 * originating request was cancelled may never settle — which would leave the entry
 * permanently in-flight and every later render awaiting a value that can never arrive.
 * Two concurrent misses cost at most one extra read, which is exactly what every render
 * cost before this cache existed.
 */

export type CachedRows = { id: number; updatedAt: string | null };

/**
 * Strictly shorter than the `max-age=3600, s-maxage=3600` the route already publishes, so
 * the in-isolate document can never be the stalest layer a crawler observes, and equal to
 * the app's existing shared public-cache window: `src/middleware.ts` stores public HTML
 * at `s-maxage=300` and the `/directory` listing cache uses the same 300 s
 * (`DIRECTORY_LISTING_CACHE_TTL_MS`). Matching the window the rest of the app already
 * serves from memory means a newly published job URL reaches crawlers within five minutes,
 * instead of an hour.
 */
export const SITEMAP_ROWS_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * 1 443 public-eligible rows were measured in prod D1 on 2026-10-05, against 6 728 total
 * rows. A bound well above that keeps growth serving correctly while refusing to retain a
 * payload nobody measured; past it, renders are served from D1 exactly as they are today
 * instead of caching an unbounded document.
 */
export const SITEMAP_ROWS_CACHE_MAX_JOBS = 20_000;

export function createSitemapRowsCache(options: {
  ttlMs: number;
  maxJobs: number;
  now?: () => number;
}) {
  const now = options.now ?? Date.now;
  /**
   * Keyed on the live D1 binding object, which is stable for the life of a Pages/Workers
   * isolate, so one isolate retains at most one entry. It also means one database's rows
   * can never be served as another's document, and a `WeakMap` entry cannot outlive its
   * binding. If a runtime ever handed a fresh binding object per request the cache would
   * simply miss and behaviour would degrade to one read per render — today's behaviour.
   */
  const entries = new WeakMap<object, { rows: CachedRows[]; expiresAt: number }>();

  return {
    async load(binding: object, read: () => Promise<CachedRows[]>): Promise<CachedRows[]> {
      const cached = entries.get(binding);
      if (cached) {
        if (cached.expiresAt > now()) return cached.rows;
        entries.delete(binding);
      }

      const rows = await read();
      // Only a resolved read is stored: a thrown read propagates with nothing cached, so
      // an outage is never replayed out of memory as a document.
      if (rows.length <= options.maxJobs) {
        entries.set(binding, { rows, expiresAt: now() + options.ttlMs });
      }
      return rows;
    },
  };
}