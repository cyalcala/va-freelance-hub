import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import jsonata from "jsonata";
import { extractionRules } from "@va-hub/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * VA.INDEX Autonomous Harvester (The Schema Healer)
 * Uses Gemini 1.5 Flash to map mutated upstream JSON back to our strict schema.
 * Implements Titanium Rule-Caching: The LLM generates a JSONata rule for reuse.
 */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash-lite",
  systemInstruction: `
    YOU ARE THE VA.INDEX SIGNAL SCHOLAR.
    Your mission is to map raw signals from Tier 1 into our final schema.
    
    CRITICAL CONSTRAINTS:
    - Receive raw data validated by Tier 1.
    - Respond in application/json format.
  `,
  generationConfig: {
    temperature: 0.1,
    responseMimeType: "application/json",
  }
});

/**
 * Macro-Sieve (The Bouncer)
 * Tier 1: Cerebras (Turbo-fast, cheap Qwen-3).
 * Fallback: Gemini (The Resilient Backup).
 */
export async function callMacroSieve(payload: any, db: any): Promise<{ pass_to_tier2: boolean; extracted_payload: any; throttle_expanded: boolean }> {
  const SYSTEM_PROMPT = "You are the macro-sieve. Extract (Intent, Niche, Geography). Return ONLY JSON: { pass_to_tier2: boolean, extracted_payload: object }. Set pass_to_tier2: true ONLY if the job is remote/Filipino-friendly.";
  
  // 1. Attempt Tier 1 (Cerebras)
  try {
    const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.CEREBRAS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen-3-235b-a22b-instruct-2507",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(payload).slice(0, 50000) } // Safety slice
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = JSON.parse(data.choices[0].message.content);
      return { ...content, throttle_expanded: false };
    }
    
    if (response.status === 429 || response.status >= 500) {
      throw new Error(`Cerebras Sieve Downtime: ${response.status}`);
    }
  } catch (err) {
    console.warn(`[MacroSieve] Cerebras failed (${(err as Error).message}). Activating Gemini Failover...`);
  }

  // 2. Fallback: Gemini assumes "Bouncer" duties
  try {
    const { checkAndIncrementAiQuota } = await import("./job-utils.js");
    const canCallAi = await checkAndIncrementAiQuota(db);
    if (!canCallAi) return { pass_to_tier2: false, extracted_payload: null, throttle_expanded: false };

    const aiResult = await model.generateContent(`
      ROLE: FALLBACK MACRO-SIEVE
      TASK: ${SYSTEM_PROMPT}
      PAYLOAD: ${JSON.stringify(payload).slice(0, 100000)}
    `);
    
    const content = JSON.parse(aiResult.response.text());
    console.log("[MacroSieve] Gemini Failover Successful. Throttle Expansion Triggered.");
    return { ...content, throttle_expanded: true };
  } catch (err) {
    console.error("[MacroSieve] Critical Failover Failure:", (err as Error).message);
    return { pass_to_tier2: false, extracted_payload: null, throttle_expanded: false };
  }
}

/**
 * Minifies a JSON payload to maximize Gemini's context window.
 * Removes whitespace, nulls, and repeated boilerplate.
 */
function minifyPayload(json: any): string {
  const minified = JSON.stringify(json, (key, value) => {
    if (value === null || value === undefined || value === "") return undefined;
    if (Array.isArray(value) && value.length > 50) return value.slice(0, 50); // Sample large arrays
    return value;
  });
  return minified.slice(0, 100000); // 100k char limit for Flash Free Tier (approx 25k tokens)
}

export const OpportunitySchema = z.object({
  title: z.string().default("Untitled Role"),
  company: z.string().optional().default("Direct Hire"),
  type: z.string().optional().default("agency"),
  sourceUrl: z.string().url(),
  sourcePlatform: z.string().optional(),
  description: z.string().optional().nullable(),
  postedAt: z.string().optional().nullable(),
  locationType: z.string().optional().default("remote"),
  payRange: z.string().optional().nullable(),
});

export type OpportunityPayload = z.infer<typeof OpportunitySchema>;

/**
 * Heals an entire batch of mutated data.
 * Strategy: Fast Path (Cached JSONata) -> Slow Path (Gemini Rule Discovery).
 */
export async function healBatchWithLLM(db: any, rawJson: any, sourceName: string): Promise<OpportunityPayload[]> {
  if (!process.env.GEMINI_API_KEY) {
    console.error("[Healer] GEMINI_API_KEY not set.");
    return [];
  }

  // 1. FAST PATH: Check for existing JSONata rule
  try {
    const existingRules = await db.select()
      .from(extractionRules)
      .where(eq(extractionRules.sourceName, sourceName))
      .limit(1);

    if (existingRules.length > 0) {
      const rule = existingRules[0];
      const expression = jsonata(rule.jsonataPattern);
      const result = await expression.evaluate(rawJson);
      
      if (Array.isArray(result) && result.length > 0) {
        const validated = result
          .map(item => OpportunitySchema.safeParse({ ...item, sourcePlatform: sourceName }))
          .filter(p => p.success)
          .map(p => p.data);

        if (validated.length > 0) {
          console.log(`[Healer] Fast Path Success: ${validated.length} records parsed via cached rule for ${sourceName}.`);
          return validated;
        }
      }
      console.warn(`[Healer] Cached rule for ${sourceName} returned no valid data. Entering Slow Path.`);
    }
  } catch (cacheErr) {
    console.warn(`[Healer] Rule Engine Error (skipping to LLM):`, (cacheErr as Error).message);
  }

  // 2. TIER 1/FALLBACK: Macro-Sieve (The Bouncer)
  const sieveResult = await callMacroSieve(rawJson, db);
  
  // Signal Throttle Expansion if failover was active
  if (sieveResult.throttle_expanded) {
    const { signalThrottleExpansion } = await import("./job-utils.js");
    await signalThrottleExpansion(db);
  }

  if (!sieveResult.pass_to_tier2) {
    console.log(`[Healer] Macro-Sieve rejected data for ${sourceName}. Reasons: Non-Philippine or High Noise.`);
    return [];
  }

  // 3. TIER 2: Gemini Discovery (The Scholar)
  const { checkAndIncrementAiQuota } = await import("./job-utils.js");
  const canCallAi = await checkAndIncrementAiQuota(db);
  if (!canCallAi) return [];

  const minified = minifyPayload(rawJson);
  let currentPrompt = `
    Source "${sourceName}" validated by Tier 1. 
    Analyze this minified payload (extracted from Sanitizer) and generate a JSONata rule.
    Extracted Metadata: ${JSON.stringify(sieveResult.extracted_payload)}
    
    PAYLOAD: ${minified}
  `;

  let attempts = 0;
  const MAX_ATTEMPTS = 2;

  while (attempts < MAX_ATTEMPTS) {
    try {
      attempts++;
      const aiResult = await model.generateContent(currentPrompt);
      const parsedAi = JSON.parse(aiResult.response.text());
      const { rule, data } = parsedAi;

      // 3. VERIFICATION: Test the rule locally
      if (rule) {
        try {
          const expression = jsonata(rule);
          const verifyResult = await expression.evaluate(rawJson);
          
          if (!Array.isArray(verifyResult) || verifyResult.length === 0) {
            throw new Error("Generated rule returned empty or non-array data.");
          }

          // Success - Persist and Return
          const validated = verifyResult
            .map(item => OpportunitySchema.safeParse({ ...item, sourcePlatform: sourceName }))
            .filter(p => p.success)
            .map(p => p.data);

          if (validated.length > 0) {
            await db.insert(extractionRules)
              .values({
                id: uuidv4(),
                sourceName,
                jsonataPattern: rule,
                confidenceScore: 95,
                samplePayload: minified.slice(0, 5000),
                lastValidatedAt: new Date()
              })
              .onConflictDoUpdate({
                target: extractionRules.sourceName,
                set: { 
                  jsonataPattern: rule, 
                  lastValidatedAt: new Date(),
                  samplePayload: minified.slice(0, 5000),
                  failureReason: null,
                  lastErrorLog: null
                }
              });

            console.log(`[Healer] New Intelligent Rule Cached for ${sourceName} (Attempts: ${attempts}).`);
            return validated;
          }
        } catch (ruleErr) {
          console.warn(`[Healer] Verification failed on attempt ${attempts}:`, (ruleErr as Error).message);
          currentPrompt = `
            The previous JSONata rule you generated was invalid or returned no data.
            Error: ${(ruleErr as Error).message}
            Please fix the rule and return a valid one.
          `;
          if (attempts >= MAX_ATTEMPTS) throw ruleErr;
        }
      }
    } catch (err) {
      console.error(`[Healer] Discovery Loop Failure (Attempt ${attempts}):`, (err as Error).message);
      
      // Log failure to telemetry
      await db.insert(extractionRules)
        .values({
          id: uuidv4(),
          sourceName,
          jsonataPattern: "FAILED",
          failureReason: (err as Error).message,
          lastErrorLog: JSON.stringify(err),
          lastValidatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: extractionRules.sourceName,
          set: { 
            failureReason: (err as Error).message,
            lastErrorLog: JSON.stringify(err),
            lastValidatedAt: new Date()
          }
        });

      if (attempts >= MAX_ATTEMPTS) break;
    }
  }

  return [];
}

/**
 * @deprecated Use healBatchWithLLM for better resilience.
 */
export async function healPayloadWithLLM(db: any, rawJson: any, sourceName: string): Promise<OpportunityPayload | null> {
  const healed = await healBatchWithLLM(db, rawJson, sourceName);
  return healed.length > 0 ? healed[0] : null;
}
