import { db } from "./client";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Deleting virtualcoworker.com.au from the database...");

  try {
    const res = await db.run(
      sql`DELETE FROM agencies WHERE hiring_url LIKE '%virtualcoworker.com.au%' OR name LIKE '%Virtual Coworker%'`
    );
    console.log("Deleted correctly. Rows affected:", res.rowsAffected);
  } catch (err) {
    console.error("Deletion failed:", err);
  }
}

run();
