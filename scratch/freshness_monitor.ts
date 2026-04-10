import { db, schema, normalizeDate } from "../packages/db";
import { sql, desc } from "drizzle-orm";

async function monitorFreshness() {
  console.log("═══ SRE FRESHNESS MONITOR: INGESTION PULSE ═══");
  
  try {
    const now = Date.now();
    
    // 1. Check clusters of 'lastSeenAt'
    const query = sql`
      SELECT 
        datetime(last_seen_at/1000, 'unixepoch') as batch_time,
        count(*) as job_count
      FROM opportunities
      WHERE last_seen_at > ${now - 4 * 3600000} -- Last 4 hours
      GROUP BY batch_time
      ORDER BY batch_time DESC
    `;
    
    const results = await db.run(query);
    
    console.log("\n[1/2] LAST 4-HOUR INGESTION BATCHES");
    if (results.rows && results.rows.length > 0) {
      results.rows.forEach((row: any) => {
        console.log(`- Batch: ${row.batch_time} | Count: ${row.job_count}`);
      });
    } else {
      console.log("- No ingestion batches detected in the last 4 hours.");
    }

    // 2. High-Fidelity Pulse Check (minutes since last plating)
    const latest = await db.select({
      lastSeen: schema.opportunities.lastSeenAt
    }).from(schema.opportunities).orderBy(desc(schema.opportunities.lastSeenAt)).limit(1);
    
    console.log("\n[2/2] PULSE CHECK");
    if (latest.length > 0 && latest[0].lastSeen) {
      const ms = normalizeDate(latest[0].lastSeen).getTime();
      const mins = (now - ms) / 60000;
      console.log(`- Last Plating: ${mins.toFixed(2)} minutes ago`);
      
      if (mins < 45) {
        console.log("✅ PULSE NOMINAL: Within the 30m (+15m buffer) SLO.");
      } else {
        console.log("⚠️ PULSE STALE: Exceeds the 30m target.");
      }
    } else {
      console.log("❌ PULSE LOST: Vault is currently empty.");
    }

  } catch (err: any) {
    console.error("❌ Freshness Monitor Failure:", err.message);
  }
  
  console.log("\n═══ FRESHNESS MONITOR COMPLETE ═══");
}

monitorFreshness();
