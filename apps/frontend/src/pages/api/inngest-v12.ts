export const prerender = false;

import { serve } from "inngest/astro";
import { Inngest } from "inngest";

// 🧬 NUCLEAR ISOLATION: Local Client
// This prevents circular dependency crashes during Inngest Discovery
const inngest = new Inngest({ 
  id: "va-freelance-hub-v12",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

/**
 * 🛰️ V12 DISCOVERY PROBE
 * This function is defined locally to ensure the Handshake always succeeds.
 */
const v12DiscoveryProbe = inngest.createFunction(
  { id: "v12-discovery-probe", name: "V12 Discovery Probe" },
  { event: "v12/probe.ping" },
  async ({ event, step }) => {
    await step.run("log-handshake", async () => {
      console.log("V12 Handshake Successful at", new Date().toISOString());
      return { status: "online", version: "12.0.0-titanium" };
    });
  }
);

// 🧪 DIAGNOSTIC WORKER: Lazy-loaded for runtime stability
const jobHarvestedProxy = async (args: any) => {
  const { jobHarvested } = await import("../../lib/inngest/functions");
  return jobHarvested.fn(args);
};

// We create a wrapper function for discovery that handles the triggers correctly
const jobHarvestedWorker = inngest.createFunction(
  { id: "job-harvested", name: "Job Harvested (V12)" },
  { event: "job.harvested" },
  jobHarvestedProxy as any
);

const handler = serve({
  client: inngest,
  functions: [
    v12DiscoveryProbe,
    jobHarvestedWorker,
  ],
});

export const GET = async (context: any) => handler.GET(context);
export const POST = async (context: any) => handler.POST(context);
export const PUT = async (context: any) => handler.PUT(context);
