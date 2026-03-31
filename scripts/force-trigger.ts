import { tasks } from "@trigger.dev/sdk/v3";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  console.log("🚀 APEX SRE: Force-triggering ats-sniper in production...");
  
  try {
    const handle = await tasks.trigger("ats-sniper", {});
    console.log("✅ Task triggered successfully!");
    console.log("🔗 Run URL:", `https://cloud.trigger.dev/projects/v3/proj_hzeuykzmhlzwmqeljfft/runs/${handle.id}`);
  } catch (error) {
    console.error("🔴 Trigger failed:", error);
    process.exit(1);
  }
}

main();
