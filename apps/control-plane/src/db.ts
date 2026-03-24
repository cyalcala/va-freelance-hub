import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../../../packages/db/schema.js";

// We'll use the environment variables from the root .env
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error(`[control-plane/db] ❌ Missing TURSO_DATABASE_URL or AUTH_TOKEN!`);
} else {
  console.log(`[control-plane/db] ✅ DB Connection strings detected.`);
}

const client = createClient({
  url: url || "file::memory:",
  authToken: authToken || "",
});

export const db = drizzle(client, { schema });
export { schema };

/**
 * PH-First Decay Algorithm (Local for Build Stability)
 */
export async function getSortedSignals(limit = 50) {
  const now = Date.now();
  const candidates = await db.select()
    .from(schema.opportunities)
    .orderBy(schema.opportunities.latestActivityMs)
    .limit(200);

  return candidates
    .filter(sig => sig.tier !== 4)
    .map((sig: any) => {
      const ageMs = now - (sig.latestActivityMs || 0);
      const tierGravity = (sig.tier ?? 3) * 24.0;
      const agePenalty = ageMs <= 900000 ? -12.0 : ageMs / 3600000.0;
      const score = tierGravity + agePenalty;
      return { ...sig, sortScore: score };
    })
    .sort((a, b) => a.sortScore - b.sortScore)
    .slice(0, limit);
}

/**
 * Ultra-Fast Mirror Query
 * Bypasses decay algorithm for 0ms perceived latency.
 */
export async function getLatestMirror(limit = 10) {
  return await db.select()
    .from(schema.opportunities)
    .where(not(eq(schema.opportunities.tier, 4)))
    .orderBy(desc(schema.opportunities.latestActivityMs))
    .limit(limit);
}
