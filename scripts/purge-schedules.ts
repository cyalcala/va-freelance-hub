import { schedules, configure } from "@trigger.dev/sdk/v3";
import "dotenv/config";

/**
 * 🛰️ TRIGGER.DEV MAINTENANCE: PURGE REDUNDANT SCHEDULES
 * MISSION: Free up 4 slots in the 10-schedule free tier.
 */

async function main() {
  const secretKey = process.env.TRIGGER_SECRET_KEY;
  if (!secretKey) {
    console.error("❌ ERROR: TRIGGER_SECRET_KEY is not set in .env");
    return;
  }

  const idsToPurge = [
    "sched_jvrxkhi6o3mpa6jd1uqvs", // isolated-ping
    "sched_er5exfgtywm66d72oezo3", // ping-heartbeat
    "sched_rsyydjhbbn9dn6szqtccw", // backup-snapshot
    "sched_o3i1km19whz61yb6xfign"  // verify-links
  ];

  console.log(`📡 Initiating Purge of ${idsToPurge.length} schedules...`);

  try {
    configure({ secretKey });
    
    for (const id of idsToPurge) {
      try {
        await schedules.del(id);
        console.log(`✅ DELETED: ${id}`);
      } catch (e: any) {
        console.warn(`⚠️ FAILED to delete ${id}: ${e.message}`);
      }
    }

    console.log("\n🚀 Purge Complete. You now have 4 available slots.");

  } catch (err: any) {
    console.error(`\n❌ CRITICAL FAILURE: ${err.message}`);
  }
}

main();
