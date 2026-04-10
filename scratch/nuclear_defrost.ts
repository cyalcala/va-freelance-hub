import { readFileSync, existsSync } from "fs";
import * as path from "path";
import { createClient } from "@libsql/client";
import { supabase } from "../packages/db/supabase";
import { AIMesh } from "../packages/ai/ai-mesh";
import { createHash, randomUUID } from "crypto";

async function nuclearDefrost() {
  console.log("═══ NUCLEAR SRE DEFROST: THE RESURRECTION ═══");
  
  const envPath = path.join(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const [k, ...rest] = line.split("=");
      if (k && rest.length && !k.startsWith("#")) {
        process.env[k.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
      }
    }
  }

  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  const client = createClient({ url: url!, authToken: token! });

  try {
    // 1. Connectivity Check
    const health = await client.execute("SELECT 1");
    console.log("✅ Turso Connectivity Established.");

    // 2. Fetch Backlog
    const { data: jobs } = await supabase
      .from('raw_job_harvests')
      .select('*')
      .eq('status', 'RAW')
      .limit(5);

    if (!jobs || jobs.length === 0) {
      console.log("Pantry is empty. No jobs to process.");
      return;
    }

    console.log(`Processing ${jobs.length} jobs...`);

    for (const job of jobs) {
      try {
        console.log(`\n[SIFTING] ${job.id}`);
        const extraction = await AIMesh.extract(job.raw_payload || "");
        
        const md5_hash = createHash("md5")
          .update((extraction.title || '') + (extraction.company || ''))
          .digest("hex");

        console.log(`[PLATING] ${extraction.title} @ ${extraction.company}`);
        
        await client.execute({
          sql: `INSERT INTO opportunities (
            id, md5_hash, title, company, source_url, description, 
            salary, niche, type, location_type, source_platform, 
            scraped_at, last_seen_at, is_active, tier, relevance_score, 
            latest_activity_ms, region, metadata, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            randomUUID(), md5_hash, extraction.title, extraction.company || 'Confidential',
            job.source_url, extraction.description, extraction.salary || null,
            extraction.niche, extraction.type || 'direct', extraction.locationType || 'remote',
            'NUCLEAR_SRE_VERIFIED', Date.now(), Date.now(), 1, extraction.tier, 
            extraction.relevanceScore, Date.now(), 'Philippines', JSON.stringify(extraction.metadata || {}), 
            Date.now()
          ]
        });

        await supabase
          .from('raw_job_harvests')
          .update({ status: 'PLATED', updated_at: new Date().toISOString() })
          .eq('id', job.id);

        console.log(`✅ VAULT UPDATED: ${extraction.title}`);

      } catch (err: any) {
        if (err.message.includes("UNIQUE constraint failed")) {
           console.log(`ℹ️  SKIPPED: Duplicate MD5 (${job.id})`);
           await supabase.from('raw_job_harvests').update({ status: 'PLATED' }).eq('id', job.id);
        } else {
           console.error(`❌ ERROR processing ${job.id}:`, err.message);
        }
      }
    }

    const finalCount = await client.execute("SELECT count(*) as n FROM opportunities");
    console.log(`\n🏆 NEW VAULT TOTAL: ${finalCount.rows[0].n} signals.`);

  } catch (err: any) {
    console.error("☢️  NUCLEAR MELTDOWN:", err.message);
  } finally {
    client.close();
  }
}

nuclearDefrost();
