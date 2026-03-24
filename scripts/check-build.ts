import { spawnSync } from "child_process";
import path from "path";

/**
 * VA.INDEX Deployment Guardrail v1.0
 * DO NOT PUSH IF THIS FAILS.
 */
function checkBuild() {
  console.log("🛡️  VA.INDEX Sentinel: Initiating Pre-Push Build Audit...");
  
  const frontendPath = path.join(process.cwd(), "apps", "frontend");
  
  const result = spawnSync("bun", ["run", "build"], {
    cwd: frontendPath,
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    console.error("\n❌ ARREST: Build failed. Push aborted to prevent production crash.");
    process.exit(1);
  }

  console.log("\n✅ BUILD CERTIFIED: Code is mission-ready.");
}

checkBuild();
