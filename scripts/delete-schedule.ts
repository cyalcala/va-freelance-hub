import { schedules, configure } from "@trigger.dev/sdk/v3";
import "dotenv/config";

/**
 * 🛰️ TRIGGER.DEV MAINTENANCE: DELETE SCHEDULE
 * MISSION: Free up slots in the 10-schedule free tier.
 */

async function main() {
  const secretKey = process.env.TRIGGER_SECRET_KEY;
  const scheduleId = "sched_zytgmuykmw2skn1jemq4y";

  if (!secretKey) {
    console.error("❌ ERROR: TRIGGER_SECRET_KEY is not set in .env");
    return;
  }

  console.log(`📡 Deleting schedule: ${scheduleId}...`);

  try {
    configure({ secretKey });
    await schedules.del(scheduleId);
    console.log("✅ SUCCESS: Schedule deleted. You can now re-run 'bun run trigger:deploy'.");
  } catch (err: any) {
    console.error(`❌ FAILED: ${err.message}`);
  }
}

main();
