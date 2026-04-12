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

  // 🎯 V12.15 CANDIDATE REACH: Increase depth to ensure variety for interleaving
  const candidateLimit = Math.max(limit * 5, 1000);

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

  // 🎯 BUCKET CLASSIFICATION (V12.15 Intelligent Interleaving)
  const HIGH_FIDELITY_ATS = ['Direct ATS', 'Agency Sensor', 'JobStreet PH', 'Himalayas', 'We Work Remotely', 'SimplyHired', 'AngelList'];
  
  const buckets: { VERIFIED: typeof candidates, SOCIAL: typeof candidates } = {
    VERIFIED: [],
    SOCIAL: []
  };

  for (const job of candidates) {
    const source = (job.sourcePlatform || "Unknown").toLowerCase();
    const isSocial = source.includes('reddit') || source.includes('facebook') || source.includes('twitter');
    const isHighFidelity = HIGH_FIDELITY_ATS.some(s => source.includes(s.toLowerCase()));

    if (isSocial && !isHighFidelity) {
      buckets.SOCIAL.push(job);
    } else {
      buckets.VERIFIED.push(job);
    }
  }

  const interspersed: typeof candidates = [];
  const sourceCount: Record<string, number> = {};
  const SOURCE_SATURATION_CAP = 4; // Tighter cap per source in top feed

  // 🔄 THE BUCKET BRIGADE (2:1 Ratio)
  // Logic: 2 Verified/Direct -> 1 Social -> Repeat
  while (interspersed.length < limit && (buckets.VERIFIED.length > 0 || buckets.SOCIAL.length > 0)) {
    // 1. Pull 2 Verified
    for (let i = 0; i < 2; i++) {
      if (buckets.VERIFIED.length > 0 && interspersed.length < limit) {
        const job = buckets.VERIFIED.shift();
        if (job) {
          const sKey = job.sourcePlatform || "Unknown";
          if ((sourceCount[sKey] || 0) < SOURCE_SATURATION_CAP) {
            interspersed.push(job);
            sourceCount[sKey] = (sourceCount[sKey] || 0) + 1;
          }
        }
      }
    }

    // 2. Pull 1 Social
    if (buckets.SOCIAL.length > 0 && interspersed.length < limit) {
      const job = buckets.SOCIAL.shift();
      if (job) {
        // Normalize Reddit subreddits for saturation cap
        const sKey = job.sourcePlatform?.toLowerCase().includes('reddit') ? 'REDDIT_GROUP' : (job.sourcePlatform || "Unknown");
        if ((sourceCount[sKey] || 0) < SOURCE_SATURATION_CAP) {
           interspersed.push(job);
           sourceCount[sKey] = (sourceCount[sKey] || 0) + 1;
        }
      }
    }

    // Secondary safety - if one bucket is empty, fill with the other
    if (buckets.VERIFIED.length === 0 && buckets.SOCIAL.length === 0) break;
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
