import type { APIRoute } from 'astro';
import { db, schema } from '@va-hub/db';
import { sql, eq } from 'drizzle-orm';

export const GET: APIRoute = async () => {
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    status: "HEALTHY",
    vitals: {}
  };

  let nonce = Math.random().toString(36).substring(7);

  try {
    const stats = await db.select({
      total: sql<number>`count(*)`,
      gold: sql<number>`sum(case when tier = 1 then 1 else 0 end)`,
      newToday: sql<number>`sum(case when created_at > unixepoch('now', '-24 hours') * 1000 then 1 else 0 end)`,
      maxScraped: sql<number>`max(scraped_at)`,
      maxCreated: sql<number>`max(created_at)`,
    }).from(schema.opportunities).where(eq(schema.opportunities.isActive, true));

    const { total, gold, newToday, maxScraped, maxCreated } = stats[0];
    
    const lastIngestion = maxCreated ? new Date(maxCreated) : new Date(0);
    const lastHeartbeat = maxScraped ? new Date(maxScraped) : new Date(0);
      
    const ingestionStalenessHrs = (Date.now() - lastIngestion.getTime()) / (1000 * 60 * 60);
    const dbStalenessHrs = (Date.now() - lastHeartbeat.getTime()) / (1000 * 60 * 60);

    const stalenessThreshold = Number(process.env.STALENESS_THRESHOLD_HRS || 2);
    
    diagnostics.vitals = {
      totalActive: total,
      goldDistribution: gold,
      lastIngestion: lastIngestion.toISOString(),
      ingestionStalenessHrs: Number(ingestionStalenessHrs.toFixed(2)),
      dbStalenessHrs: Number(dbStalenessHrs.toFixed(2)),
      isFaithful: newToday > 0,
      isStale: ingestionStalenessHrs > stalenessThreshold,
      dailyGrowthRate: newToday,
    };

    if (!diagnostics.vitals.isFaithful || diagnostics.vitals.isStale) {
      diagnostics.status = "DEGRADED ⚠️";
    }

    diagnostics.nonce = nonce;

  } catch (err: any) {
    diagnostics.status = "CRITICAL ❌";
    diagnostics.error = err.message;
  }

  return new Response(JSON.stringify(diagnostics, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
      "Pragma": "no-cache",
      "Expires": "0",
      "X-Sentinel-Nonce": nonce,
      "X-Sentinel-Verified": "true"
    },
  });
};
