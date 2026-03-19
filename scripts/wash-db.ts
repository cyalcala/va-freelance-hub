import { createDb } from "../jobs/lib/db";
import { siftOpportunity } from "../jobs/lib/sifter";
import { sql } from "drizzle-orm";

async function wash() {
  console.log("🧼 Starting Database Wash (Raw SQL Mode)...");
  const db = createDb();
  
  const allOpps: any[] = await db.run(sql`SELECT id, title, company, description FROM opportunities`).then(r => r.rows);
  console.log(`🔍 Found ${allOpps.length} records to process.`);

  let updated = 0;
  for (const opp of allOpps) {
    const tier = siftOpportunity(opp.title, opp.company || "", opp.description || "");
    
    try {
      // Using raw SQL to bypass Drizzle version mismatch in scripts
      await db.run(sql`UPDATE opportunities SET tier = ${tier} WHERE id = ${opp.id}`);
      updated++;
    } catch (err) {
      console.error(`❌ Failed to update ${opp.id}:`, (err as Error).message);
    }
    
    if (updated % 100 === 0) console.log(`  → Processed ${updated}...`);
  }

  console.log(`✅ Wash complete. ${updated} records updated.`);
}

wash().catch(console.error);
