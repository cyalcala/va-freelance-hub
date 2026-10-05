import type { APIRoute } from "astro";
import { getDb, opportunities } from "@va-hub/db";
import { sql } from "drizzle-orm";
import { publicOpportunityFilters } from "@/lib/public-opportunities";
import { markPublicDataUnavailable } from "@/lib/public-route-load";
import {
  createSitemapRowsCache,
  SITEMAP_ROWS_CACHE_MAX_JOBS,
  SITEMAP_ROWS_CACHE_TTL_MS,
} from "@/lib/sitemap-rows-cache";
import { normalizeUtcIso } from "@/lib/time";

export const prerender = false;

const SITE_ORIGIN = "https://remotejobs-ph.pages.dev";

/**
 * One resolved read per isolate per TTL. This route is not in the shared Cloudflare edge
 * cache allowlist, so it read the whole public-eligible corpus on every crawler hit while
 * telling each client the document was reusable for an hour. The window and the payload
 * bound match that published contract, and a failed read stores nothing, so the 503
 * contract below still holds. See `lib/sitemap-rows-cache.ts`.
 */
const sitemapRowsCache = createSitemapRowsCache({
  ttlMs: SITEMAP_ROWS_CACHE_TTL_MS,
  maxJobs: SITEMAP_ROWS_CACHE_MAX_JOBS,
});

const STATIC_PAGES = [
  { loc: "/", changefreq: "daily", priority: "1.0" },
  { loc: "/opportunities", changefreq: "hourly", priority: "0.9" },
  { loc: "/directory", changefreq: "weekly", priority: "0.7" },
  { loc: "/privacy", changefreq: "monthly", priority: "0.3" },
  { loc: "/data-policy", changefreq: "monthly", priority: "0.3" },
];

export const GET: APIRoute = async ({ locals }) => {
  let jobEntries = "";

  try {
    const env = (locals.runtime?.env ?? (import.meta as any).env) as any;
    const db = getDb(env);

    const rows = await sitemapRowsCache.load((env?.DB ?? env) as object, async () => {
      return db
        .select({
          id: opportunities.id,
          updatedAt: sql<string>`coalesce(${opportunities.updatedAt}, ${opportunities.postedAt}, ${opportunities.scrapedAt})`,
        })
        .from(opportunities)
        .where(publicOpportunityFilters());
    });

    for (const row of rows) {
      // `updatedAt` is `coalesce(updated_at, posted_at, scraped_at)`, so it can still
      // be an unparseable string written by an upstream feed or a legacy row. The
      // previous `new Date(...).toISOString()` threw `RangeError: Invalid time value`
      // on such a value, inside this accumulation loop and inside the route's single
      // try/catch, so one bad row discarded every job URL after it and the sitemap
      // silently degraded to the five static pages. Route the date through the shared
      // safe binder instead: an unusable date yields no <lastmod> at all, which is
      // both truthful and non-fatal. Substituting "now" would tell a crawler the job
      // changed today, which is a fabricated date (CONSTITUTION §1.3 #2,
      // `unknown_date_policy: retain-unknown-do-not-publish`).
      const lastmod = normalizeUtcIso(row.updatedAt);
      const lastmodEntry = lastmod ? `<lastmod>${lastmod.split("T")[0]}</lastmod>` : "";
      jobEntries += `<url><loc>${SITE_ORIGIN}/jobs/${row.id}</loc>${lastmodEntry}<changefreq>weekly</changefreq><priority>0.6</priority></url>\n`;
    }
  } catch (e) {
    // An incomplete read must never be published as a success. Falling through to the
    // success path answered 200 with a document that listed only the static pages, so
    // the status claimed success, `Cache-Control: public, max-age=3600` let Cloudflare
    // and crawlers store it for an hour, and the document itself asserted "this is the
    // complete list of job URLs" while every job URL was missing — indistinguishable
    // from "there are no jobs". Every other public surface in this app already answers
    // the same condition honestly, so reuse that contract: 503, `no-store`, and a
    // redacted error classification instead of the raw upstream error (which carries
    // the full SQL text and bound parameters).
    //
    // `Response.status` is not writable in every runtime, so the shared helper is given
    // the very `Headers` instance the response is built from and its resulting status
    // is read back. Nothing is emitted from `jobEntries` on this path: a partial list
    // is the same lie as an empty one.
    const failure: { status: number; headers: Headers } = { status: 200, headers: new Headers() };
    markPublicDataUnavailable(failure, e);

    return new Response("Service temporarily unavailable", {
      status: failure.status,
      headers: failure.headers,
    });
  }

  const staticEntries = STATIC_PAGES.map(
    (p) =>
      `<url><loc>${SITE_ORIGIN}${p.loc}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`
  ).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${jobEntries}</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
};
