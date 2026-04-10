import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config();

async function checkJobs() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  console.log("Checking BPO and Customer Service jobs...");
  const result = await client.execute(`
    SELECT id, title, company, url, source_platform, niche 
    FROM opportunities 
    WHERE niche = 'BPO_SERVICES'
    ORDER BY created_at DESC
  `);

  console.log(JSON.stringify(result.rows, null, 2));

  console.log("\nChecking for potential NSFW or suspicious Reddit links...");
  const redditLinks = await client.execute(`
    SELECT id, title, url, source_platform 
    FROM opportunities 
    WHERE url LIKE '%reddit.com/r/%'
    ORDER BY created_at DESC
  `);
  
  console.log(JSON.stringify(redditLinks.rows, null, 2));
}

checkJobs().catch(console.error);
