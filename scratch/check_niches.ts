import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config();

async function checkNiches() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  console.log("Niche distribution:");
  const result = await client.execute(`
    SELECT niche, COUNT(*) as count 
    FROM opportunities 
    GROUP BY niche
  `);

  console.log(JSON.stringify(result.rows, null, 2));

  console.log("\nRecent 10 opportunities:");
  const recent = await client.execute(`
    SELECT title, niche, company, source_platform, url
    FROM opportunities 
    ORDER BY created_at DESC
    LIMIT 10
  `);
  console.log(JSON.stringify(recent.rows, null, 2));
}

checkNiches().catch(console.error);
