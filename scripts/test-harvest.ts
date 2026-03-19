import { harvest } from "../jobs/scrape-opportunities";

async function test() {
  console.log("🚀 Testing Heartbeat Harvest...");
  const result = await harvest();
  console.log("Result:", result);
}

test();
