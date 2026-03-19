import { createDb } from "../jobs/lib/db";
import { sql } from "drizzle-orm";

async function force() {
  const db = createDb();
  console.log("⚡ Forcing migration: Adding 'tier' to opportunities...");
  try {
    await db.run(sql`ALTER TABLE opportunities ADD COLUMN tier INTEGER DEFAULT 3`);
    console.log("✅ Column 'tier' added successfully.");
  } catch (err) {
    console.error("❌ Failed:", (err as Error).message);
  }
}

force().catch(console.error);
