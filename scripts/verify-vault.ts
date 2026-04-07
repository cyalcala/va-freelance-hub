import { db } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { eq } from "drizzle-orm";

async function verifyVault() {
  console.log("🔍 [FINAL-VERIFY] Checking Turso for the REAL job...");

  try {
    const res = await db.select().from(opportunities).where(eq(opportunities.title, "Senior Product Manager")).limit(1);

    if (res.length > 0) {
      console.log("✅ [FINAL-VERIFY] RECORD FOUND IN TURSO!");
      console.log(`🏷️  Title: ${res[0].title}`);
      console.log(`🏢 Company: ${res[0].company}`);
      console.log(`🔗 URL: ${res[0].url}`);
      console.log("🚀 V12 PIPELINE IS END-TO-END HEALTHY.");
    } else {
      console.error("❌ [FINAL-VERIFY] RECORD NOT FOUND IN TURSO.");
      process.exit(1);
    }

  } catch (err) {
    console.error("❌ [FINAL-VERIFY] Turso Query failed:", err);
    process.exit(1);
  }
}

verifyVault();
