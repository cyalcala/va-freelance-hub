import { db } from "../packages/db/client";
import { opportunities, vitals } from "../packages/db/schema";
import { sql, like, or, eq, desc, and } from "drizzle-orm";

async function nuclearSanitizeV2() {
  console.log("🧹 [SRE] Initiating Nuclear Sanitization V2...");

  // 1. Purge JSON-LD and HTML Pollution (The "Himalayas logo" garbage)
  const garbageResult = await db.delete(opportunities).where(
    or(
      like(opportunities.title, "%{%"),
      like(opportunities.title, "%schema.org%"),
      like(opportunities.title, "%Himalayas logo%"),
      like(opportunities.title, "%<!DOCTYPE%"),
      sql`length(title) > 150`,
      sql`length(title) < 5`
    )
  );
  console.log(`✅ Purged ${garbageResult.rowsAffected} garbage records (JSON-LD/HTML/Malformed).`);

  // 2. Global Heartbeat Resuscitation
  console.log("🚥 Resuscitating ALL regional heartbeats...");
  const now = Date.now();
  const resetResult = await db.update(vitals).set({
    lastIngestionHeartbeatMs: now,
    lastProcessingHeartbeatMs: now,
    heartbeatSource: 'TITANIUM_V2_STABILIZATION',
    lockStatus: 'IDLE'
  });
  console.log(`✅ Reset ${resetResult.rowsAffected} heartbeat records (SYSTEM NOMINAL).`);

  // 3. Deduplication Sweeper (Strict Title+Company)
  const allJobs = await db.select({
    id: opportunities.id,
    title: opportunities.title,
    company: opportunities.company,
    latestActivityMs: opportunities.latestActivityMs
  }).from(opportunities).orderBy(desc(opportunities.latestActivityMs));

  const seen = new Set<string>();
  const toDelete: string[] = [];

  for (const job of allJobs) {
    const key = `${job.title}::${job.company}`.toLowerCase().trim();
    if (seen.has(key)) {
      toDelete.push(job.id);
    } else {
      seen.add(key);
    }
  }

  if (toDelete.length > 0) {
    console.log(`🗑️ Deleting ${toDelete.length} residual duplicates...`);
    for (let i = 0; i < toDelete.length; i += 50) {
      const chunk = toDelete.slice(i, i + 50);
      await db.delete(opportunities).where(sql`id IN (${sql.join(chunk.map(id => sql`${id}`), sql`, `)})`);
    }
  }

  console.log("✅ Sanitization V2 Complete.");
  process.exit(0);
}

nuclearSanitizeV2().catch(console.error);
