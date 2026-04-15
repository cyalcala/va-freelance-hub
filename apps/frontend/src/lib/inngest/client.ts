import { Inngest } from "inngest";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// V12 Path Resolution: Ensure .env is found even when running in workspace sub-dirs
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../../../.env") }); // Root .env
dotenv.config({ path: path.resolve(__dirname, "../../../.env") }); // Local frontend .env


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
