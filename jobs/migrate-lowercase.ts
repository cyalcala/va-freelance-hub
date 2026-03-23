import { createDb, opportunities } from "./lib/db";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("🚀 Starting Lowercase Migration...");
  const db = await createDb();
  
  const result = await db.run(sql`
    UPDATE opportunities 
    SET title = LOWER(title), 
        company = LOWER(company)
  `);
  
  console.log(`✅ Migration Complete. Rows updated: ${result.rowsAffected}`);
}

migrate().catch(console.error);
