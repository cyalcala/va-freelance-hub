import { Inngest } from "inngest";
import 'dotenv/config';

async function triggerPoll() {
  console.log("🚀 [INNGESET-SYNC] Triggering manual pantry.poll event...");
  
  const inngest = new Inngest({ 
    id: "va-freelance-hub",
    eventKey: process.env.INNGEST_EVENT_KEY 
  });

  try {
    const result = await inngest.send({
      name: "pantry.poll",
      data: {
        force: true
      }
    });
    console.log("✅ Event sent successfully:", result);
  } catch (err: any) {
    console.error("❌ Failed to send Inngest event:", err.message);
  }

  process.exit(0);
}

triggerPoll();
