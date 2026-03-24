import { createClient } from "@libsql/client/http";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

async function check() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  try {
    const rs = await client.execute("PRAGMA table_info(agencies)");
    console.log("COLUMNS FOUND:");
    console.log(JSON.stringify(rs.rows, null, 2));
    
    const sample = await client.execute("SELECT * FROM agencies LIMIT 1");
    console.log("SAMPLE ROW:");
    console.log(JSON.stringify(sample.rows, null, 2));
  } catch (e) {
    console.error("DEBUG FAILED:", e);
  } finally {
    client.close();
  }
}

check();
