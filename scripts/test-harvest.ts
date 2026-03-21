import { harvest } from "../jobs/scrape-opportunities";

async function test() {
  try {
    console.log("TESTING HARVEST...");
    const start = Date.now();
    const result = await harvest();
    const end = Date.now();
    console.log("RESULT:", JSON.stringify(result, null, 2));
    console.log(`TIME: ${(end - start) / 1000}s`);
  } catch (e: any) {
    console.error("TEST_FAIL:", e.message, e.stack);
  }
}
test();
