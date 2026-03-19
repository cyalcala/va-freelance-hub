import { db } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { like, or, eq } from "drizzle-orm";

async function auditPurity() {
  console.log("🔍 DEEP PURITY AUDIT (Tech/EMEA/Researcher)...");
  
  const res = await db.select()
    .from(opportunities)
    .where(or(
      like(opportunities.company, "%GitLab%"),
      like(opportunities.company, "%Canonical%"),
      like(opportunities.title, "%EMEA%"),
      like(opportunities.title, "%Researcher%"),
      like(opportunities.title, "%Engineer%"),
      like(opportunities.title, "%Developer%")
    ))
    .limit(100);

  console.log(`Found ${res.length} potential leaks:`);
  
  const activeLeaks = res.filter(o => o.isActive);
  console.log(`Total Active Leaks (SHOULD BE 0): ${activeLeaks.length}`);
  
  activeLeaks.forEach(o => {
    console.log(`[Tier ${o.tier}] [ID: ${o.id}] ${o.company} - ${o.title}`);
  });

  if (activeLeaks.length === 0 && res.length > 0) {
    console.log("\n✅ ALL LEAKS ARE CORRECTLY MARKED INACTIVE IN DATABASE.");
    console.log("If they are still visible, it is likely a STALE FRONTEND BUILD or CACHE issue.");
  }
}

auditPurity().catch(console.error);
