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
  model: "gemini-1.5-flash",
  generationConfig: {
    temperature: 0.1,
    responseMimeType: "application/json",
  }
});

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

  // 2. SLOW PATH: Gemini Discovery
  const { checkAndIncrementAiQuota } = await import("./job-utils.js");
  const canCallAi = await checkAndIncrementAiQuota(db);
  if (!canCallAi) return [];

  const prompt = `
    YOU ARE THE VA.INDEX SYSTEM ARCHITECT.
    The source "${sourceName}" has mutated its JSON structure.
    Your task:
    1. Identify the job listing array.
    2. Generate a JSONata expression that transforms the raw JSON into our target schema.
    3. Return a JSON object with:
       - "rule": "A robust JSONata string (e.g. 'data.jobs.{ \"title\": title, \"sourceUrl\": link }')"
       - "data": An array of the transformed objects for THIS specific payload.

    TARGET SCHEMA (Per Item):
    {
      "title": "string",
      "company": "string",
      "sourceUrl": "string (absolute URL)",
      "description": "string (extract key details)",
      "postedAt": "string (ISO date if found)",
      "locationType": "remote | hybrid | onsite",
      "payRange": "string"
    }

    RAW MUTATED JSON:
    ${JSON.stringify(rawJson).slice(0, 30000)}

    INSTRUCTIONS:
    - The JSONata rule must handle future payloads of the same structure.
    - If no jobs found, return { "rule": "", "data": [] }.
  `;

  try {
    const aiResult = await model.generateContent(prompt);
    const parsedAi = JSON.parse(aiResult.response.text());

    const { rule, data } = parsedAi;

    if (!Array.isArray(data)) return [];

    const validated = data
      .map(item => OpportunitySchema.safeParse({ ...item, sourcePlatform: sourceName }))
      .filter(p => p.success)
      .map(p => p.data);

    if (validated.length > 0 && rule) {
      // PERSIST THE RULE (Titanium Step)
      await db.insert(extractionRules)
        .values({
          id: uuidv4(),
          sourceName,
          jsonataPattern: rule,
          confidenceScore: 90,
          samplePayload: JSON.stringify(rawJson).slice(0, 5000),
          lastValidatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: extractionRules.sourceName,
          set: { 
            jsonataPattern: rule, 
            lastValidatedAt: new Date(),
            samplePayload: JSON.stringify(rawJson).slice(0, 5000)
          }
        });

      console.log(`[Healer] New Rule Discovered & Cached for ${sourceName}.`);
    }

    return validated;
  } catch (err) {
    console.error(`[Healer] Slow Path Discovery Failed for ${sourceName}:`, err);
    return [];
  }
}

/**
 * @deprecated Use healBatchWithLLM for better resilience.
 */
export async function healPayloadWithLLM(db: any, rawJson: any, sourceName: string): Promise<OpportunityPayload | null> {
  const healed = await healBatchWithLLM(db, rawJson, sourceName);
  return healed.length > 0 ? healed[0] : null;
}
