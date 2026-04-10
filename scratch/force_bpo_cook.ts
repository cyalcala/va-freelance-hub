import { supabase } from "../packages/db/supabase";
import { AIMesh } from "../packages/ai/ai-mesh";
import { db } from "../packages/db";
import { opportunities } from "../packages/db/schema";
import { mapTitleToDomain } from "../packages/db/taxonomy";
import { eq } from "drizzle-orm";
import crypto from "crypto";

async function forceBPO() {
  console.log("👨‍🍳 [FORCE-BPO] Targeted Processing of BPO Leads...");

  const { data: leads, error } = await supabase
    .from("raw_job_harvests")
    .select("*")
    .eq("source_platform", "Reddit: BPO_INJECT")
    .in("status", ["RAW", "FAILED"]);

  if (error || !leads || leads.length === 0) {
    console.error("❌ No BPO leads found to force-cook.");
    return;
  }

  for (const job of leads) {
    try {
      console.log(`\n--- Cookin': ${job.source_url} ---`);
      
      // Update status to PROCESSING
      await supabase.from("raw_job_harvests").update({ status: "PROCESSING" }).eq("id", job.id);

      // Simulate a lead info if payload is empty
      const html = job.raw_payload || `TITLE: ${job.source_url}`;
      
      const extraction = await AIMesh.extract(html);
      
      // Ensure the niche is BPO_SERVICES if it was supposed to be
      if (extraction.title.toLowerCase().includes("csr") || extraction.title.toLowerCase().includes("customer")) {
         extraction.niche = "BPO_SERVICES" as any;
      }

      const md5Hash = crypto.createHash("md5").update(`${extraction.title}${extraction.company}`).digest("hex");

      const existing = await db.select().from(opportunities).where(eq(opportunities.md5Hash, md5Hash)).limit(1);
      
      if (existing.length === 0) {
        await db.insert(opportunities).values({
          id: md5Hash,
          md5_hash: md5Hash,
          title: extraction.title,
          company: extraction.company,
          description: extraction.description,
          salary: extraction.salary,
          niche: extraction.niche,
          tier: extraction.tier || 0,
          sourcePlatform: `V12 Chef (${job.source_platform})`,
          sourceUrl: job.source_url,
          region: "Philippines",
          isPhCompatible: true,
          isActive: true,
          relevanceScore: extraction.relevanceScore || 80,
          scrapedAt: new Date(),
          latestActivityMs: Date.now()
        });
        console.log(`✅ [PLATED] ${extraction.title} -> ${extraction.niche}`);
      } else {
        console.log(`🟡 [SKIPPED] ${extraction.title} already exists.`);
      }

      console.log(`✅ [PLATED] ${extraction.title} -> ${extraction.niche}`);

      await supabase.from("raw_job_harvests").update({ status: "PLATED" }).eq("id", job.id);

    } catch (err: any) {
      console.error(`❌ [FAIL] ${job.source_url}:`, err.message);
      await supabase.from("raw_job_harvests").update({ 
        status: "FAILED", 
        error_log: err.message 
      }).eq("id", job.id);
    }
  }

  console.log("\n👨‍🍳 [FORCE-BPO] Restoration Complete.");
}

forceBPO();
