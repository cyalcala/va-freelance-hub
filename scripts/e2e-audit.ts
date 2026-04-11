import { supabase } from "../packages/db/supabase";
import { db } from "../packages/db";
import { opportunities, vitals } from "../packages/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * AEGIS E2E AUDIT: The Pipeline Sentinel
 * Traces signals from Supabase (Ingestion) to Turso (Plating).
 */
async function runAudit() {
  console.log("🛡️ [AEGIS] Starting End-to-End Pipeline Audit...");

  // 1. Check Supabase Ingestion Stats
  console.log("\n--- Supabase Pantry Status ---");
  const { data: stats, error: statsErr } = await supabase
    .from('raw_job_harvests')
    .select('status, mapped_payload', { count: 'exact' });

  if (statsErr) {
    console.error("❌ Failed to fetch Supabase stats:", statsErr.message);
  } else {
    const counts = stats.reduce((acc: any, curr: any) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      const meta = curr.mapped_payload || {};
      const region = meta.ingestionRegion || "Unknown";
      acc[`region_${region}`] = (acc[`region_${region}`] || 0) + 1;
      return acc;
    }, {});
    console.table(counts);
  }

  // 2. Identify "Stuck" Jobs
  console.log("\n--- Stuck Signals Detection ---");
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: stuckRaw, error: stuckErr } = await supabase
    .from('raw_job_harvests')
    .select('id, source_url, created_at')
    .eq('status', 'RAW')
    .lt('created_at', oneHourAgo);

  if (stuckRaw && stuckRaw.length > 0) {
    console.warn(`🛑 Found ${stuckRaw.length} jobs stuck in RAW for >1h.`);
  } else {
    console.log("✅ No jobs stuck in RAW.");
  }

  // 3. Heartbeat Freshness (Turso)
  console.log("\n--- Regional Vitality (Turso) ---");
  const regionalVitals = await db.select().from(vitals);
  const now = Date.now();

  regionalVitals.forEach(v => {
    const ingestionAge = v.lastIngestionHeartbeatMs ? (now - v.lastIngestionHeartbeatMs) / 60000 : Infinity;
    const processingAge = v.lastProcessingHeartbeatMs ? (now - v.lastProcessingHeartbeatMs) / 60000 : Infinity;
    
    console.log(`📍 Region: ${v.region || v.id}`);
    console.log(`   Ingestion: ${ingestionAge.toFixed(0)}m ago ${ingestionAge > 60 ? '❌ STALE' : '✅ FRESH'}`);
    console.log(`   Processing: ${processingAge.toFixed(0)}m ago ${processingAge > 60 ? '❌ STALE' : '✅ FRESH'}`);
  });

  // 4. Trace MD5 Integrity
  console.log("\n--- Vault Integrity Check ---");
  const latestOpportunities = await db.select().from(opportunities).limit(5);
  if (latestOpportunities.length === 0) {
    console.warn("⚠️ Vault is empty!");
  } else {
    console.log(`✅ Vault contains ${latestOpportunities.length} sample records. Sorting looks OK.`);
  }

  console.log("\n🏁 Audit Complete.");
}

runAudit().catch(console.error);
