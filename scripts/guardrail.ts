import { readdirSync, lstatSync, renameSync, existsSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

/**
 * 🛡️ VA.INDEX ARCHITECTURAL GUARDRAIL
 * 
 * This engine serves as the project's "Immune System". 
 * It automatically detects misplaced files in the repository root 
 * and relocates them to their structurally correct "Home" before every commit.
 */

const ALLOWED_ROOT_FILES = [
  "package.json", "bun.lock", "bun.lockb", "tsconfig.json",
  ".gitignore", ".env", ".env.example", ".trigger",
  "CHANGELOG.md", "README.md", "ARCHITECTURE.md", "MISSION.md", "CLAUDE.md",
  "trigger.config.ts", "bunfig.toml", ".gitattributes"
];

const ALLOWED_ROOT_DIRS = [
  "apps", "jobs", "packages", "scripts", "node_modules", ".git", ".husky", ".backups", ".gemini"
];

const DESTINATIONS = {
  astro: "apps/frontend/src/pages/",
  css: "apps/frontend/src/styles/",
  md: "scripts/docs/", // Fallback for miscellaneous MDs
};

async function run() {
  console.log("\n🛡️  Executing Architectural Guardrail Check...");

  const root = "./";
  const items = readdirSync(root);
  let fixedCount = 0;

  for (const item of items) {
    const fullPath = join(root, item);
    const stats = lstatSync(fullPath);

    // 1. Check for Misplaced Directories
    if (stats.isDirectory()) {
      if (!ALLOWED_ROOT_DIRS.includes(item)) {
        console.warn(`   [!] Unknown directory detected in root: ${item}`);
        // We don't auto-delete non-empty dirs, but we flag them.
        continue;
      }
    }

    // 2. Check for Misplaced Files
    if (stats.isFile()) {
      if (ALLOWED_ROOT_FILES.includes(item)) continue;

      // Logic to find a new home
      let newHome: string | null = null;
      const ext = item.split('.').pop();

      if (ext === 'astro') {
        newHome = DESTINATIONS.astro;
      } else if (ext === 'css') {
        newHome = DESTINATIONS.css;
      } else if (ext === 'ts') {
        // Intelligent TS Routing
        const content = readFileSync(fullPath, "utf-8");
        if (content.includes("packages/db") || content.includes("drizzle-orm")) {
          newHome = "packages/db/";
        } else if (content.includes("trigger.dev") || item.includes("scrape")) {
          newHome = "jobs/";
        } else {
          newHome = "scripts/";
        }
      }

      if (newHome) {
        if (!existsSync(newHome)) mkdirSync(newHome, { recursive: true });
        
        const targetPath = join(newHome, item);
        console.log(`   [→] Relocating misplaced file: ${item} -> ${targetPath}`);
        renameSync(fullPath, targetPath);
        
        // Re-stage the file in git if we are in a git environment
        try {
          execSync(`git add ${targetPath}`);
          execSync(`git rm ${fullPath}`);
        } catch {}
        
        fixedCount++;
      }
    }
  }

  if (fixedCount > 0) {
    console.log(`\n✅ Guardrail successfully corrected ${fixedCount} architectural drifts.`);
  } else {
    console.log("   [✓] Architecture is pristine. No misallocations detected.");
  }
}

run().catch(console.error);
