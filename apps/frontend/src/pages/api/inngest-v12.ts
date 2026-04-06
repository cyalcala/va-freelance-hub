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

/**
 * 🚜 JOB HARVESTED WORKER (V12)
 * Lazy-loaded to ensure discovery stability.
 */
const jobHarvestedWorker = inngest.createFunction(
  { 
    id: "job-harvested", 
    name: "Job Harvested (V12)",
    triggers: [{ event: "job.harvested" }] 
  },
  async (args) => {
    console.log("🧬 [V12] Invoking Lazy-Load Proxy for job.harvested...");
    // Dynamic import to prevent circular dependency at Discovery time
    const { jobHarvested } = await import("../../lib/inngest/functions");
    // @ts-ignore - The internal fn expects the same args Inngest provides
    return jobHarvested.fn(args);
  }
);

// 🛡️ NATIVE EXPORTS: Use the SDK's built-in Astro handlers
const handler = serve({
  client: inngest,
  functions: [
    v12Ping,
    jobHarvestedWorker,
  ],
});


export const GET = async (ctx: any) => handler.GET(ctx);
export const POST = async (ctx: any) => handler.POST(ctx);
export const PUT = async (ctx: any) => handler.PUT(ctx);

