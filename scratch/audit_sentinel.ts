import "dotenv/config";
import { db } from "../packages/db/client";
import { opportunities, systemHealth, vitals, logs } from "../packages/db/schema";
import { sql, desc, eq, and, gte, lt, count } from "drizzle-orm";
import { normalizeDate } from "../packages/db";

/**
 * VA.INDEX SITE-WIDE AUDIT SENTINEL
 * "The Hard Way and Reliable Way"
 */

async function performAudit() {
  console.log("═══ VA.INDEX PRODUCTION DATA AUDIT ═══");
  const now = new Date();
  const summary: any = {
    timestamp: now.toISOString(),
    status: "UNKNOWN",
    vitals: {},
    data: {},
    health: {},
    math: {},
  };

  try {
    // 1. DATA AUDIT (Opportunities)
    console.log("Checking signals...");
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const [totalActive] = await db.select({ count: count() }).from(opportunities).where(eq(opportunities.isActive, true));
    const [fresh24h] = await db.select({ count: count() }).from(opportunities).where(and(eq(opportunities.isActive, true), gte(opportunities.lastSeenAt, twentyFourHoursAgo)));
    const [stale48hPlus] = await db.select({ count: count() }).from(opportunities).where(and(eq(opportunities.isActive, true), lt(opportunities.lastSeenAt, fortyEightHoursAgo)));

    summary.data = {
      totalActiveSignals: totalActive.count,
      fresh24h: fresh24h.count,
      stale48hPlus: stale48hPlus.count,
      purityScore: totalActive.count > 0 ? Math.round(((totalActive.count - stale48hPlus.count) / totalActive.count) * 100) : 0,
    };

    // 2. TIER DISTRIBUTION
    const tiers = await db.select({ tier: opportunities.tier, count: count() }).from(opportunities).where(eq(opportunities.isActive, true)).groupBy(opportunities.tier);
    summary.data.tierDistribution = tiers.reduce((acc: any, t) => {
      acc[t.tier] = t.count;
      return acc;
    }, {});

    // 3. SOURCE HEALTH (System Health Table)
    console.log("Checking systems...");
    const healthRecords = await db.select().from(systemHealth);
    summary.health = healthRecords.map(r => ({
      source: r.sourceName,
      status: r.status,
      lastSuccess: r.lastSuccess,
      errors: r.consecutiveFailures,
    }));

    // 4. MATH & USAGE (Vitals Table)
    console.log("Checking math & limits...");
    const globalVital = await db.select().from(vitals).where(eq(vitals.id, "titanium_central")).limit(1);
    const triggerVital = await db.select().from(vitals).where(eq(vitals.id, "GLOBAL")).limit(1);
    
    const vital = globalVital[0] || {};
    const trigger = triggerVital[0] || {};

    summary.math = {
      aiQuota: {
        count: vital.aiQuotaCount || 0,
        cap: 1000,
        remaining: 1000 - (vital.aiQuotaCount || 0),
        status: (vital.aiQuotaCount || 0) >= 1000 ? "EXHAUSTED" : "OK",
      },
      trigger: {
        status: trigger.triggerCreditsOk ? "OK" : "PAUSED",
        lastExhaustion: trigger.triggerLastExhaustion,
      },
      lockStatus: vital.lockStatus || "IDLE",
    };

    // 5. HEARTBEAT AUDIT
    const heartbeatRegion = await db.select().from(vitals).where(eq(vitals.id, "HEARTBEAT_Philippines")).limit(1);
    const hb = heartbeatRegion[0] || {};
    const lastPulseMs = hb.lastIngestionHeartbeatMs || 0;
    const pulseAgeMin = Math.round((Date.now() - lastPulseMs) / 60000);

    summary.vitals = {
      lastIngestionHeartbeat: lastPulseMs > 0 ? new Date(lastPulseMs).toISOString() : "NEVER",
      pulseAgeMin,
      isSystemPulsing: pulseAgeMin < 60, // Consider pulsing if seen in last hour
      isStale: pulseAgeMin > 120, // Critical alert if > 2 hours
    };

    summary.status = (summary.vitals.isStale || summary.math.trigger.status === "PAUSED") ? "DEGRADED" : "HEALTHY";

    console.log("\n═══ AUDIT COMPLETE ═══");
    console.log(JSON.stringify(summary, null, 2));

  } catch (err) {
    console.error("Audit failed:", err);
  } finally {
    process.exit(0);
  }
}

performAudit();
