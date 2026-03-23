import { $ } from "bun";
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { bundleContext } from "./context-aggregator";
import { askGemini, FixProtocol } from "./lib/gemini";

async function applyFix(protocol: FixProtocol) {
  if (protocol.action !== "PATCH_CODE" || !protocol.patches) return;
  
  for (const patch of protocol.patches) {
    console.log(`🛠️  Sentinel applying patch to: ${patch.path}`);
    writeFileSync(patch.path, patch.content);
  }
}

async function updateChangelog(protocol: FixProtocol) {
  const changelogPath = "CHANGELOG.md";
  if (!existsSync(changelogPath)) return;

  const date = new Date().toISOString().split('T')[0];
  const auditEntry = `
### [SENTINEL-FIX] ${date}
- **Problem**: ${protocol.analysis}
- **Reasoning**: ${protocol.explanation}
- **Action**: ${protocol.action}
- **Status**: AUTONOMOUSLY RESOLVED ✅
---
`;

  let content = readFileSync(changelogPath, "utf8");
  // Prepend to the top after the header if exists
  content = content.replace("# Internal Engineering Changelog", "# Internal Engineering Changelog\n" + auditEntry);
  writeFileSync(changelogPath, content);
}

async function runSreSuite() {
  console.log("\n🚀 Starting Apex SRE Interrogator Suite [AGENTIC MODE]...");
  const startTime = Date.now();

  const requiredVars = ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "VERCEL_ACCESS_TOKEN", "TRIGGER_API_KEY", "GEMINI_API_KEY"];
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.warn(`⚠️ Warning: Missing environment variables: ${missing.join(", ")}`);
  }

  try {
    // 1. PHASE 1: STANDARD TRIAGE (Deterministic)
    console.log("\n--- [PHASE 1] DETERMINISTIC INTERROGATION ---");
    const detectResult = await $`bun run scripts/triage.ts --detect`.quiet();
    const output = detectResult.stdout.toString();
    console.log(output);

    if (output.includes("[CRITICAL]")) {
      console.log("\n--- [PHASE 2] DETERMINISTIC REMEDIATION ---");
      await $`bun run scripts/triage.ts --fix`.quiet();
    }

    // 2. PHASE 2: CERTIFICATION CHECK
    console.log("\n--- [PHASE 3] CERTIFICATION GATE ---");
    const certifyResult = await $`bun run scripts/triage.ts --certify`.quiet();
    const certOutput = certifyResult.stdout.toString();
    console.log(certOutput);

    if (certOutput.includes("ALL GATES PASSED")) {
      console.log(`\n🎉 System is HEALTHY. Suite completed in ${((Date.now() - startTime) / 1000).toFixed(2)}s.`);
      process.exit(0);
    }

    // 3. PHASE 3: AGENTIC REASONING (The "Brain" Upgrade)
    console.log("\n❌ Deterministic fixes failed. Entering AGENTIC MODE...");
    
    if (!process.env.GEMINI_API_KEY) {
      console.error("❌ AGENTIC MODE FAILED: No GEMINI_API_KEY detected.");
      process.exit(1);
    }

    const codebase = await bundleContext();
    const protocol = await askGemini(certOutput, codebase);

    console.log(`\n🧠 Gemini Analysis: ${protocol.analysis}`);
    console.log(`🛡️  Suggested Action: ${protocol.action} (Confidence: ${protocol.confidence}%)`);

    if (protocol.confidence < 90) {
      console.error("⚠️ AI confidence too low for autonomous repair. Aborting.");
      process.exit(1);
    }

    if (protocol.action === "PATCH_CODE") {
      await applyFix(protocol);
      
      // 4. SIMULATION: Verify the AI fix
      console.log("\n--- [PHASE 4] AI FIX SIMULATION ---");
      const simResult = await $`bun run scripts/triage.ts --certify`.quiet();
      const simOutput = simResult.stdout.toString();
      
      if (simOutput.includes("ALL GATES PASSED")) {
        console.log("✅ AI Fix Verified! Pushing to repository...");
        await updateChangelog(protocol);
        
        // Literal Commit & Push
        await $`git config user.name "Apex Sentinel"`.quiet();
        await $`git config user.email "sentinel@va-hub.ai"`.quiet();
        await $`git add .`.quiet();
        await $`git commit -m "sentinel(auto-fix): ${protocol.analysis}"`.quiet();
        await $`git push origin main`.quiet();
        
        console.log(`\n🚀 System SELF-HEALED and committed in ${((Date.now() - startTime) / 1000).toFixed(2)}s.`);
        process.exit(0);
      } else {
        console.error("❌ AI Fix failed simulation. Rolling back.");
        await $`git checkout .`.quiet();
        process.exit(1);
      }
    } else {
      console.log(`⚠️ AI Protocol: ${protocol.action} is not yet automated. Routing to emergency redeploy...`);
      // Fallback to Vercel redeploy
      if (process.env.VERCEL_DEPLOY_WEBHOOK) {
        await fetch(process.env.VERCEL_DEPLOY_WEBHOOK, { method: "POST" });
        console.log("✅ Emergency redeploy triggered.");
      }
      process.exit(1);
    }

  } catch (error: any) {
    console.error(`\n💥 AGENTIC ERROR: ${error.message}`);
    process.exit(1);
  }
}

runSreSuite();
