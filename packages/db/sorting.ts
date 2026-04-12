import { db, schema } from './client';
import { desc, not, eq, sql, and, gte } from 'drizzle-orm';

/**
 * PH-First Decay Algorithm (SQL-Native)
 * 1. Pushes math to the Edge (Turso/LibSQL).
 * 2. Fetches only the needed 'limit' records.
 * 3. Gravity Calculation: (Tier * 24.0) + (Age in Hours)
 * 4. Freshness Boost: -24.0h if < 15min old.
 */
export async function getSortedSignals(limit = 100, nowMs?: number) {
  const staleBoundary = Date.now() - (48 * 60 * 60 * 1000); // 48 Hours

  // 🎯 V12.11 CANDIDATE REACH: Fetch more candidates to ensure variety for interleaving
  const candidateLimit = Math.max(limit * 3, 300);

  const query = db.select()
  .from(schema.opportunities)
  .where(
    and(
      eq(schema.opportunities.isActive, true),
      gte(schema.opportunities.latestActivityMs, staleBoundary)
    )
  )
  .orderBy(
    desc(schema.opportunities.latestActivityMs),
    desc(schema.opportunities.relevanceScore)
  )
  .limit(candidateLimit);

  const candidates = await query;
  if (candidates.length === 0) return [];

  // 🎯 SOURCE FIDELITY BOOST (V12.11)
  // We prioritize 'High Fidelity' sources in the slotting phase
  const HIGH_FIDELITY_SOURCES = ['Direct ATS', 'Agency Sensor', 'JobStreet PH', 'Himalayas', 'We Work Remotely'];

  const groups: Record<string, typeof candidates> = {};
  for (const job of candidates) {
    const key = job.sourcePlatform || "Unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(job);
  }

  // Sort groups: High fidelity sources first
  const keys = Object.keys(groups).sort((a, b) => {
    const aIsHigh = HIGH_FIDELITY_SOURCES.some(s => a.includes(s)) ? 0 : 1;
    const bIsHigh = HIGH_FIDELITY_SOURCES.some(s => b.includes(s)) ? 0 : 1;
    return aIsHigh - bIsHigh;
  });

  const interspersed: typeof candidates = [];
  const sourceCount: Record<string, number> = {};
  const SATURATION_CAP = 6; // Max 6 signals per source in a single view

  let hasItems = true;
  while (hasItems && interspersed.length < limit) {
    hasItems = false;
    for (const key of keys) {
      // 🛡️ SATURATION CAP: Prevent any single source from dominating the Top Feed
      if ((sourceCount[key] || 0) >= SATURATION_CAP && interspersed.length < limit / 2) {
         continue; 
      }

      const job = groups[key].shift();
      if (job) {
        interspersed.push(job);
        sourceCount[key] = (sourceCount[key] || 0) + 1;
        hasItems = true;
      }

      if (interspersed.length >= limit) break;
    }
  }

  return interspersed;
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
        eq(schema.opportunities.isActive, true),
        eq(schema.opportunities.niche, domain),
        gte(schema.opportunities.latestActivityMs, staleBoundary)
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
    .where(eq(schema.opportunities.isActive, true))
    .orderBy(desc(schema.opportunities.latestActivityMs))
    .limit(limit);
}
