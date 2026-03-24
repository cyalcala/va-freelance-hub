import { schedules, configure } from "@trigger.dev/sdk/v3";
import "dotenv/config";

/**
 * 🛰️ TRIGGER.DEV MAINTENANCE: LIST ALL SCHEDULES
 * MISSION: Identifying why the 10/10 limit is still active.
 */

async function main() {
  const secretKey = process.env.TRIGGER_SECRET_KEY;
  if (!secretKey) {
    console.error("❌ ERROR: TRIGGER_SECRET_KEY is not set in .env");
    return;
  }

  console.log("📡 Interrogating Trigger.dev Cloud for all schedules...");

  try {
    configure({ secretKey });
    
    // In v3, we can list schedules. 
    // Note: The SDK might have slightly different methods depending on version.
    const result = await schedules.list();

    console.log(`\n📊 FOUND ${result.data.length} SCHEDULES:`);
    result.data.forEach((s: any) => {
      console.log(`- [${s.active ? 'ACTIVE' : 'INACTIVE'}] ID: ${s.id} | Task: ${s.task} | Cron: ${s.cron}`);
    });

    if (result.data.length >= 10) {
      console.log("\n⚠️ WARNING: You are at or above the 10-schedule limit.");
    }

  } catch (err: any) {
    console.error(`\n❌ FAILED: ${err.message}`);
  }
}

main();
