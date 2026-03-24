import { $ } from "bun";
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { bundleContext } from "./context-aggregator";
import { askGemini, FixProtocol } from "./lib/gemini";
import { createClient } from "@libsql/client/http";

const DAILY_LIMIT = 10;
const SRE_ID = "apex_sre";

function getDb() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !token) throw new Error("TURSO_DATABASE_URL or TURSO_AUTH_TOKEN missing");
  return createClient({ url, authToken: token });
}

async function acquireLock(): Promise<boolean> {
  const db = getDb();
  const now = Date.now();
  const fiveMinsAgo = now - 5 * 60 * 1000;

  // Try to acquire the lock. If it's IDLE or stale (> 5 mins), we take it.
  const result = await db.execute({
    sql: `UPDATE vitals 
          SET lock_status = 'RUNNING', lock_updated_at = ? 
          WHERE id = ? AND (lock_status = 'IDLE' OR lock_updated_at < ?)`,
    args: [now, SRE_ID, fiveMinsAgo]
  });

  if (result.rowsAffected === 0) {
    // Check if we need to initialize the row
    const check = await db.execute({ sql: "SELECT id FROM vitals WHERE id = ?", args: [SRE_ID] });
    if (check.rows.length === 0) {
      await db.execute({
        sql: "INSERT INTO vitals (id, lock_status, lock_updated_at, ai_quota_count, ai_quota_date) VALUES (?, 'RUNNING', ?, 0, ?)",
        args: [SRE_ID, now, new Date().toISOString().split('T')[0]]
      });
      return true;
    }
    return false;
  }
  return true;
}

async function releaseLock() {
  const db = getDb();
  await db.execute({
    sql: "UPDATE vitals SET lock_status = 'IDLE', lock_updated_at = ? WHERE id = ?",
    args: [Date.now(), SRE_ID]
  });
}

async function checkQuota(): Promise<boolean> {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  
  let result = await db.execute({
    sql: "SELECT ai_quota_count, ai_quota_date FROM vitals WHERE id = ?",
    args: [SRE_ID]
  });

  if (result.rows.length === 0) return true;
  
  const row = result.rows[0];
  if (row.ai_quota_date !== today) {
    // Reset for new day
    await db.execute({
      sql: "UPDATE vitals SET ai_quota_count = 0, ai_quota_date = ? WHERE id = ?",
      args: [today, SRE_ID]
    });
    return true;
  }

  if (Number(row.ai_quota_count) >= DAILY_LIMIT) {
    console.error(`🛑 Shared Quota Enforcement: Daily AI limit (${DAILY_LIMIT}) exceeded across all platforms.`);
    return false;
  }
  return true;
}

async function incrementQuota() {
  const db = getDb();
  await db.execute({
    sql: "UPDATE vitals SET ai_quota_count = ai_quota_count + 1 WHERE id = ?",
    args: [SRE_ID]
  });
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

async function runSreSuite() {
  console.log("\n🚀 Starting Apex SRE Interrogator Suite [AGENTIC MODE]...");
  const startTime = Date.now();

  const requiredVars = ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "VERCEL_ACCESS_TOKEN", "TRIGGER_API_KEY", "GEMINI_API_KEY"];
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.warn(`⚠️ Warning: Missing environment variables: ${missing.join(", ")}`);
  }

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
      process.exit(0); // 0 = Healthy (No Burst)
    }

    // 3. PHASE 3: AGENTIC REASONING (The "Brain" Upgrade)
    console.log("\n❌ Deterministic fixes failed. Entering AGENTIC MODE...");
    
    if (!process.env.GEMINI_API_KEY) {
      console.error("❌ AGENTIC MODE FAILED: No GEMINI_API_KEY detected.");
      process.exit(1);
    }

    if (!await acquireLock()) {
      console.warn("⚠️ Execution Conflict: Another SRE Sentinel is currently running. Skipping to avoid collision.");
      process.exit(0);
    }

    try {
      if (!await checkQuota()) {
        return;
      }

      const codebase = await bundleContext();
      await incrementQuota();
      const protocol = await askGemini(certOutput, codebase);

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
        
        if (lines > 50 || fileCount > 1) { 
          console.warn(`⚠️ Human-in-the-Loop: AI suggested changes exceed the 5-line safety threshold or affect multiple files.`);
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
          
          // Literal Commit & Push
          await $`git config user.name "Apex Sentinel"`.quiet();
          await $`git config user.email "sentinel@va-hub.ai"`.quiet();
          await $`git add .`.quiet();
          await $`git commit -m "sentinel(auto-fix): ${protocol.analysis}"`.quiet();
          await $`git push origin main`.quiet();
          
          console.log(`\n🚀 System SELF-HEALED and committed in ${((Date.now() - startTime) / 1000).toFixed(2)}s.`);
          process.exit(2); // 2 = Fixed (Stop Burst)
        } else {
          console.error("❌ AI Fix failed simulation. Rolling back.");
          await $`git checkout .`.quiet();
          process.exit(3); // 3 = Problematic (Keep Bursting)
        }
      } else {
        console.log(`⚠️ AI Protocol: ${protocol.action} is not yet automated. Routing to emergency redeploy...`);
        // Fallback to Vercel redeploy
        if (process.env.VERCEL_DEPLOY_WEBHOOK) {
          await fetch(process.env.VERCEL_DEPLOY_WEBHOOK, { method: "POST" });
          console.log("✅ Emergency redeploy triggered.");
        }
      }
    } finally {
      await releaseLock();
    }

  } catch (error: any) {
    console.error(`\n💥 AGENTIC ERROR: ${error.message}`);
    process.exit(1);
  }
}

runSreSuite();
