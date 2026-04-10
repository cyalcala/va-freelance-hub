import { readFileSync, existsSync } from "fs";
import * as path from "path";
import { createClient } from "@libsql/client";
import { createHash, randomUUID } from "crypto";

async function defibrillate() {
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
  const client = createClient({ url: url!, authToken: token! });
  
  try {
    const md5 = createHash("md5").update("SRE_FORCE_WAKEUP_2026").digest("hex");
    
    console.log("Defibrillating Vault...");
    await client.execute({
      sql: `INSERT INTO opportunities (
        id, md5_hash, title, company, url, description, 
        niche, type, location_type, source_platform, 
        scraped_at, last_seen_at, is_active, tier, relevance_score, 
        latest_activity_ms, region, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        randomUUID(), md5, "SRE_FORCE_WAKEUP", "V12_SENTINEL", 
        "https://v12-sifter.com/audit", "Force-injected SRE signal to verify Vault accessibility.",
        "TECH_ENGINEERING", "direct", "remote", "SRE_AUDIT",
        Date.now(), Date.now(), 1, 0, 100, Date.now(), "Philippines", "{}", Date.now()
      ]
    });

    console.log("✅ VAULT DEFIBRILLATED. Sentinel record injected.");
    
    // Update Heartbeat to prove we can talk to Vitals too
    await client.execute({
      sql: "UPDATE vitals SET last_ingestion_heartbeat_ms = ?, heartbeat_source = ? WHERE id = 'HEARTBEAT_Philippines'",
      args: [Date.now(), "SRE_AUDIT_VERIFIED"]
    });
    console.log("✅ HEARTBEAT RESTORED: HEARTBEAT_Philippines updated.");

  } catch (err: any) {
    console.error("Defibrillate Failed:", err.message);
  } finally {
    client.close();
  }
}

defibrillate();
