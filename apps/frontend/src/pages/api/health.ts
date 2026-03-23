import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    status: "HEALTHY",
    vitals: {}
  };

  try {
    const { db } = await import('@va-hub/db/client');
    const { opportunities } = await import('@va-hub/db/schema');
    const { sql, eq, desc, not } = await import('drizzle-orm');
    
    // 1. Density Audit
    const allActive = await db.select().from(opportunities).where(eq(opportunities.isActive, true));
    const tiers = {
       gold: allActive.filter(o => o.tier === 1).length,
       silver: allActive.filter(o => o.tier === 2).length,
       bronze: allActive.filter(o => o.tier === 3).length,
    };

    // 2. Pulse Audit
    const stats = await db.select({
    total: sql<number>`count(*)`,
    gold: sql<number>`sum(case when tier = 1 then 1 else 0 end)`,
    newToday: sql<number>`sum(case when created_at > unixepoch('now', '-24 hours') then 1 else 0 end)`,
    maxIngested: sql<number>`max(scraped_at)`,
  }).from(opportunities).where(eq(opportunities.isActive, true));

  const { total, gold, newToday, maxIngested } = stats[0];
  const lastHeartbeat = maxIngested ? new Date(maxIngested) : new Date(0);
  const stalenessHrs = (Date.now() - lastHeartbeat.getTime()) / (1000 * 60 * 60);

  // Success Bias Audit: If zero new jobs today, mark as unfaithful
  const isFaithful = newToday > 0;

    diagnostics.vitals = {
      totalActive: total,
      goldDistribution: gold,
      lastHeartbeat: lastHeartbeat.toISOString(),
      stalenessHrs: Number(stalenessHrs.toFixed(2)),
      isFaithful,
      isStale: stalenessHrs > 6,
      v10: true,
      dailyGrowthRate: newToday,
    };

    if (!diagnostics.vitals.isFaithful || diagnostics.vitals.isStale) {
      diagnostics.status = "DEGRADED ⚠️";
    }

  } catch (err: any) {
    diagnostics.status = "CRITICAL ❌";
    diagnostics.error = err.message;
  }

  return new Response(JSON.stringify(diagnostics, null, 2), {
    status: 200,
    headers: { 
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Surrogate-Control": "no-store"
    },
  });
};
