import { db, schema, normalizeDate } from './index';
import { sql, eq, and } from 'drizzle-orm';

async function majorHealthCheck() {
  console.log("🍉 Starting Major Health Check & Watermelon Audit...");
  
  const audit: any = {
    integrity: {},
    watermelons: [],
    ratholes: [],
    pulse: {}
  };

  try {
    // 1. Data Integrity Audit
    const stats = await db.select({
      total: sql<number>`count(*)`,
      missingLinks: sql<number>`sum(case when source_url is null or source_url = '' then 1 else 0 end)`,
      missingCompany: sql<number>`sum(case when company is null or company = '' then 1 else 0 end)`,
      platinumCount: sql<number>`sum(case when tier = 0 then 1 else 0 end)`,
      goldCount: sql<number>`sum(case when tier = 1 then 1 else 0 end)`,
      staleSignals: sql<number>`sum(case when latest_activity_ms < unixepoch('now', '-7 days') * 1000 then 1 else 0 end)`,
    }).from(schema.opportunities).where(eq(schema.opportunities.isActive, true));

    audit.integrity = stats[0];

    // 2. "Watermelon" Detection (Ghost Jobs)
    // Find jobs that haven't been successfully verified in > 72h but are still marked active
    const watermelons = await db.select()
      .from(schema.opportunities)
      .where(and(
        eq(schema.opportunities.isActive, true),
        sql`scraped_at < unixepoch('now', '-72 hours') * 1000`
      ))
      .limit(20);
    
    audit.watermelons = watermelons.map(w => ({ 
        id: w.id, 
        title: w.title, 
        company: w.company, 
        ageHrs: ((Date.now() - normalizeDate(w.latestActivityMs || 0).getTime()) / 3600000).toFixed(1) 
    }));

    // 3. Scraper Yield Audit (Rathole Detection)
    const yieldStats = await db.select({
      platform: schema.opportunities.sourcePlatform,
      count: sql<number>`count(*)`,
      highIntent: sql<number>`sum(case when tier < 2 then 1 else 0 end)`
    }).from(schema.opportunities)
      .groupBy(schema.opportunities.sourcePlatform);

    audit.ratholes = yieldStats.filter(s => (s.highIntent / s.count) < 0.05).map(s => ({
      platform: s.platform,
      total: s.count,
      highIntent: s.highIntent,
      yield: ((s.highIntent / (s.count || 1)) * 100).toFixed(1) + "%"
    }));

    // 4. Silent Failure Check (Pulse)
    const timingPulse = await db.select({
      lastCreated: sql<number>`max(created_at)`,
      lastScraped: sql<number>`max(scraped_at)`
    }).from(schema.opportunities);

    audit.pulse = {
      ingestionLagHrs: ((Date.now() - normalizeDate(timingPulse[0].lastCreated || 0).getTime()) / 3600000).toFixed(1),
      scraperLagHrs: ((Date.now() - normalizeDate(timingPulse[0].lastScraped || 0).getTime()) / 3600000).toFixed(1)
    };

    console.log("\n--- AUDIT RESULTS ---");
    console.log(JSON.stringify(audit, null, 2));
    console.log("---------------------\n");

    if (audit.watermelons.length > 0) {
        console.warn(`⚠️ ALERT: ${audit.watermelons.length} watermelons detected. These signals are likely dead links or ghost jobs.`);
    }

    if (audit.pulse.ingestionLagHrs > 24) {
        console.warn(`🚨 CRITICAL: Ingestion engine appears stalled (lag: ${audit.pulse.ingestionLagHrs}h).`);
    }

  } catch (err: any) {
    console.error("❌ Audit Failed:", err.message);
  }
}

majorHealthCheck();
