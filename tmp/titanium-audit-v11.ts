import { createDb } from "../packages/db/client";
import { opportunities, systemHealth, vitals, agencies, logs } from "../packages/db/schema";
import { sql, desc, eq, and, gt } from "drizzle-orm";

async function main() {
  const { db, client } = createDb();
  try {
    console.log("═══ TITANIUM SRE AUDIT V11 ═══");
    
    // 1. Data Integrity Audit
    const totalCount = await db.run(sql`SELECT COUNT(*) as count FROM opportunities`);
    const activeCount = await db.run(sql`SELECT COUNT(*) as count FROM opportunities WHERE is_active = 1`);
    const futureDrift = await db.run(sql`SELECT COUNT(*) as count FROM opportunities WHERE created_at > (strftime('%s', 'now') + 86400) * 1000`);
    
    console.log(`[DATA] Total Signals: ${totalCount.rows[0].count}`);
    console.log(`[DATA] Active Signals: ${activeCount.rows[0].count}`);
    console.log(`[DATA] Future Drift Detected: ${futureDrift.rows[0].count} signals.`);

    // 2. Telemetry Audit
    const health = await db.select().from(systemHealth);
    const healthyCount = health.filter(s => s.status === 'OK').length;
    const failedCount = health.filter(s => s.status === 'FAIL').length;
    
    console.log(`[TELEMETRY] Healthy Sources: ${healthyCount}`);
    console.log(`[TELEMETRY] Degraded Sources: ${failedCount}`);
    if (failedCount > 0) {
      console.log("FAILED SOURCES:", JSON.stringify(health.filter(s => s.status === 'FAIL').map(s => s.sourceName), null, 2));
    }

    // 3. Agency Priority Audit
    const topAgencies = await db.select({ name: agencies.name, heat: agencies.hiringHeat, friction: agencies.frictionLevel })
      .from(agencies)
      .where(eq(agencies.status, 'active'))
      .orderBy(desc(agencies.hiringHeat))
      .limit(5);
    
    console.log("[RANKING] Top 5 Agencies (Heat/Friction):", JSON.stringify(topAgencies, null, 2));

    // 4. Ingest Audit
    const latestLog = await db.select().from(logs).orderBy(desc(logs.timestamp)).limit(1);
    console.log(`[LOGS] Last Ingest Event: ${latestLog[0]?.message} at ${latestLog[0]?.timestamp}`);

    const isTitaniumHealthy = failedCount === 0 && futureDrift.rows[0].count === 0 && activeCount.rows[0].count > 100;
    console.log(`\nRESULT: ${isTitaniumHealthy ? "✅ TITANIUM HEALTH CONFIRMED" : "⚠️ SYSTEM DEGRADED"}`);

  } finally {
    await client.close();
  }
}

main();
