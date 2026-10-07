import type { APIRoute } from "astro";
import { applySnapshotHeaders, loadPublicBoard } from "@/lib/public-serving-snapshot";
import { markPublicDataUnavailable } from "@/lib/public-route-load";
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
  const headers = new Headers({
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, max-age=3600, s-maxage=3600",
  });

  try {
    const env = (locals.runtime?.env ?? (import.meta as any).env) as any;
    const board = await loadPublicBoard(env, locals.runtime?.ctx);
    applySnapshotHeaders(headers);
    for (const row of board.jobs) {
      const lastmod = normalizeUtcIso(row.updatedAt ?? row.postedAt ?? row.scrapedAt);
      const lastmodEntry = lastmod ? `<lastmod>${lastmod.split("T")[0]}</lastmod>` : "";
      jobEntries += `<url><loc>${SITE_ORIGIN}/jobs/${row.id}</loc>${lastmodEntry}<changefreq>weekly</changefreq><priority>0.6</priority></url>\n`;
    }
  } catch (e) {
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

  return new Response(xml, { headers });
};
