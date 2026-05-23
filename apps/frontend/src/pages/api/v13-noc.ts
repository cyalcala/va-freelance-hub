import { db } from "@va-hub/db";
import { vitals, logs } from "@va-hub/db/schema";
import { desc, eq } from "drizzle-orm";

export const prerender = false;

export async function GET() {
  const [globalVitals] = await db.select().from(vitals).where(eq(vitals.id, 'GLOBAL')).limit(1);
  const regionVitals = await db.select().from(vitals).limit(10);
  const recentLogs = await db.select().from(logs).orderBy(desc(logs.timestamp)).limit(20);

  const now = Date.now();

  const engines = [
    { name: 'Inngest', lastPulse: globalVitals.lastHarvestEngine === 'inngest' ? globalVitals.lastHarvestAt : null },
    { name: 'Trigger.dev', lastPulse: globalVitals.lastHarvestEngine === 'trigger' ? globalVitals.lastHarvestAt : null },
    { name: 'Sentinel', lastPulse: globalVitals.lastInterventionAt }
  ];

  return new Response(JSON.stringify({
    consensus: {
      seat: globalVitals.lastHarvestEngine,
      lastPulse: globalVitals.lastHarvestAt,
      isStale: (now - (globalVitals.lastHarvestAt?.getTime() || 0)) > 45 * 60 * 1000,
      driftMs: now - (globalVitals.lastHarvestAt?.getTime() || 0)
    },
    intelligence: {
      budgetMode: globalVitals.sentinelState ? JSON.parse(globalVitals.sentinelState).ai_quota_override : 'normal',
      qualityScore: globalVitals.qualityScore
    },
    engines,
    regions: regionVitals.map(r => ({
        id: r.id,
        heartbeat: r.lastIngestionHeartbeatMs,
        engine: r.lastHarvestEngine
    })),
    recentActivity: recentLogs.map(l => ({
        ts: l.timestamp,
        msg: l.message,
        lvl: l.level
    }))
  }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
