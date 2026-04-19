import { db } from '../packages/db';
import { logs, vitals, opportunities } from '../packages/db/schema';
import { desc, sql } from 'drizzle-orm';

async function check() {
  console.log("--- LATEST LOGS ---");
  const latestLogs = await db.select().from(logs).orderBy(desc(logs.timestamp)).limit(20);
  latestLogs.forEach(l => {
    console.log(`[${l.timestamp.toISOString()}] [${l.level}] ${l.message}`);
  });

  console.log("\n--- OPPORTUNITIES STATS ---");
  const totalResult = await db.run(sql`SELECT count(*) as n FROM opportunities`);
  const last24hResult = await db.run(sql`SELECT count(*) as n FROM opportunities WHERE scraped_at > (unixepoch('now', '-24 hours') * 1000)`);
  const activeResult = await db.run(sql`SELECT count(*) as n FROM opportunities WHERE is_active = 1`);
  
  console.log(`Total: ${totalResult.rows[0].n}`);
  console.log(`New (24h): ${last24hResult.rows[0].n}`);
  console.log(`Active: ${activeResult.rows[0].n}`);

  console.log("\n--- VITALS ---");
  const allVitals = await db.select().from(vitals);
  console.table(allVitals.map(v => ({
    id: v.id,
    region: v.region,
    ingestHB: v.lastIngestionHeartbeatMs ? new Date(v.lastIngestionHeartbeatMs).toISOString() : 'N/A',
    procHB: v.lastProcessingHeartbeatMs ? new Date(v.lastProcessingHeartbeatMs).toISOString() : 'N/A',
    lock: v.lockStatus,
    lastHarvest: v.lastHarvestAt ? new Date(v.lastHarvestAt).toISOString() : 'N/A',
    engine: v.lastHarvestEngine
  })));
}

check().catch(console.error);
