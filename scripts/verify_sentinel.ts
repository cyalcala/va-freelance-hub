import { sentinel } from "../packages/db/sentinel";

async function main() {
  console.log("🛠️ [VERIFY] Triggering Sentinel Triage Pulse (Project Aegis)...");
  
  await sentinel.diagnoseAndRepair("Manual-SRE-Verification");
  
  console.log("✅ [VERIFY] Sequence complete. Check database vitals for 'last_intervention_at'.");
  process.exit(0);
}

main().catch(err => {
  console.error("❌ [VERIFY] Sentinel failed:", err);
  process.exit(1);
});
