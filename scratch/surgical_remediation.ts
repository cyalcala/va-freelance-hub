import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

dotenv.config();

async function remediate() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  console.log("--- STARTING SURGICAL REMEDIATION ---");

  // 1. PURGE GHOST LEADS
  console.log("Purging Ghost Leads...");
  const purgeGhost = await client.execute(`
    DELETE FROM opportunities 
    WHERE title LIKE '%V12_GHOST_LEAD%' 
       OR title LIKE '%V12 Ghost Lead%'
  `);
  console.log(`Purged ${purgeGhost.rowsAffected} ghost leads.`);

  // 2. PURGE NSFW CONTENT
  console.log("Purging NSFW content...");
  const purgeNsfw = await client.execute({
    sql: "DELETE FROM opportunities WHERE url = ?",
    args: ["https://reddit.com/r/buhaydigital/comments/1shq0ip/of_chatter_without_any_experience/"]
  });
  console.log(`Purged ${purgeNsfw.rowsAffected} NSFW entries.`);

  // 3. INJECT LIVE ACCENTURE JOB
  console.log("Injecting live Accenture hiring post...");
  const accentureUrl = "https://www.reddit.com/r/BPOinPH/comments/1shxdky/accenture_hiring_voice_and_non_voice/";
  const accentureTitle = "Accenture Hiring (Voice & Non-Voice CSR)";
  const accentureDesc = "Accenture Philippines is hiring for various roles including Customer Service Representative (Voice & Non-Voice), Client Financial Management Analyst, and more. Benefits include HMO on Day 1, Laptop provided, and performance bonuses. Locations: QC, Taguig, Mandaluyong, Alabang.";
  const md5_hash = crypto.createHash("md5").update(accentureUrl).digest("hex");

  try {
    await client.execute({
      sql: `INSERT INTO opportunities (id, md5_hash, title, company, url, description, niche, type, source_platform, tier, relevance_score, region, created_at, scraped_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        uuidv4(),
        md5_hash,
        accentureTitle,
        "Accenture",
        accentureUrl,
        accentureDesc,
        "BPO_SERVICES",
        "direct",
        "Reddit: BPOinPH",
        1, // Gold Tier
        100,
        "Philippines",
        new Date(),
        new Date()
      ]
    });
    console.log("Successfully injected Accenture hire.");
  } catch (e: any) {
    if (e.message.includes("UNIQUE constraint failed")) {
      console.log("Accenture job already exists in database.");
    } else {
      console.error("Failed to inject Accenture job:", e);
    }
  }

  console.log("--- REMEDIATION COMPLETE ---");
}

remediate().catch(console.error);
