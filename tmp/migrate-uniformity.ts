import { db, schema } from "../packages/db/client";
import { sql } from "drizzle-orm";

function normalizePlatform(name: string): string {
  if (!name) return "Generic";
  let n = name.trim();
  if (n.startsWith('Reddit/')) return n; 
  if (n.toLowerCase().includes('greenhouse')) return "Greenhouse";
  if (n.toLowerCase().includes('lever')) return "Lever";
  // Convert "Reddit r/Subreddit" to "Reddit/Subreddit"
  if (n.toLowerCase().startsWith('reddit')) {
    return n.replace(/\br\//i, "").replace(/\s+/g, "/").replace("Reddit/r/", "Reddit/");
  }
  if (n === 'rss') return "RSS Feed";
  return n;
}

function normalizeLocation(loc: string): string {
  if (!loc) return "Remote";
  return loc
    .replace(/^remote\s*-\s*/i, "")
    .replace(/\(\s*remote\s*\)/i, "")
    .trim() || "Remote";
}

async function migrate() {
  console.log("🚀 Starting Massive Data Normalization...");
  
  const allOpps = await db.select().from(schema.opportunities);
  console.log(`Analyzing ${allOpps.length} signals...`);

  let updated = 0;
  for (const opp of allOpps) {
    const newPlatform = normalizePlatform(opp.sourcePlatform);
    const newLocation = normalizeLocation(opp.locationType);
    const newTitle = opp.title.trim();
    const newCompany = (opp.company || 'Generic').trim();

    if (newPlatform !== opp.sourcePlatform || newLocation !== opp.locationType || newTitle !== opp.title || newCompany !== opp.company) {
      await db.update(schema.opportunities)
        .set({
          sourcePlatform: newPlatform,
          locationType: newLocation,
          title: newTitle,
          company: newCompany
        })
        .where(sql`id = ${opp.id}`);
      updated++;
    }
  }

  console.log(`✅ Normalization Complete. ${updated} records surgically updated.`);
}

migrate();
