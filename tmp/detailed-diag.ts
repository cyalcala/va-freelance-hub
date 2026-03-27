import { createClient } from "@libsql/client/http";
import * as dotenv from "dotenv";

dotenv.config({ path: "./.env" });

async function diag() {
  const c = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  console.log("--- OPPORTUNITIES FRESHNESS ---");
  const opps = await c.execute("SELECT max(scraped_at) as maxScraped, max(created_at) as maxCreated, count(*) as total FROM opportunities WHERE is_active = 1");
  console.log(JSON.stringify(opps.rows[0], null, 2));
  
  const now = Date.now();
  const maxScraped = Number(opps.rows[0].maxScraped);
  console.log(`Now: ${now}`);
  console.log(`Max Scraped: ${maxScraped}`);
  console.log(`Staleness (ms): ${now - maxScraped}`);
  console.log(`Staleness (hrs): ${(now - maxScraped) / 3600000}`);

  console.log("\n--- SYSTEM HEALTH ---");
  const health = await c.execute("SELECT * FROM system_health ORDER BY updated_at DESC");
  health.rows.forEach(r => {
    console.log(`[${r.source_name}] Status: ${r.status}, Last Success: ${r.last_success}, Error: ${r.error_message}`);
  });

  console.log("\n--- RECENT LOGS ---");
  const logs = await c.execute("SELECT * FROM logs ORDER BY timestamp DESC LIMIT 10");
  logs.rows.forEach(r => {
    console.log(`[${new Date(Number(r.timestamp)).toISOString()}] ${r.level}: ${r.message}`);
  });

  c.close();
}

diag();
