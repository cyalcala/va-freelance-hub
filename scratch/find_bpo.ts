import { supabase } from "../packages/db/supabase";
import { db } from "../packages/db";
import { opportunities } from "../packages/db/schema";
import { like, or } from "drizzle-orm";

async function findBPO() {
  console.log("🔍 [AUDIT] Searching for BPO/Customer Service jobs...");

  // 1. Search Supabase Pantry (RAW)
  const { data: rawJobs, error: rawError } = await supabase
    .from("raw_job_harvests")
    .select("id, title, source_platform, status")
    .or("title.ilike.%customer%,title.ilike.%bpo%,title.ilike.%support%,title.ilike.%csr%");

  if (rawError) console.error("❌ Pantry Error:", rawError.message);
  else console.log(`📊 Pantry (BPO-like): ${rawJobs?.length || 0} items identified.`);

  if (rawJobs && rawJobs.length > 0) {
    console.table(rawJobs.slice(0, 5));
  }

  // 2. Search Turso Vault (Active)
  const vaultJobs = await db.select({
    title: opportunities.title,
    niche: opportunities.niche,
    platform: opportunities.sourcePlatform
  })
  .from(opportunities)
  .where(or(
    like(opportunities.title, "%Customer%"),
    like(opportunities.title, "%BPO%"),
    like(opportunities.title, "%Support%"),
    like(opportunities.title, "%CSR%")
  ))
  .limit(10);

  console.log("\n📊 Turso Vault (BPO-like):");
  console.table(vaultJobs);
}

findBPO();
