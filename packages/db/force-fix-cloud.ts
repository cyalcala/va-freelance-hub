import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

async function fix() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  try {
    console.log("SURGICALLY ADDING HEAT & FRICTION COLUMNS...");
    
    try {
      await client.execute("ALTER TABLE agencies ADD COLUMN hiring_heat INTEGER DEFAULT 1");
      console.log("✅ hiring_heat added.");
    } catch (e) { console.log("⚠️ hiring_heat probably exists"); }

    try {
      await client.execute("ALTER TABLE agencies ADD COLUMN friction_level INTEGER DEFAULT 3");
      console.log("✅ friction_level added.");
    } catch (e) { console.log("⚠️ friction_level probably exists"); }

    console.log("🚀 CLOUD REALIGNED.");
  } catch (e) {
    console.error("FIX FAILED:", e.message);
  } finally {
    client.close();
  }
}

fix();
