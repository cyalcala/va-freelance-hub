import { Inngest } from "inngest";
import { serve } from "inngest/astro";

// 1. Initialize Inngest client with zero local/external config imports
export const inngestClient = new Inngest({ id: "va-freelance-hub" });

// 2. Define jobHarvested function with direct event trigger
const jobHarvested = inngestClient.createFunction(
  { id: "v12-job-harvested" },
  { event: "v12/job.harvested" },
  async ({ event, step }) => {
    // 3. Dynamic import to bypass top-level poisoning
    const { startV12Sifter } = await import("../../lib/ai/waterfall");
    await startV12Sifter(event.data);
    return { status: "sifted" };
  }
);

// 4. Export the GET, POST, and PUT serve handlers explicitly for Astro/Vercel
export const { GET, POST, PUT } = serve({ 
  client: inngestClient, 
  functions: [jobHarvested] 
});

