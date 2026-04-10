import { readFileSync, existsSync } from "fs";
import * as path from "path";
import { createClient } from "@libsql/client";

async function checkSchema() {
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
    console.log("Interrogating table opportunities...");
    const res = await client.execute("PRAGMA table_info(opportunities)");
    res.rows.forEach(r => {
      console.log(`- Column: ${r.name} (${r.type})`);
    });

  } catch (err: any) {
    console.error("Schema Check Failed:", err.message);
  } finally {
    client.close();
  }
}

checkSchema();
