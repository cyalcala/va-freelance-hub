import "dotenv/config";
import { sentinel } from "../packages/db/sentinel";

async function verifySelfHealing() {
  console.log("🛡️ [VERIFICATION] Triggering Apex Sentinel Pulse...");
  
  try {
    await sentinel.diagnoseAndRepair("manual-verification-pulse");
    console.log("✅ Sentinel pulse completed successfully.");
  } catch (err) {
    console.error("❌ Sentinel pulse failed:", err);
  } finally {
    process.exit(0);
  }
}

verifySelfHealing();
