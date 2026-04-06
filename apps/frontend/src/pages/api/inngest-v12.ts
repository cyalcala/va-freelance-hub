export const prerender = false;

import { serve } from "inngest/astro";
import { inngest } from "../../lib/inngest/client";
import { jobHarvested } from "../../lib/inngest/functions";

console.log("INNGEST_INIT_V12"); 

// 🧬 DIAGNOSTIC PROBE: Check for undefined function imports
console.log("V12_JOB_HARVESTED_STATE:", typeof jobHarvested);

const handler = serve({
  client: inngest,
  functions: [
    jobHarvested,
  ].filter(f => !!f && !!f.triggers), // 🛡️ Fail-Safe: Prevent "triggers" crash
});


export const GET = async (context: any) => handler.GET(context);
export const POST = async (context: any) => handler.POST(context);
export const PUT = async (context: any) => handler.PUT(context);

// FORCE BUILD: V12 NUCLEAR DISCOVERY ACTIVE
