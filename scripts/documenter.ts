import { db } from "../packages/db/client";
import { agencies, opportunities } from "../packages/db/schema";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { count, eq, sql } from "drizzle-orm";

/**
 * 📄 VA.INDEX AUTOMATED DOCUMENTER
 * 
 * This engine parses the technical git history and live database stats
 * to maintain a high-fidelity CHANGELOG.md without human intervention.
 */

async function run() {
  console.log("\n📄 Generating Automated System Documentation...");

  const changelogPath = "CHANGELOG.md";
  if (!existsSync(changelogPath)) {
    writeFileSync(changelogPath, "# System Changelog\n\n");
  }

  try {
    // 1. Get Live System Metrics (Turso)
    const q1 = sql`SELECT COUNT(*) as count FROM opportunities WHERE is_active = 1`;
    const q2 = sql`SELECT COUNT(*) as count FROM agencies WHERE status = 'active'`;
    
    const oppResult: any = await (db as any).run(q1 as any);
    const agencyResult: any = await (db as any).run(q2 as any);

    const oppCount = oppResult.rows[0]?.count || 0;
    const agencyCount = agencyResult.rows[0]?.count || 0;

    const date = new Date().toISOString().split('T')[0];
    const stats = `[Opportunities: ${oppCount} | Agencies: ${agencyCount}]`;

    // 2. Extract Latest Semantic Changes (Git)
    // We get the last 5 commits to see the context
    const log = execSync('git log -5 --pretty=format:"* %s (%h)"').toString().split('\n');
    
    const feats = log.filter(l => l.toLowerCase().includes("* feat:"));
    const fixes = log.filter(l => l.toLowerCase().includes("* fix:"));
    const chores = log.filter(l => l.toLowerCase().includes("* chore:") || l.toLowerCase().includes("* refactor:"));

    // 3. Construct Markdown Entry
    let newEntry = `\n## [${date}] — ${stats}\n`;
    newEntry += `**Status: AUTO-PROCESSED**\n\n`;

    if (feats.length > 0) {
      newEntry += `### ✨ Major Features\n${feats.join('\n')}\n\n`;
    }
    if (fixes.length > 0) {
      newEntry += `### 🛡️ Reliability & Fixes\n${fixes.join('\n')}\n\n`;
    }
    if (chores.length > 0) {
      newEntry += `### ⚓ Internal Maintenance\n${chores.join('\n')}\n\n`;
    }

    newEntry += `---\n`;

    // 4. Atomic Update: Prepend strictly after the Title
    const content = readFileSync(changelogPath, "utf-8");
    const lines = content.split('\n');
    
    // Find where the first H2 or H1 ends
    let insertIndex = lines.findIndex(l => l.startsWith('## ')) || 2;
    if (insertIndex === -1) insertIndex = 2; // Default after Title

    // Deduplication: Don't add if the exact same commit-set was just added
    if (content.includes(log[0])) {
      console.log("   [i] Most recent commit already documented. Skipping update.");
      return;
    }

    const updatedContent = [
      lines[0], // Keep # Title
      lines[1] || "",
      newEntry,
      ...lines.slice(2)
    ].join('\n');

    writeFileSync(changelogPath, updatedContent);
    console.log(`   [✓] CHANGELOG.md updated with live metrics: ${stats}`);

  } catch (err: any) {
    console.error("   [x] Documentation Engine Failed:", err.message);
  }
}

run().catch(console.error);
