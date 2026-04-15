import { inngest } from "../apps/frontend/src/lib/inngest/client";
import "dotenv/config";

async function diag() {
  console.log("--- INNGEST DIAGNOSTIC (JOBS CONTEXT) ---");
  console.log("INNGEST_EVENT_KEY exists:", !!process.env.INNGEST_EVENT_KEY);
  if (process.env.INNGEST_EVENT_KEY) {
     console.log("INNGEST_EVENT_KEY length:", process.env.INNGEST_EVENT_KEY.length);
     console.log("INNGEST_EVENT_KEY start:", process.env.INNGEST_EVENT_KEY.substring(0, 5) + "...");
  } else {
     console.log("INNGEST_EVENT_KEY is MISSING from process.env");
  }

  try {
    const res = await inngest.send({ name: "diag.pulse", data: { time: Date.now() } });
    console.log("✅ Send success:", res);
  } catch (err: any) {
    console.error("❌ Send failed:", err.message);
  }
}

diag().catch(console.error);
