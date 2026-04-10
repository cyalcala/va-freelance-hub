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

import { claimRawJob, supabase } from "../packages/db/supabase";
import { AIMesh } from "../packages/ai/ai-mesh";
import { db } from "../packages/db";
import { opportunities } from "../packages/db/schema";
import { eq } from "drizzle-orm";
import { createHash, randomUUID } from "crypto";
import { siftOpportunity, OpportunityTier } from "../src/core/sieve";

async function runManualChef() {
  console.log("═══ EMERGENCY SRE DEFIBRILLATOR: MANUAL CHEF ═══");
  
  const BATCH_SIZE = 10;
  const MAX_CYCLES = 3; // Let's start with 30 jobs to verify the pipe is clear
  
  for (let cycle = 1; cycle <= MAX_CYCLES; cycle++) {
    console.log(`\n[CYCLE ${cycle}/${MAX_CYCLES}] Claiming ${BATCH_SIZE} jobs...`);
    
    // 1. Claim from Supabase
    const jobs = await claimRawJob("emergency-defibrillator", BATCH_SIZE);
    
    if (!jobs || jobs.length === 0) {
      console.log("- No RAW jobs found in Supabase. Pantry is clear?");
      break;
    }

    console.log(`- Claimed ${jobs.length} jobs. Starting AI Extraction...`);

    for (const job of jobs) {
      try {
        // 2. AI Extraction
        console.log(`  -> Processing Job ID: ${job.id}`);
        const extraction = await AIMesh.extract(job.raw_payload || "");
        
        const heuristic = siftOpportunity(
          extraction.title,
          extraction.description,
          extraction.company || "Generic",
          job.source_platform || "Emergency Defibrillator"
        );

        const md5_hash = createHash("md5")
          .update((extraction.title || '') + (extraction.company || ''))
          .digest("hex");

        // 3. Plate to Turso
        console.log(`  -> Plating to Turso: ${extraction.title} (${extraction.company})`);
        
        await db.insert(opportunities).values({
          id: randomUUID(),
          md5_hash,
          title: extraction.title,
          company: extraction.company || 'Confidential',
          url: job.source_url,
          description: extraction.description,
          salary: extraction.salary || null,
          niche: extraction.niche,
          type: extraction.type || 'direct',
          locationType: extraction.locationType || 'remote',
          sourcePlatform: `SRE Defibrillator (${job.source_platform})`,
          scrapedAt: new Date(),
          isActive: true,
          tier: heuristic.tier,
          relevanceScore: heuristic.relevanceScore,
          latestActivityMs: Date.now(),
          metadata: JSON.stringify(extraction.metadata || {}),
        }).onConflictDoUpdate({
           target: opportunities.md5_hash,
           set: { latestActivityMs: Date.now() }
        });

        // 4. Update Supabase Status
        await supabase
          .from('raw_job_harvests')
          .update({ 
            status: 'PLATED', 
            triage_status: 'PASSED',
            mapped_payload: extraction,
            updated_at: new Date().toISOString() 
          })
          .eq('id', job.id);
          
        console.log(`  ✅ SUCCESS: ${job.id}`);

      } catch (err: any) {
        console.error(`  ❌ FAILED ${job.id}:`, err.message);
        await supabase
          .from('raw_job_harvests')
          .update({ status: 'FAILED', error_log: err.message, locked_by: null })
          .eq('id', job.id);
      }
    }
  }
  
  console.log("\n═══ DEFIBRILLATION CYCLE COMPLETE ═══");
}

runManualChef();
