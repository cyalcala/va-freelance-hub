import { db, schema } from '../packages/db/client';
import { desc, sql } from 'drizzle-orm';

async function audit() {
  console.log("--- DATABASE AUDIT ---");
  
  // 1. Check Vitals
  const allVitals = await db.select().from(schema.vitals);
  console.log("\n[VITALS STATE]");
  console.table(allVitals.map(v => ({
    id: v.id,
    region: v.region,
    lastIngestion: v.lastIngestionHeartbeatMs ? new Date(v.lastIngestionHeartbeatMs).toISOString() : 'NEVER',
    lastProcessing: v.lastProcessingHeartbeatMs ? new Date(v.lastProcessingHeartbeatMs).toISOString() : 'NEVER',
    engine: v.lastHarvestEngine,
    creditsOk: v.triggerCreditsOk
  })));

  // 2. Check Latest Opportunities
  const latestJobs = await db.select({
    id: schema.opportunities.id,
    title: schema.opportunities.title,
    company: schema.opportunities.company,
    niche: schema.opportunities.niche,
    latestActivityMs: schema.opportunities.latestActivityMs,
    created: schema.opportunities.createdAt,
    lastSeen: schema.opportunities.lastSeenAt
  })
  .from(schema.opportunities)
  .orderBy(desc(schema.opportunities.latestActivityMs))
  .limit(10);

  console.log("\n[LATEST JOBS BY latestActivityMs]");
  console.table(latestJobs.map(j => ({
    title: j.title.substring(0, 30),
    company: j.company,
    latestActivity: new Date(j.latestActivityMs).toISOString(),
    created: j.created?.toISOString(),
    lastSeen: j.lastSeen?.toISOString()
  })));

  // 3. Count Jobs by Niche
  const nicheCounts = await db.select({
    niche: schema.opportunities.niche,
    count: sql<number>`count(*)`
  })
  .from(schema.opportunities)
  .groupBy(schema.opportunities.niche);
  
  console.log("\n[NICHE COUNTS]");
  console.table(nicheCounts);

  // 4. Check Logs
  const latestLogs = await db.select().from(schema.logs).orderBy(desc(schema.logs.timestamp)).limit(5);
  console.log("\n[LATEST LOGS]");
  console.table(latestLogs.map(l => ({
    time: l.timestamp?.toISOString(),
    level: l.level,
    message: l.message
  })));
}

audit().catch(console.error);
