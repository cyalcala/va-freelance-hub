import { AIMesh } from "../packages/ai/ai-mesh";

async function runFailoverSimulation() {
  console.log("═══ SRE MESH FAILOVER SIMULATION ═══");
  
  const originalFetch = global.fetch;
  let attemptCount = 0;

  // Mock Fetch to simulate 429 for preferred providers
  global.fetch = (async (url: string, opts: any) => {
    attemptCount++;
    const urlStr = url.toString();
    
    // Simulate 429 for OpenRouter and Groq
    if (urlStr.includes("openrouter.ai") || urlStr.includes("api.groq.com")) {
      console.log(`[MOCK] Simulating 429 Rate Limit for: ${urlStr}`);
      return {
        ok: false,
        status: 429,
        json: async () => ({ error: { message: "Rate limit exceeded (Simulated)" } })
      };
    }

    // Allow Gemini to succeed
    if (urlStr.includes("generativelanguage.googleapis.com")) {
      console.log(`[MOCK] Allowing success for: ${urlStr}`);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  title: "Simulated SRE Job",
                  company: "Failover Test Corp",
                  salary: "100k",
                  description: "A job extracted via Gemini fallback.",
                  niche: "TECH_ENGINEERING",
                  type: "direct",
                  locationType: "remote",
                  tier: 1,
                  isPhCompatible: true,
                  relevanceScore: 90
                })
              }]
            }
          }]
        })
      };
    }

    return originalFetch(url, opts);
  }) as any;

  try {
    const testHtml = "<html><body><h1>Lead Developer</h1><p>Remote Philippines</p></body></html>";
    console.log("\n[SIMULATION] Triggering AIMesh.extract...");
    
    const start = Date.now();
    const result = await AIMesh.extract(testHtml);
    const duration = Date.now() - start;

    console.log("\n✅ SIMULATION SUCCESSFUL");
    console.log(`- Duration: ${duration}ms`);
    console.log(`- Result Model: ${result.metadata?.model}`);
    console.log(`- Extraction: ${result.title} @ ${result.company}`);
    
    // Recovery Phase: Check if cooldowns were reported
    const { getAIStatus } = await import("../packages/db/supabase");
    const statuses = await getAIStatus();
    console.log("\n[COOLDOWN AUDIT]");
    statuses.forEach(s => {
      if (s.is_blocked) {
        console.log(`- 🚩 ${s.provider_name} is now BLOCKED in Supabase.`);
      }
    });

  } catch (err: any) {
    console.error("\n❌ SIMULATION FAILED:", err.message);
  } finally {
    global.fetch = originalFetch;
    console.log("\n═══ FAILOVER SIMULATION COMPLETE ═══");
  }
}

runFailoverSimulation();
