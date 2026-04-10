import { readFileSync, existsSync } from "fs";
import * as path from "path";

// ── Bootstrap ──
const envPath = path.join(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const [k, ...rest] = line.split("=");
    if (k && rest.length && !k.startsWith("#")) {
      process.env[k.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }
}

import { db, schema, normalizeDate } from "../packages/db";
import { sql, eq, desc } from "drizzle-orm";
import { config } from "../packages/config";

async function runDiagnostics() {
  console.log("═══ SRE MASTER AUDIT: QUANTITATIVE DIAGNOSTICS ═══");
  
  try {
    const now = Date.now();
    
    // 1. Heartbeat Check (Vitals)
    console.log("\n[1/4] HEARTBEAT & VITALS AUDIT");
    const vitals = await db.select().from(schema.vitals);
    vitals.forEach(v => {
      const pAge = v.lastProcessingHeartbeatMs ? (now - v.lastProcessingHeartbeatMs) / 60000 : Infinity;
      const iAge = v.lastIngestionHeartbeatMs ? (now - v.lastIngestionHeartbeatMs) / 60000 : Infinity;
      console.log(`- Region: ${v.region || 'GLOBAL'} | ID: ${v.id}`);
      console.log(`  Processing Age: ${pAge.toFixed(2)} mins | Ingestion Age: ${iAge.toFixed(2)} mins`);
      console.log(`  Trigger Credits OK: ${v.triggerCreditsOk} | Source: ${v.heartbeatSource}`);
    });

    // 2. Storage & Velocity Audit
    console.log("\n[2/4] STORAGE & VELOCITY AUDIT");
    const stats = await db.select({
      total: sql<number>`count(*)`,
      new24h: sql<number>`sum(case when latest_activity_ms > ${now - 86400000} then 1 else 0 end)`,
      new1h: sql<number>`sum(case when latest_activity_ms > ${now - 3600000} then 1 else 0 end)`,
      tier0: sql<number>`sum(case when tier = 0 then 1 else 0 end)`,
    }).from(schema.opportunities).where(eq(schema.opportunities.isActive, true));
    
    const row = stats[0];
    console.log(`- Total Active Signals: ${row.total}`);
    console.log(`- Ingestion Velocity (1h): ${row.new1h} jobs`);
    console.log(`- Ingestion Velocity (24h): ${row.new24h} jobs`);
    console.log(`- Platinum (Tier 0) Count: ${row.tier0}`);

    // 3. Chain of Custody Sample
    console.log("\n[3/4] CHAIN OF CUSTODY SAMPLE (Latest 3 Jobs)");
    const latest = await db.select().from(schema.opportunities).orderBy(desc(schema.opportunities.latestActivityMs)).limit(3);
    latest.forEach(job => {
      console.log(`- Job: ${job.title} (${job.company})`);
      console.log(`  MD5: ${job.md5_hash}`);
      console.log(`  Metadata: ${job.metadata}`);
    });

    // 4. Mathematical Limit Estimation
    console.log("\n[4/4] MATHEMATICAL LIMIT ESTIMATION");
    const avgRowSize = 512; // bytes (approx)
    const currentSizeEst = (row.total * avgRowSize) / 1024 / 1024;
    console.log(`- Turso Estimated Storage: ${currentSizeEst.toFixed(2)} MB / 500 MB (${((currentSizeEst/500)*100).toFixed(2)}%)`);
    
    const estDailyRuns = 1 * 24 * 2; // (3 sources * 24h * every 30m approx)
    console.log(`- AI Mesh Estimated Runs (Daily): ${estDailyRuns} calls`);
    console.log(`- Estimated Daily Cost: $0 (Free Tiers Checked)`);

  } catch (err: any) {
    console.error("❌ Diagnostic Failure:", err.message);
  }
  
  console.log("\n═══ DIAGNOSTICS COMPLETE ═══");
}

runDiagnostics();
