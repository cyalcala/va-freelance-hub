import type { APIRoute } from "astro";
import { getDb, opportunities } from "@va-hub/db";
import { and, eq, inArray, sql } from "drizzle-orm";

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
      .where(
        and(
          eq(opportunities.isActive, true),
          inArray(opportunities.phEligibility, [
            "eligible_verified",
            "eligible_likely",
          ])
        )
      );

    for (const row of rows) {
      const lastmod = row.updatedAt
        ? `<lastmod>${new Date(row.updatedAt).toISOString().split("T")[0]}</lastmod>`
        : "";
      jobEntries += `<url><loc>${SITE_ORIGIN}/jobs/${row.id}</loc>${lastmod}<changefreq>weekly</changefreq><priority>0.6</priority></url>\n`;
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
