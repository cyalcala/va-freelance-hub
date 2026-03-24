import { createClient } from "@libsql/client/http";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

async function checkSchema() {
  const c = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const r = await c.execute("PRAGMA table_info(opportunities)");
  console.log("SCHEMA OF opportunities:");
  r.rows.forEach(col => {
    console.log(`- ${col.name} (${col.type}) pk=${col.pk} notnull=${col.notnull}`);
  });
  c.close();
}
checkSchema();
