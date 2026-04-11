import { db, schema } from './client';
import { desc, not, eq, sql, and } from 'drizzle-orm';

/**
 * PH-First Decay Algorithm (SQL-Native)
 * 1. Pushes math to the Edge (Turso/LibSQL).
 * 2. Fetches only the needed 'limit' records.
 * 3. Gravity Calculation: (Tier * 24.0) + (Age in Hours)
 * 4. Freshness Boost: -12.0h if < 15min old.
 */
export async function getSortedSignals(limit = 100, nowMs?: number) {
  const now = nowMs ? Math.floor(nowMs / 1000) : null;
  const staleBoundary = Date.now() - (48 * 60 * 60 * 1000); // 48 Hours

  // GRAVITY RANKING LOGIC (V12.5): 
  // Score = (Tier * 24) + (Age_In_Hours / TrustFactor)
  // TrustFactor: 2.0 for Direct ATS (Slow Decay), 1.0 for Others.
  const query = db.select()
  .from(schema.opportunities)
  .where(
    and(
      not(eq(schema.opportunities.tier, 4)),
      eq(schema.opportunities.isActive, true)
    )
  )
  .orderBy(
    sql`(tier * 24) + ((${now ? now : "unixepoch('now')"} - (latest_activity_ms / 1000)) / (CASE 
      WHEN source_platform LIKE '%Greenhouse%' OR source_platform LIKE '%Lever%' OR source_platform LIKE '%Workable%' THEN 2.0 
      ELSE 1.0 
    END * 3600.0)) ASC`,
    desc(schema.opportunities.relevanceScore)
  )
  .limit(limit);

  const results = await query;
  if (results.length === 0) return [];

  // 🎯 DIVERSITY INTERLEAVING (V12.10): Prevent source-platform clusters
  const groups: Record<string, typeof results> = {};
  for (const job of results) {
    const key = job.sourcePlatform || "Unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(job);
  }

  const interspersed: typeof results = [];
  const keys = Object.keys(groups);
  let hasItems = true;

  while (hasItems) {
    hasItems = false;
    for (const key of keys) {
      const job = groups[key].shift();
      if (job) {
        interspersed.push(job);
        hasItems = true;
      }
    }
  }

  return interspersed.slice(0, limit);
}

/**
 * Domain-Specific Fetcher
 * Used to populate the functional silos in the Master Directory UI.
 */
export async function getSignalsByDomain(domain: string, limit = 20) {
  const staleBoundary = Date.now() - (48 * 60 * 60 * 1000); // 48 Hours

  return await db.select()
    .from(schema.opportunities)
    .where(
      and(
        not(eq(schema.opportunities.tier, 4)),
        eq(schema.opportunities.isActive, true),
        eq(schema.opportunities.niche, domain)
      )
    )
    .orderBy(
      schema.opportunities.tier, 
      desc(schema.opportunities.latestActivityMs),
      desc(schema.opportunities.relevanceScore)
    )
    .limit(limit);
}

/**
 * Latest Mirror Algorithm
 * Returns the absolute freshest signals regardless of tier.
 */
export async function getLatestMirror(limit = 10) {
  return await db.select()
    .from(schema.opportunities)
    .where(not(eq(schema.opportunities.tier, 4)))
    .orderBy(desc(schema.opportunities.latestActivityMs))
    .limit(limit);
}
