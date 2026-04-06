export const prerender = false;

import { serve } from "inngest/astro";
import { Inngest } from "inngest";

// 🧬 ATOMIC STABILIZATION: Zero-Import Handshake
// This is the absolute minimum Inngest handler for Astro v4.
const inngest = new Inngest({ 
  id: "va-freelance-hub-v12",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

/**
 * 🛰️ V12 PING
 * Atomic function to verify the "Baton Pass" from the cloud to the serverless function.
 */
const v12Ping = inngest.createFunction(
  { 
    id: "v12-ping", 
    name: "V12 Handshake Ping",
    triggers: [{ event: "v12/ping" }] 
  },
  async ({ event, step }) => {
    return { status: "success", timestamp: new Date().toISOString(), hello: "world" };
  }
);

// 🛡️ NATIVE EXPORTS: Use the SDK's built-in Astro handlers
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    v12Ping,
  ],
});
