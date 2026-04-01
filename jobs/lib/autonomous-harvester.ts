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
    YOU ARE THE VA.INDEX SIGNAL EXTRACTION ARCHITECT.
    Your mission is to generate robust JSONata transformation rules that map mutated source JSON into our strict schema.
    
    CRITICAL CONSTRAINTS:
    - Return ONLY valid JSON containing a "rule" (string) and "data" (array of initial results).
    - The JSONata rule must handle future payloads of the same structure.
    - Ensure sourceUrl is always an absolute URL.
    - If fields are missing, provide sensible defaults based on the context.
    - Respond in application/json format.
  `,
  generationConfig: {
    temperature: 0.1,
    responseMimeType: "application/json",
  }
});

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

  // 2. SLOW PATH: Gemini Discovery with Self-Correction
  const { checkAndIncrementAiQuota } = await import("./job-utils.js");
  const canCallAi = await checkAndIncrementAiQuota(db);
  if (!canCallAi) return [];

  const minified = minifyPayload(rawJson);
  let currentPrompt = `
    Source "${sourceName}" has mutated. 
    Analyze this minified payload and generate a JSONata rule for extraction.
    
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
