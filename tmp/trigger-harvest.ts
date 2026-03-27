import { tasks } from "@trigger.dev/sdk/v3";
import { createDb } from "../packages/db/client";

async function trigger() {
  console.log("🚀 Triggering Emergency Harvest...");
  // In a real environment, we'd use tasks.trigger, but here we can just call the harvest function directly for verification
  const { harvest } = await import("../jobs/scrape-opportunities");
  const { db, client } = createDb();
  try {
    const result = await harvest(db);
    console.log(`✅ Harvest Complete: ${result.processed} signals processed.`);
  } catch (err) {
    console.error("❌ Harvest Failed:", err);
  } finally {
    await client.close();
  }
}

trigger();
