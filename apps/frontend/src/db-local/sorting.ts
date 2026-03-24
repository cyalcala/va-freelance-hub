import { db, schema } from './client';
import { desc, not, eq } from 'drizzle-orm';

/**
 * PH-First Decay Algorithm
 * 1. Fetches top 200 candidates by activity.
 * 2. Ranks by Tier Gravity (Tier difference = 24h age penalty).
 * 3. Returns top N signals.
 */
export async function getSortedSignals(limit = 50) {
  const now = Date.now();
  
  const candidates = await db.select()
    .from(schema.opportunities)
    .where(not(eq(schema.opportunities.tier, 4)))
    .orderBy(desc(schema.opportunities.latestActivityMs))
    .limit(200);

  return candidates
    .map(sig => {
      const ageMs = now - (sig.latestActivityMs || 0);
      // PH-First Decay Algorithm: Platinum (Tier 0) stays above brand new Gold (Tier 1) for 24 hours.
      const tierGravity = (sig.tier ?? 3) * 24.0;
      const agePenalty = ageMs <= 900000 ? -12.0 : ageMs / 3600000.0; // -12h boost for 15min freshness
      const score = tierGravity + agePenalty;
      return { ...sig, sortScore: score };
    })
    .sort((a, b) => a.sortScore - b.sortScore)
    .slice(0, limit);
}
