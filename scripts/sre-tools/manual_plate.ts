import { createDb } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { AIMesh } from "../packages/ai/ai-mesh";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import * as dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function manualPlate() {
  const { db, client } = createDb();
  
  try {
    console.log("👨‍🍳 [SRE-CHEF] Starting Manual Plating Sequence (ALIGNED)...");
    
    // 1. Fetch RAW signals from Supabase Staging
    const { data: pending, error } = await supabase
      .from('raw_job_harvests')
      .select('*')
      .eq('status', 'RAW')
      .limit(50); 

    if (error) {
      console.error("Supabase Error:", error.message);
      return;
    }

    if (!pending || pending.length === 0) {
      console.log("📭 No 'RAW' signals found. Harvesting might still be finishing or failing.");
      return;
    }

    console.log(`🥘 Cooking ${pending.length} fresh real-world signals...`);

    for (const raw of pending) {
      try {
        // Idempotency check 
        const hash = crypto.createHash("md5").update(raw.source_url).digest("hex");
        
        // 2. Sift via AI Mesh (Use raw_payload)
        console.log(`✨ Sifting: ${raw.source_url}`);
        const sifted = await AIMesh.extract(raw.raw_payload || '');
        
        // 3. Plate into Turso
        const newSig = {
          id: uuidv4(),
          md5_hash: hash,
          title: sifted.title || 'Untitled Opportunity',
          company: sifted.company || 'Direct',
          url: raw.source_url,
          description: sifted.description || sifted.title,
          salary: sifted.salary,
          niche: sifted.niche,
          tier: sifted.tier,
          sourcePlatform: raw.source_platform || 'Generic',
          region: 'Global', 
          relevanceScore: sifted.relevanceScore || 0,
          latestActivityMs: Date.now(),
          scrapedAt: new Date(raw.created_at),
          createdAt: new Date()
        };

        // Aligning to production 'url' schema
        const platePayload = {
            ...newSig,
            url: raw.source_url
        } as any;

        await db.insert(opportunities).values(platePayload).onConflictDoNothing();
        
        // 4. Mark as PLATED in Supabase
        await supabase
          .from('raw_job_harvests')
          .update({ status: 'PLATED' })
          .eq('id', raw.id);
        
        console.log(`✅ PLATED: ${platePayload.title} [${platePayload.niche}]`);
      } catch (err: any) {
        console.error(`❌ FAILED: ${raw.source_url} - ${err.message}`);
        await supabase
          .from('raw_job_harvests')
          .update({ status: 'FAILED' })
          .eq('id', raw.id);
      }
    }

    console.log("🏁 [SRE-CHEF] Plating cycle complete.");

  } catch (err: any) {
    console.error("Critical Chef Error:", err.message);
  } finally {
    await client.close();
  }
}

manualPlate();
