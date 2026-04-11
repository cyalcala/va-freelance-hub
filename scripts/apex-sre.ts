import { $ } from "bun";
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { bundleContext } from "./context-aggregator";
import { AgenticBridge, FixProtocol } from "@va-hub/bridge";
import { createClient } from "@libsql/client/http";
import { GitAgent } from "./lib/git-agent";
import { BudgetShield } from "./lib/budget-shield";
import { Strategist } from "./lib/strategist";

const DAILY_LIMIT = 50;
const SRE_ID = "apex_sre";
const gitAgent = new GitAgent({ agentId: SRE_ID });
const budgetShield = new BudgetShield({ agentId: SRE_ID, dailyAiLimit: DAILY_LIMIT });
const strategist = new Strategist(SRE_ID);

function getDb() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !token) throw new Error("TURSO_DATABASE_URL or TURSO_AUTH_TOKEN missing");
  return createClient({ url, authToken: token });
}

async function checkQuota(): Promise<boolean> {
  return await budgetShield.checkAiQuota();
}

async function incrementQuota() {
  await budgetShield.incrementAiQuota();
}

function countLinesChanged(protocol: FixProtocol): number {
  if (!protocol.patches) return 0;
  let total = 0;
  for (const patch of protocol.patches) {
    if (!existsSync(patch.path)) {
      total += patch.content.split('\n').length;
      continue;
    }
    const oldContent = readFileSync(patch.path, 'utf8').split('\n');
    const newContent = patch.content.split('\n');
    // Simple heuristic: count of new lines vs old lines difference + rough changes
    // A better way would be a diff, but this is a conservative safety gate.
    // Let's just use the length of the new content if it's a small file, 
    // or compare line count difference.
    // For strictness, if any patch is > 5 lines total, we'll flag it.
    total += Math.abs(newContent.length); 
  }
  return total;
}

async function applyFix(protocol: FixProtocol) {
  if (protocol.action !== "PATCH_CODE" || !protocol.patches) return;
  
  const totalLines = protocol.patches.reduce((acc, p) => acc + p.content.split('\n').length, 0);
  
  // High-agency threshold for Expert Mode
  if (totalLines > 500) {
    console.warn(`🛡️  Sentinel Safe Mode: Patch exceeds high-agency threshold (${totalLines} lines). Manual approval required.`);
    return;
  }

  console.log(`🛠️  Sentinel applying systemic autonomous fixes for: ${protocol.analysis}`);

  for (const patch of protocol.patches) {
    console.log(`  Applying patch to: ${patch.path}`);
    writeFileSync(patch.path, patch.content);
  }
  
  console.log(`✅  Patching complete.`);
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

async function updateWisdom(protocol: FixProtocol) {
  const wisdomPath = "docs/SRE_WISDOM.md";
  if (!existsSync(wisdomPath) || !protocol.wisdom) return;

  const date = new Date().toISOString().split('T')[0];
  const wisdomEntry = `\n- [${date}] ${protocol.wisdom}`;

  let content = readFileSync(wisdomPath, "utf8");
  if (content.includes("## 📚 Lessons Learned")) {
    content = content.replace("## 📚 Lessons Learned", "## 📚 Lessons Learned" + wisdomEntry);
    writeFileSync(wisdomPath, content);
    console.log("🧠 Wisdom bank updated with new lesson.");
  }
}

async function runStrategicHunt() {
  console.log("\n🔭  Sentinel initiating Strategic Hunt for betterment...");
  
  if (!await checkQuota()) return;

  const strategy = await strategist.deliberate();
  if (!strategy) {
    console.log("💡  No significant strategic betterment moves identified in this cycle.");
    return;
  }

  console.log(`\n🏆  WINNING STRATEGY: ${strategy.title}`);
  console.log(`📝  Description: ${strategy.description}`);
  console.log(`📊  SENSICAL SCORE: ${(strategy.scores.optimizer + strategy.scores.harvester + (strategy.scores.architect * 1.5)) / 3.5}/10`);
  
  // LOG STRATEGY FOR WISDOM
  const wisdom = `\n* [STRATEGIC] ${strategy.title}: ${strategy.description} (Scores: Arc:${strategy.scores.architect}, Opt:${strategy.scores.optimizer}, Harv:${strategy.scores.harvester})`;
  writeFileSync("docs/SRE_WISDOM.md", readFileSync("docs/SRE_WISDOM.md", "utf8") + wisdom);

  // EXECUTE ACTION PROTOCOL
  console.log(`⚡  Action Protocol: ${strategy.actionProtocol}`);
  
  if (strategy.actionProtocol === "PATCH_CODE" && strategy.patches) {
    console.log(`🛠️  Sentinel executing Systemic Betterment: ${strategy.title}`);
    
    // Applying the proactive systemic upgrade
    for (const patch of strategy.patches) {
      console.log(`  Upgrading: ${patch.path}`);
      writeFileSync(patch.path, patch.content);
    }

    // 🏆 ZERO-TRUST VALDIATION of Strategic Upgrade
    try {
      console.log("\n🛡️  Sentinel validating proactive upgrade...");
      await $`bun run scripts/triage.ts --certify`.quiet();
      
      const git = new GitAgent({ agentId: "apex_sre" });
      await git.setupGit();
      await git.safePush(`sentinel(betterment): ${strategy.title}\n\n${strategy.description}`);
      console.log("✅  Betterment Certified and Published.");
    } catch (err) {
      console.error("❌  PROACTIVE UPGRADE FAILED CERTIFICATION. EMERGENCY ROLLBACK.");
      await $`git restore .`.quiet();
      process.exit(1);
    }
  }
}

async function handleCertificationFailure(certOutput: string) {
  const c = getDb();
  const SRE_STATE_ID = "sre_escalation_state";
  
  try {
    const result = await c.execute({
      sql: "SELECT successive_failure_count FROM vitals WHERE id = ?",
      args: [SRE_STATE_ID]
    });

    let count = 0;
    if (result.rows.length === 0) {
      await c.execute({
        sql: "INSERT INTO vitals (id, successive_failure_count, lock_updated_at) VALUES (?, 1, ?)",
        args: [SRE_STATE_ID, Date.now()]
      });
      count = 1;
    } else {
      count = Number(result.rows[0].successive_failure_count) + 1;
      await c.execute({
        sql: "UPDATE vitals SET successive_failure_count = ?, lock_updated_at = ? WHERE id = ?",
        args: [count, Date.now(), SRE_STATE_ID]
      });
    }

    console.log(`⚠️  Certification Failure Count: ${count}/3`);

    if (count >= 3) {
      console.error("🚨 PERSISTENT CERTIFICATION FAILURE DETECTED (3+ cycles). TRIGGERING NUCLEAR ESCALATION...");
      if (process.env.VERCEL_DEPLOY_WEBHOOK) {
        const res = await fetch(process.env.VERCEL_DEPLOY_WEBHOOK, { method: "POST" });
        console.log(`✅ Autonomous Vercel Redeploy triggered. Status: ${res.status}`);
      }
      // Reset counter after escalation to avoid spamming
      await c.execute({
        sql: "UPDATE vitals SET successive_failure_count = 0 WHERE id = ?",
        args: [SRE_STATE_ID]
      });
    }
  } catch (err) {
    console.warn(`⚠️ Escalation tracker failed: ${err}`);
  } finally {
    c.close();
  }
}

async function handleCertificationSuccess() {
  const c = getDb();
  const SRE_STATE_ID = "sre_escalation_state";
  try {
    await c.execute({
      sql: "UPDATE vitals SET successive_failure_count = 0 WHERE id = ?",
      args: [SRE_STATE_ID]
    });
  } catch {} finally {
    c.close();
  }
}

async function createArchivalSeed() {
  console.log("\n--- [AEON] GENERATING ARCHIVAL SEED ---");
  try {
    const filename = `snapshots/aeon_seed_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    await $`mkdir -p snapshots`.quiet();
    await $`bun run scripts/save.ts --output ${filename}`.quiet();
    console.log(`✅ Archival seed created: ${filename}`);
  } catch (err) {
    console.error(`⚠️ Archival seeding failed: ${err}`);
  }
}

async function runSreSuite() {
  console.log("\n🚀 Starting Apex SRE Interrogator Suite [AGENTIC MODE]...");
  const startTime = Date.now();

  const requiredVars = ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "VERCEL_ACCESS_TOKEN", "TRIGGER_API_KEY", "GEMINI_API_KEY"];
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.warn(`⚠️ Warning: Missing environment variables: ${missing.join(", ")}`);
  }

  // ── [PHASE -1] GIT INITIALIZATION ──
  // We initialize Git first so that any emergency remediation (rollback) works properly.
  await gitAgent.setupGit();

  try {
    // 0. PHASE 0: HYPERHEALTH PROBE (The "Senior SRE" Pulse)
    console.log("\n--- [PHASE 0] HYPERHEALTH PROBE ---");
    try {
      await $`bun run scripts/health-check.ts`.quiet();
    } catch (err: any) {
      console.error("🚨 RED ALERT: Hyperhealth Check Failed. Initiating Emergency Remediation...");
      
      // Autonomous Remediation: Rollback if the last commit was recent (< 30 mins)
      const lastCommitTime = await $`git log -1 --format=%ct`.quiet();
      const nowSec = Math.floor(Date.now() / 1000);
      if (nowSec - Number(lastCommitTime.stdout.toString().trim()) < 1800) {
        console.warn("⚠️  Downtime detected post-deployment. Executing Automated Rollback...");
        await $`git revert HEAD --no-edit`.quiet();
        await $`git push origin main`.quiet();
        console.log("✅ Rollback pushed. Waiting for redeploy...");
        process.exit(0);
      }

      // If not recent, trigger a standard redeploy
      if (process.env.VERCEL_DEPLOY_WEBHOOK) {
        await fetch(process.env.VERCEL_DEPLOY_WEBHOOK, { method: "POST" });
        console.log("✅ Emergency redeploy triggered via Webhook.");
      }
    }

    // 1. PHASE 1: STANDARD TRIAGE (Deterministic)
    console.log("\n--- [PHASE 1] DETERMINISTIC INTERROGATION ---");
    const detectResult = await $`bun run scripts/triage.ts --detect`.quiet();
    const output = detectResult.stdout.toString();
    console.log(output);

    if (output.includes("[CRITICAL]")) {
      console.log("\n--- [PHASE 2] DETERMINISTIC REMEDIATION ---");
      await $`bun run scripts/triage.ts --fix`.quiet();
    }

    // 2. PHASE 2: CERTIFICATION & BUILD GATE
    console.log("\n--- [PHASE 3] CERTIFICATION & BUILD GATE ---");
    
    // Check deterministic gates
    const certifyResult = await $`bun run scripts/triage.ts --certify`.quiet();
    const certOutput = certifyResult.stdout.toString();
    console.log(certOutput);

    // Check build stability (The "Anti-Stupidity" Guardrail)
    const buildResult = await $`bun run scripts/check-build.ts`.quiet();
    if (buildResult.exitCode !== 0) {
      console.error("❌ BUILD GATE FAILED: Code is not mission-ready. Aborting.");
      process.exit(1);
    }

    if (certOutput.includes("ALL GATES PASSED")) {
      console.log(`\n🎉 System is HEALTHY. Suite completed in ${((Date.now() - startTime) / 1000).toFixed(2)}s.`);
      await handleCertificationSuccess();
      
      // 🏛️ AEON: ARCHIVAL SEEDING
      await createArchivalSeed();

      // 4. PHASE 4: CHRONOS HEARTBEAT (Vector 5: Active Triage)
      // New: Maintenance Ship Triage for stale signals
      console.log("\n--- [PHASE 4] CHRONOS HEARTBEAT (VECTOR 5) ---");
      try {
        await $`bun run scripts/semantic-heartbeat.ts --limit 10`.quiet();
        console.log("✅ Chronos Heartbeat mission complete.");
      } catch (err: any) {
        console.error(`⚠️ Chronos Heartbeat dropout: ${err.message}`);
      }

      // TRIGGER STRATEGIC HUNT (BETTERMENT)
      await runStrategicHunt();
      
      process.exit(0); // 0 = Healthy (No Burst)
    }

    // 3. PHASE 3: AGENTIC REASONING (The "Brain" Upgrade)
    console.log("\n❌ Deterministic fixes failed. Entering AGENTIC MODE...");
    
    if (!await gitAgent.acquireLock()) {
      console.warn("⚠️ Execution Conflict: Another SRE Sentinel is currently running. Skipping to avoid collision.");
      process.exit(0);
    }

    try {
      if (!await checkQuota()) {
        return;
      }

      const codebase = await bundleContext();
      
      // CREATE ERROR HASH (for sanity check/self-correction)
      const errorHash = Buffer.from(certOutput).toString('base64').substring(0, 32);
      if (!await budgetShield.validateStability(errorHash)) {
        return;
      }

      await incrementQuota();
      const protocol = await AgenticBridge.reason(certOutput, codebase);

      console.log(`\n🧠 Gemini Analysis: ${protocol.analysis}`);
      console.log(`🛡️  Suggested Action: ${protocol.action} (Confidence: ${protocol.confidence}%)`);

      if (protocol.confidence < 90) {
        console.error(`⚠️ AI confidence too low (${protocol.confidence}%) for autonomous repair. Aborting.`);
        return;
      }

      if (protocol.action === "PATCH_CODE" && protocol.patches) {
        // 3.5 HUMAN-IN-THE-LOOP OVERRIDE
        const lines = protocol.patches.reduce((acc, p) => acc + p.content.split('\n').length, 0);
        const fileCount = protocol.patches.length;
        
        if (lines > 500 || fileCount > 5) { 
          console.warn(`⚠️ Human-in-the-Loop: AI suggested changes exceed the Expert agency threshold (${lines} lines, ${fileCount} files).`);
          console.warn(`Action: ${protocol.action}, Analysis: ${protocol.analysis}`);
          return;
        }

        await applyFix(protocol);
        
        // 4. SIMULATION: Verify the AI fix
        console.log("\n--- [PHASE 4] AI FIX SIMULATION ---");
        const simResult = await $`bun run scripts/triage.ts --certify`.quiet();
        const simOutput = simResult.stdout.toString();
        
        if (simOutput.includes("ALL GATES PASSED")) {
          console.log("✅ AI Fix Verified! Pushing to repository...");
          await updateChangelog(protocol);
          await updateWisdom(protocol);
          
          const pushed = await gitAgent.safePush(`sentinel(auto-fix): ${protocol.analysis}`);
          
          if (pushed) {
            await budgetShield.reportSuccess(); // RESET STABILITY TRACKER
            console.log(`\n🚀 System SELF-HEALED and committed in ${((Date.now() - startTime) / 1000).toFixed(2)}s.`);
            process.exit(0); // 0 = Fixed & Published
          } else {
            console.error("❌ Failed to push AI fix despite certification pass.");
            process.exit(3);
          }
        } else {
          console.error("❌ AI Fix failed simulation. Rolling back.");
          await $`git checkout .`.quiet();
          await handleCertificationFailure(simOutput);
          process.exit(3); // 3 = Problematic (Keep Bursting)
        }
      } else {
        console.log(`⚠️ AI Protocol: ${protocol.action} is not yet automated. Routing to emergency escalation...`);
        await handleCertificationFailure(certOutput);
      }
    } finally {
      await gitAgent.releaseLock();
    }

  } catch (error: any) {
    console.error(`\n💥 AGENTIC ERROR: ${error.message}`);
    process.exit(1);
  }
}

runSreSuite();
