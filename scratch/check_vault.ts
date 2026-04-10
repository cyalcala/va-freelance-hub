import { readFileSync, existsSync } from "fs";
import * as path from "path";
import { createClient } from "@libsql/client";

async function checkVault() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const [k, ...rest] = line.split("=");
      if (k && rest.length && !k.startsWith("#")) {
        process.env[k.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
      }
    }
  }

  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  
  console.log(`Connecting to: ${url?.substring(0, 20)}...`);
  const client = createClient({ url: url!, authToken: token! });
  
  try {
    const res = await client.execute("SELECT count(*) as n FROM opportunities");
    console.log(`Total Opportunities: ${res.rows[0].n}`);
    
    console.log("\n--- AI COOLDOWN STATUS ---");
    const cooldowns = await client.execute("SELECT * FROM ai_cooldowns");
    cooldowns.rows.forEach(r => {
      console.log(`- ${r.provider_name}: ${r.is_blocked ? '🔴 BLOCKED' : '🟢 READY'} (${r.error_count} errors) | Last: ${r.last_error?.substring(0, 50)}...`);
    });

    console.log("\n--- SYSTEM VITALS ---");
    const vitals = await client.execute("SELECT * FROM vitals");
    console.log(`Vitals Count: ${vitals.rows.length}`);
    vitals.rows.forEach(r => console.log(`- ${r.id}: ${r.region} | ${r.last_ingestion_heartbeat_ms}`));

  } catch (err: any) {
    console.error("Vault Check Failed:", err.message);
  } finally {
    client.close();
  }
}

checkVault();
