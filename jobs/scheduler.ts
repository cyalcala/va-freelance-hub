import cron from "node-cron";
import { scrapeOpportunities } from "./scrape-opportunities";
import { verifyLinks } from "./verify-links";
import { sendAlert } from "./alert";

console.log("Starting native job scheduler...");

// Scrape every 2 hours
cron.schedule("0 */2 * * *", async () => {
  try {
    console.log("[cron] Running scrapeOpportunities...");
    const res = await scrapeOpportunities();
    if (res.inserted === 0 && res.skipped === 0) {
      await sendAlert("⚠️ Scraper returned 0 total items across all sources. Possible widespread failure or bot block.");
    }
  } catch (err: any) {
    console.error("[cron] scrapeOpportunities failed:", err);
    await sendAlert(`❌ Critical Scraper Failure: ${err.message}`);
  }
});

// Verify links at 6:00 AM every day
cron.schedule("0 6 * * *", async () => {
  try {
    console.log("[cron] Running verifyLinks...");
    const res = await verifyLinks();
    if (res.deactivated > res.checked * 0.5 && res.checked > 20) {
      // Alert if an abnormal amount (>50%) of links died at once
      await sendAlert(`⚠️ High link mortality rate: ${res.deactivated} out of ${res.checked} active jobs were deactivated today. Check for aggressive bot blocking.`);
    }
  } catch (err: any) {
    console.error("[cron] verifyLinks failed:", err);
    await sendAlert(`❌ Critical Verifier Failure: ${err.message}`);
  }
});

console.log("Scheduler is active. Press Ctrl+C to exit.");
