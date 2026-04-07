import type { APIRoute } from 'astro';
import { db, schema } from '@va-hub/db';
import { desc } from 'drizzle-orm';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const rawJobs = await db.select({
      id: schema.opportunities.id,
      title: schema.opportunities.title,
      company: schema.opportunities.company,
      niche: schema.opportunities.niche,
      tier: schema.opportunities.tier,
      isActive: schema.opportunities.isActive,
      scrapedAt: schema.opportunities.scrapedAt,
      latestActivityMs: schema.opportunities.latestActivityMs,
      sourcePlatform: schema.opportunities.sourcePlatform,
    })
    .from(schema.opportunities)
    .orderBy(desc(schema.opportunities.latestActivityMs))
    .limit(50);

    return new Response(JSON.stringify({
      count: rawJobs.length,
      timestamp: new Date().toISOString(),
      jobs: rawJobs
    }, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
