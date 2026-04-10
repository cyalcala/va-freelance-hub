import type { APIRoute } from 'astro';
import { db, schema, normalizeDate } from '@va-hub/db';
import { config } from '@va-hub/config';
import { sql, eq, gte, desc } from 'drizzle-orm';

export const prerender = false;

export const GET: APIRoute = async () => {
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    status: "HEALTHY",
    vitals: {}
  };

  let nonce = Math.random().toString(36).substring(7);

  try {
    const now = Date.now();
    const recentWindow = new Date(now - 24 * 60 * 60 * 1000);
    const { slo } = config;

    // 1. Core Signal Audit
    const stats = await db.select({
      total: sql<number>`count(*)`,
      newToday: sql<number>`sum(case when latest_activity_ms > (unixepoch('now', '-24 hours') * 1000) then 1 else 0 end)`,
      maxActivity: sql<number>`max(latest_activity_ms)`,
      maxScraped: sql<number>`max(scraped_at)`,
      maxLastSeen: sql<number>`max(last_seen_at)`,
      tier0: sql<number>`sum(case when tier = 0 then 1 else 0 end)`,
      tier1: sql<number>`sum(case when tier = 1 then 1 else 0 end)`,
      tier2: sql<number>`sum(case when tier = 2 then 1 else 0 end)`,
      tier3: sql<number>`sum(case when tier = 3 then 1 else 0 end)`,
      tier4: sql<number>`sum(case when tier = 4 then 1 else 0 end)`,
    }).from(schema.opportunities).where(eq(schema.opportunities.isActive, true));

    const { total, newToday, maxActivity, maxScraped, maxLastSeen, tier0, tier1, tier2, tier3, tier4 } = stats[0];

    // 2. Heartbeat Signal Audit (Goldilocks Regional)
    const allVitals = await db.select().from(schema.vitals);
    const globalVitals = allVitals.find(v => v.id === 'GLOBAL');
    
    const regionalHealth: Record<string, any> = {};
    const trackedRegions = config.regions || ['Philippines'];

    for (const regionName of trackedRegions) {
      const regionVitals = allVitals.find(v => v.region === regionName) || globalVitals;
      
      const processingHeartbeatMs = regionVitals?.lastProcessingHeartbeatMs || (regionVitals?.lockUpdatedAt ? normalizeDate(regionVitals.lockUpdatedAt).getTime() : 0);
      const ingestionHeartbeatMs = regionVitals?.lastIngestionHeartbeatMs || 0;

      const pAge = (now - processingHeartbeatMs) / 60000;
      const iAge = ingestionHeartbeatMs > 0 ? (now - ingestionHeartbeatMs) / 60000 : Infinity;

      let state = "FRESH";
      if (pAge >= slo.heartbeat_stale_minutes && iAge >= slo.heartbeat_stale_minutes) {
        state = "STALE";
      } else if (pAge >= slo.heartbeat_delayed_minutes || iAge >= slo.heartbeat_delayed_minutes) {
        state = "DELAYED";
      }
      
      if (pAge <= slo.heartbeat_delayed_minutes && iAge >= slo.heartbeat_suspect_window_minutes) {
        state = "SUSPECT_HEARTBEAT";
      }

      regionalHealth[regionName] = {
        state,
        pAge: Number(pAge.toFixed(2)),
        iAge: Number(iAge.toFixed(2)),
        source: regionVitals?.heartbeatSource || "unknown"
      };
    }

    const vitalsRow = globalVitals;
    const lastIngestion = normalizeDate(maxActivity);
    const lastHeartbeat = normalizeDate(maxScraped);

    const ingestionStalenessHrs = (now - lastIngestion.getTime()) / (1000 * 60 * 60);
    const dbStalenessHrs = (now - lastHeartbeat.getTime()) / (1000 * 60 * 60);

    const processingHeartbeatMs = vitalsRow?.lastProcessingHeartbeatMs || (vitalsRow?.lockUpdatedAt ? normalizeDate(vitalsRow.lockUpdatedAt).getTime() : lastHeartbeat.getTime());
    const ingestionHeartbeatMs = vitalsRow?.lastIngestionHeartbeatMs || (maxLastSeen ? normalizeDate(maxLastSeen).getTime() : maxActivity || 0);

    const processingAgeMinutes = (now - processingHeartbeatMs) / 60000;
    const ingestionAgeMinutes = ingestionHeartbeatMs > 0 ? (now - ingestionHeartbeatMs) / 60000 : Infinity;

    // Primary State Machine (Legacy/Global)
    let heartbeatState = "FRESH";
    if (processingAgeMinutes >= slo.heartbeat_stale_minutes && ingestionAgeMinutes >= slo.heartbeat_stale_minutes) {
      heartbeatState = "STALE";
    } else if (processingAgeMinutes >= slo.heartbeat_delayed_minutes || ingestionAgeMinutes >= slo.heartbeat_delayed_minutes) {
      heartbeatState = "DELAYED";
    }

    if (processingAgeMinutes <= slo.heartbeat_delayed_minutes && ingestionAgeMinutes >= slo.heartbeat_suspect_window_minutes) {
      heartbeatState = "SUSPECT_HEARTBEAT";
    }

    // 3. Throughput & Decisions Audit
    const recentLogs = await db
      .select({
        level: schema.logs.level,
        message: schema.logs.message,
        timestamp: schema.logs.timestamp,
      })
      .from(schema.logs)
      .where(gte(schema.logs.timestamp, recentWindow))
      .orderBy(desc(schema.logs.timestamp))
      .limit(500);

    // Filter throughput signals from logs
    const throughput = {
      claimed: recentLogs.filter(l => l.message.includes('Claimed')).length,
      plated: recentLogs.filter(l => l.message.includes('PLATED') || l.message.includes('plated')).length,
      rejected: recentLogs.filter(l => l.message.includes('REJECTED') || l.message.includes('rejected')).length,
      failed: recentLogs.filter(l => l.level === 'error' && (l.message.includes('CHEF') || l.message.includes('SWEEP'))).length,
    };

    const errorCount24h = recentLogs.filter((row) => row.level === "error").length;
    const warnCount24h = recentLogs.filter((row) => row.level === "warn").length;

    // 4. Drift Assessment
    const latestNotes = await db
      .select({
        timestamp: schema.noteslog.timestamp,
        actionsTaken: schema.noteslog.actionsTaken,
        driftMinutes: schema.noteslog.driftMinutes,
      })
      .from(schema.noteslog)
      .orderBy(desc(schema.noteslog.timestamp))
      .limit(10);

    diagnostics.vitals = {
      totalActive: total,
      isStale: dbStalenessHrs > slo.db_staleness_threshold_hrs || ingestionStalenessHrs > slo.ingestion_staleness_threshold_hrs,
      dbStalenessHrs: Number(dbStalenessHrs.toFixed(2)),
      ingestionStalenessHrs: Number(ingestionStalenessHrs.toFixed(2)),
      regions: regionalHealth,
      heartbeat: {
        state: heartbeatState,
        source: vitalsRow?.heartbeatSource || "legacy",
        lastIngestionHeartbeatMs: ingestionHeartbeatMs,
        lastProcessingHeartbeatMs: processingHeartbeatMs,
        ingestionAgeMinutes: Number(ingestionAgeMinutes.toFixed(2)),
        processingAgeMinutes: Number(processingAgeMinutes.toFixed(2)),
      },
      throughput: {
        ...throughput,
        avgDriftMinutes: latestNotes.length > 0
          ? Number((latestNotes.reduce((sum, item) => sum + (item.driftMinutes || 0), 0) / latestNotes.length).toFixed(2))
          : 0,
      },
      drift: {
        tierDistribution: {
          tier0: tier0 || 0,
          tier1: tier1 || 0,
          tier2: tier2 || 0,
          tier3: tier3 || 0,
          tier4: tier4 || 0,
        },
        logSignals24h: {
          errors: errorCount24h,
          warnings: warnCount24h,
        },
      },
      governance: {
        lockStatus: vitalsRow?.lockStatus || "UNKNOWN",
        budgetMode: config.budget_mode,
        triggerCreditsOk: Boolean(vitalsRow?.triggerCreditsOk ?? true),
        triggerLastExhaustion: vitalsRow?.triggerLastExhaustion
          ? normalizeDate(vitalsRow.triggerLastExhaustion).toISOString()
          : null,
      },
      sentinel: {
        lastInterventionAt: vitalsRow?.lastInterventionAt ? normalizeDate(vitalsRow.lastInterventionAt).toISOString() : null,
        lastInterventionReason: vitalsRow?.lastInterventionReason || "NONE",
        state: vitalsRow?.sentinelState ? JSON.parse(vitalsRow.sentinelState) : {}
      }
    };

    if (diagnostics.vitals.isStale || heartbeatState === "STALE" || heartbeatState === "SUSPECT_HEARTBEAT") {
      diagnostics.status = "DEGRADED ⚠️";
    }

    diagnostics.nonce = nonce;

  } catch (err: any) {
    diagnostics.status = "CRITICAL ❌";
    diagnostics.error = err.message;
  }

  return new Response(JSON.stringify(diagnostics, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
      "Pragma": "no-cache",
      "Expires": "0",
      "X-Sentinel-Nonce": nonce,
      "X-Sentinel-Verified": "true"
    },
  });
};
