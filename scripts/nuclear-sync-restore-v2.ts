import { createClient } from "@supabase/supabase-js";
import { db } from "../packages/db/client";
import { opportunities, logs } from "../packages/db/schema";
import { v4 as uuidv4 } from "uuid";
import * as dotenv from "dotenv";

dotenv.config();

async function restore() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from environment.");
  }

  console.log("☢️  INITIATING NUCLEAR SYNC RESTORE V2 (SUPABASE SDK)...");

  const supabase = createClient(url, key);

  try {
    // 1. Fetch Plated Jobs (Pagination Loop)
    console.log("-> 1. Pulling PLATED signals via PostgREST...");
    
    let allJobs: any[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('raw_job_harvests')
        .select('id, mapped_payload')
        .eq('status', 'PLATED')
        .range(from, from + step - 1);

      if (error) throw error;
      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allJobs = [...allJobs, ...data];
        from += step;
        console.log(`   ...Fetched ${allJobs.length} signals so far.`);
      }
    }

    console.log(`   [!] Total signals found: ${allJobs.length}`);

    // 2. Hydrate and Upsert into Turso
    console.log("-> 2. Re-hydrating Gold Vault...");
    const crypto = await import("node:crypto");
    let successCount = 0;
    const chunk = 50;

    for (let i = 0; i < allJobs.length; i += chunk) {
      const batch = allJobs.filter(j => !!j.mapped_payload).slice(i, i + chunk);
      if (batch.length === 0) continue;

      const values = batch.map(j => {
        const payload = j.mapped_payload;
        return {
          ...payload,
          id: payload.id || uuidv4(),
          md5_hash: payload.md5_hash || crypto.createHash('md5').update(payload.url + payload.title).digest('hex'),
          scrapedAt: new Date(payload.scrapedAt || Date.now()),
          postedAt: payload.postedAt ? new Date(payload.postedAt) : null,
          createdAt: new Date(payload.createdAt || Date.now()),
          latestActivityMs: payload.latestActivityMs || Date.now(),
          isActive: true
        };
      });

      await db.insert(opportunities)
        .values(values)
        .onConflictDoUpdate({
          target: opportunities.md5_hash,
          set: {
            // Ensure they are marked active and have valid flow timestamps
            latestActivityMs: Date.now(),
            isActive: true
          }
        });
      
      successCount += batch.length;
      if (i % 250 === 0) console.log(`   ...Injected ${successCount}/${allJobs.length}`);
    }

    // 3. Log the event
    await db.insert(logs).values({
      id: uuidv4(),
      message: `NUCLEAR RESTORE V2: Successfully re-synced ${successCount} signals via Supabase SDK.`,
      level: "snapshot",
      timestamp: new Date()
    });

    console.log("\n✅ GOLD VAULT RESTORED. System is fully operational.");
  } catch (err) {
    console.error("\n❌ NUCLEAR RESTORE V2 FAILED:", err);
  }
}

restore().catch(console.error);
