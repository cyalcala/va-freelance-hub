import { db, schema } from './client';
import { desc, not, eq } from 'drizzle-orm';

// Simple in-memory cache: 15 seconds to prevent hammering Turso during traffic bursts
let cache: { data: any[], timestamp: number } | null = null;
const CACHE_TTL = 15000;

/**
 * PH-First Decay Algorithm
 * Optimized for "Snap-Fast" SSR injection.
 */
export async function getSortedSignals(limit = 50) {
  const now = Date.now();
  
  if (cache && (now - cache.timestamp) < CACHE_TTL) {
    return cache.data.slice(0, limit);
  }

  const start = Date.now();
  const candidates = await db.select()
    .from(schema.opportunities)
    .where(not(eq(schema.opportunities.tier, 4)))
    .orderBy(desc(schema.opportunities.latestActivityMs))
    .limit(100); // Fetch less to speed up Turso response
  
  const duration = Date.now() - start;
  if (duration > 500) console.warn(`⚠️ Slow Query: getSortedSignals took ${duration}ms`);

  const sorted = candidates
    .map(sig => {
      const ageMs = now - (sig.latestActivityMs || 0);
      const tierGravity = (sig.tier ?? 3) * 24.0;
      const agePenalty = ageMs <= 900000 ? -12.0 : ageMs / 3600000.0;
      return { ...sig, sortScore: tierGravity + agePenalty };
    })
    .sort((a, b) => a.sortScore - b.sortScore);

  cache = { data: sorted, timestamp: now };
  return sorted.slice(0, limit);
}

/**
 * Ultra-Fast Mirror Query
 * Bypasses decay algorithm for 0ms perceived latency.
 */
export async function getLatestMirror(limit = 10) {
  const result = await db.select()
    .from(schema.opportunities)
    .where(not(eq(schema.opportunities.tier, 4)))
    .orderBy(desc(schema.opportunities.latestActivityMs))
    .limit(limit);
  
  return result;
}
