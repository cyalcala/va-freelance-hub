import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

/**
 * VA.INDEX UX Audit v1.0
 * MISSION: Prevent "Heavy" or "Unnavigable" UI regressions.
 */
function runAudit() {
  console.log("🧐  VA.INDEX Sentinel: Executing UX Performance Audit...");
  
  const distPath = path.join(process.cwd(), "apps", "frontend", "dist");
  
  if (!fs.existsSync(distPath)) {
    console.warn("⚠️  Audit Warning: 'dist' folder not found. Run 'bun run build' first.");
    return;
  }

  // 1. Payload Size Gate
  const files = fs.readdirSync(distPath, { recursive: true }) as string[];
  let totalSize = 0;
  for (const file of files) {
    const filePath = path.join(distPath, file);
    if (fs.statSync(filePath).isFile()) {
      totalSize += fs.statSync(filePath).size;
    }
  }

  const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  console.log(`📊  Total Build Payload: ${sizeMB}MB`);

  if (totalSize > 5 * 1024 * 1024) { // 5MB limit for the entire app
    console.error("❌  REJECTED: Total payload exceeds 5MB 'Titanium' limit.");
    process.exit(1);
  }

  // 2. JS Bloat Gate
  const jsFiles = files.filter(f => f.endsWith(".js"));
  let jsSize = 0;
  jsFiles.forEach(f => jsSize += fs.statSync(path.join(distPath, f)).size);
  
  const jsKB = (jsSize / 1024).toFixed(2);
  console.log(`⚡  Total JS Content: ${jsKB}KB`);

  if (jsSize > 250 * 1024) { // 250KB limit for client-side JS
    console.warn("⚠️  WARNING: Client-side JS exceeds 250KB. Optimization recommended.");
  }

  console.log("\n✅  UX AUDIT PASSED: Site is fluid and mission-ready.");
}

runAudit();
