import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";

/**
 * ⚡ ONE-CLICK RESURRECTION
 * 
 * Automatically finds the LATEST healthy snapshot in the registry
 * and restores the system to that state.
 */
async function resurrect() {
  const registryPath = ".backups/registry.json";
  
  if (!existsSync(registryPath)) {
    console.error("❌ No snapshots found in registry. Please create one first using 'bun run save'.");
    process.exit(1);
  }

  try {
    const registry = JSON.parse(readFileSync(registryPath, "utf-8"));
    const latest = registry[0];

    if (!latest) {
      console.error("❌ Registry is empty.");
      process.exit(1);
    }

    console.log(`\n🌩️  Initiating One-Click Resurrection to [${latest.name}]...`);
    console.log(`   [Timestamp]: ${latest.timestamp}`);
    console.log(`   [Context]: ${latest.context}`);
    console.log(`   [Commit]: ${latest.commitHash}\n`);

    // Execute the existing restore script
    execSync(`bun run scripts/restore.ts ${latest.name}`, { stdio: "inherit" });

    console.log(`\n🌟 Resurrection Complete. The system is back in its last known healthy state.`);
  } catch (err) {
    console.error("❌ Resurrection Failed:", err);
    process.exit(1);
  }
}

resurrect();
