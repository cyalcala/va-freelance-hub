import { db } from "../packages/db";
import { opportunities } from "../packages/db/schema";
import { supabase } from "../packages/db/supabase";
import { sql, desc, gte, eq } from "drizzle-orm";

async function runMasterAudit() {
  console.log("🕵️‍♂️ SYSTEM AUDIT: Starting Master Health Check...");
  const report: any = {
    supabase: { last_24h: {} },
    turso: { last_24h: {} },
    ai_mesh: { cooldowns: [] },
    velocity: {}
  };

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // 1. Supabase Pulse (Raw Jobs)
  console.log("📡 Querying Supabase Staging Buffer...");
  const { data: rawJobs, error } = await supabase
    .from("raw_job_harvests")
    .select("status, created_at")
    .gte("created_at", yesterday);

  if (error) {
    console.error("❌ Supabase Query Failed:", error.message);
  } else {
    report.supabase.last_24h = {
      TOTAL: rawJobs.length,
      RAW: rawJobs.filter(j => j.status === 'RAW').length,
      LEAD: rawJobs.filter(j => j.status === 'LEAD').length,
      PROCESSING: rawJobs.filter(j => j.status === 'PROCESSING').length,
      PLATED: rawJobs.filter(j => j.status === 'PLATED').length,
      FAILED: rawJobs.filter(j => j.status === 'FAILED').length,
    };
  }

  // 2. AI Mesh Health (Cooldowns)
  console.log("🧠 Checking AI Provider Cooldowns...");
  const { data: cooldowns } = await supabase
    .from("ai_cooldowns")
    .select("*");
  
  report.ai_mesh.cooldowns = cooldowns || [];

  // 3. Turso Consistency (Plated Opportunities)
  console.log("📀 Checking Turso Vault (Opportunities)...");
  const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentPlates = await db
    .select({
      source: opportunities.sourcePlatform,
      count: sql<number>`count(*)`
    })
    .from(opportunities)
    .where(gte(opportunities.scrapedAt, yesterdayDate))
    .groupBy(opportunities.sourcePlatform);
  
  report.turso.last_24h = recentPlates;

  // 4. Comparison Summary
  console.log("\n--- AUDIT RESULTS ---");
  console.log(`Supabase Jobs (24h): ${report.supabase.last_24h.TOTAL} total | ${report.supabase.last_24h.PLATED} PLATED | ${report.supabase.last_24h.FAILED} FAILED`);
  
  if (report.supabase.last_24h.FAILED > 0) {
    console.warn(`🚨 WARNING: ${report.supabase.last_24h.FAILED} jobs failed in the last 24h!`);
  }

  console.log("\nAI Mesh Status:");
  report.ai_mesh.cooldowns.forEach((c: any) => {
    const status = c.is_blocked ? "🔴 BLOCKED" : "🟢 OK";
    console.log(`- ${c.provider_name.padEnd(15)}: ${status} | Retries: ${c.error_count}`);
  });

  console.log("\nTurso Plating Attribution (24h):");
  recentPlates.forEach(p => {
    console.log(`- ${p.source?.padEnd(25)}: ${p.count} inserted`);
  });

  const inngestCount = recentPlates.find(p => p.source?.includes('V12 Mesh'))?.count || 0;
  const triggerCount = recentPlates.find(p => p.source?.includes('Trigger Sifter'))?.count || 0;

  console.log("\nVelocity Gauge:");
  console.log(`- Inngest (V12 Mesh): ${inngestCount} jobs/24h`);
  console.log(`- Trigger (Sous Chef): ${triggerCount} jobs/24h`);

  if (inngestCount > 0 && triggerCount > 0) {
    console.log("🔥 BOTH ARE COOKING! Redundancy confirmed.");
  } else if (inngestCount > 0) {
    console.log("👨‍🍳 Inngest is doing the heavy lifting. Trigger is quiet.");
  } else if (triggerCount > 0) {
    console.log("👨‍🍳 Trigger is doing the heavy lifting. Inngest is quiet.");
  } else {
    console.warn("❄️ THE KITCHEN IS COLD. No jobs plated in 24h.");
  }

  process.exit(0);
}

runMasterAudit();
