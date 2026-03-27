import { createClient } from "@libsql/client/http";
import * as dotenv from "dotenv";

dotenv.config({ path: "./.env" });

async function listTables() {
  const c = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const r = await c.execute("SELECT name FROM sqlite_master WHERE type='table'");
  console.log("TABLES:");
  r.rows.forEach(row => console.log(` - ${row.name}`));

  c.close();
}

listTables();
