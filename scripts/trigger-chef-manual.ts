import { tasks } from "@trigger.dev/sdk/v3";
import 'dotenv/config';

async function triggerChef() {
  console.log("🚀 [TRIGGER-SYNC] Triggering manual v12Chef task...");
  
  try {
    const handle = await tasks.trigger("v12-pantry-sous-chef", {
      force: true
    });
    console.log("✅ Task triggered successfully:", handle.id);
  } catch (err: any) {
    console.error("❌ Failed to trigger Trigger.dev task:", err.message);
    console.log("💡 Note: You may need to run 'bunx trigger.dev@latest login' or ensure TRIGGER_SECRET_KEY is valid.");
  }

  process.exit(0);
}

triggerChef();
