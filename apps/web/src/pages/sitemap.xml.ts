import type { APIRoute } from "astro";
import { getDb, opportunities } from "@va-hub/db";
import { sql } from "drizzle-orm";
import { publicOpportunityFilters } from "@/lib/public-opportunities";
import { normalizeUtcIso } from "@/lib/time";

export const prerender = false;

const SITE_ORIGIN = "https://remotejobs-ph.pages.dev";

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

    const rows = await db
      .select({
        id: opportunities.id,
        updatedAt: sql<string>`coalesce(${opportunities.updatedAt}, ${opportunities.postedAt}, ${opportunities.scrapedAt})`,
      })
      .from(opportunities)
      .where(publicOpportunityFilters());

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
    console.error("[sitemap.xml] DB error:", e);
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
