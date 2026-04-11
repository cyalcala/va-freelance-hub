import { Inngest } from "inngest";
import "dotenv/config";

// Verifying keys for V12 Handshake
const eventKey = process.env.INNGEST_EVENT_KEY;
const signingKey = process.env.INNGEST_SIGNING_KEY;

if (!eventKey) {
  console.warn("⚠️ [INNGEST] Missing INNGEST_EVENT_KEY. Ingestion will fail to send events.");
}

export const inngest = new Inngest({ 
  id: "va-freelance-hub",
  eventKey: eventKey || "MISSING_KEY", // Fallback to avoid uncaught constructor errors
});
