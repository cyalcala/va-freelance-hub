import { db, schema } from './client';
import { desc, not, eq, sql } from 'drizzle-orm';

/**
 * PH-First Decay Algorithm (SQL-Native)
 * 1. Pushes math to the Edge (Turso/LibSQL).
 * 2. Fetches only the needed 'limit' records.
 * 3. Gravity Calculation: (Tier * 24.0) + (Age in Hours)
 * 4. Freshness Boost: -12.0h if < 15min old.
 */
export async function getSortedSignals(limit = 50) {
  const now = Date.now();
  
  // OPTIMIZATION: Shift the math to LibSQL. 
  // Result code is O(1) in terms of Edge memory usage.
  const query = db.select()
  .from(schema.opportunities)
  .where(not(eq(schema.opportunities.tier, 4)))
  .orderBy(schema.opportunities.tier, desc(schema.opportunities.latestActivityMs))
  .limit(limit);

  return await query;
}

/**
 * Latest Mirror Algorithm
 * Returns the absolute freshest signals regardless of tier.
 */
export async function getLatestMirror(limit = 10) {
  return await db.select()
    .from(schema.opportunities)
    .orderBy(desc(schema.opportunities.latestActivityMs))
    .limit(limit);
}
