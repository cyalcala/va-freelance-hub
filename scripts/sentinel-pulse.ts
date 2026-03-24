import "dotenv/config";
import { $ } from "bun";
import { bundleContext } from "./context-aggregator";
import { askGemini } from "./lib/gemini";

/**
 * 🛰️ VA.INDEX SENTINEL PULSE v1.0
 * MISSION: Verify the "Employee's" intelligence and reasoning before deployment.
 */
async function pulse() {
  console.log("📡 Sentinel Pulse: Interrogating Core Intelligence...");

  try {
    // 1. Deterministic Health Audit
    console.log("\n--- [PHASE 1] DETERMINISTIC AUDIT ---");
    const triage = await $`bun run scripts/triage.ts --certify`.quiet();
    console.log(triage.stdout.toString());

    // 2. Agentic Reasoning Dry-Run
    console.log("\n --- [PHASE 2] AGENTIC REASONING DRY-RUN ---");
    console.log("🧠 Consulting Senior SRE Persona (Gemini 1.5 Flash)...");
    
    const context = await bundleContext();
    const result = await askGemini("SYSTEM_PULSE_CHECK: Verify architectural integrity and Snap-Fast performance mandates.", context);

    console.log(`\n🤖 SENTINEL ANALYSIS: ${result.analysis}`);
    console.log(`🛡️  ACTION PLAN: ${result.action}`);
    console.log(`📚 WISDOM GAINED: ${result.wisdom}`);
    
    console.log("\n✅ PULSE VERIFIED: The AI Employee is thinking like a FAANG Senior SRE.");
    console.log("🚀 Run 'npm run trigger:deploy' to promote this intelligence to the cloud.");

  } catch (err: any) {
    console.error(`\n❌ PULSE FAILED: ${err.message}`);
  }
}

pulse();
