import type { APIRoute } from 'astro';
import { db, schema } from '@va-hub/db';
import { sql, eq } from 'drizzle-orm';

/**
 * 🛰️ VA.INDEX Control Plane: Feed API v1.0
 * MISSION: Synchronized, deterministic sorting for all agents.
 * This file is required by triage.ts and health-check.ts.
 */
export const GET: APIRoute = async () => {
  try {
    const rawFeed = await db.select({
        id: schema.opportunities.id,
        tier: schema.opportunities.tier,
        latestActivityMs: schema.opportunities.latestActivityMs,
        // The "Titanium" Decay Logic: 
        // 900000ms = 15 mins (Bonus period)
        // 14400000.0 = 4 hours (Normalization factor)
        sortScore: sql<number>`(
            tier + 
            CASE 
                WHEN (unixepoch('now') * 1000 - latest_activity_ms) <= 900000 THEN -5.0 
                ELSE ((unixepoch('now') * 1000 - latest_activity_ms) / 14400000.0) 
            END
        )`
    })
    .from(schema.opportunities)
    .where(eq(schema.opportunities.isActive, true))
    .orderBy(sql`sortScore ASC`)
    .limit(50);

    return new Response(JSON.stringify({
      count: rawFeed.length,
      feed: rawFeed,
      verifiedAt: new Date().toISOString()
    }, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Sentinel-Sync": "14400000.0"
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
