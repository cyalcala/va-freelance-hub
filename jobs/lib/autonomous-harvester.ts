import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * VA.INDEX Autonomous Harvester (The Schema Healer)
 * Uses Gemini 1.5 Flash to map mutated upstream JSON back to our strict schema.
 * Now handles both single records and entire batches (polymorphic).
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
 * Heals an entire batch of mutated data by identifying the list root and mapping items.
 */
export async function healBatchWithLLM(db: any, rawJson: any, sourceName: string): Promise<OpportunityPayload[]> {
  if (!process.env.GEMINI_API_KEY) {
    console.error("[Healer] GEMINI_API_KEY not set.");
    return [];
  }

  const { checkAndIncrementAiQuota } = await import("./job-utils.js");
  const canCallAi = await checkAndIncrementAiQuota(db);
  if (!canCallAi) return [];

  const prompt = `
    YOU ARE THE VA.INDEX SCHEMA HEALER.
    The upstream API "${sourceName}" has mutated its JSON structure.
    Your task:
    1. Identify the array containing job listings in the raw JSON below.
    2. Map EACH item in that array to our target schema.
    3. Return ONLY a JSON array of objects.

    TARGET SCHEMA (Per Item):
    {
      "title": "string",
      "company": "string",
      "sourceUrl": "string (absolute URL)",
      "sourcePlatform": "${sourceName}",
      "description": "string (extract key details from excerpt/body)",
      "postedAt": "string (ISO date if found)",
      "locationType": "remote | hybrid | onsite",
      "payRange": "string (salary range if found)"
    }

    RAW MUTATED JSON:
    ${JSON.stringify(rawJson).slice(0, 30000)}

    INSTRUCTIONS:
    - If you find multiple potential job arrays, choose the most relevant one.
    - If no jobs are found, return [].
    - Extract accurately. Do not invent data.
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    if (!Array.isArray(parsed)) {
      console.warn(`[Healer] Gemini returned non-array for ${sourceName}. Attempting to wrap.`);
      const single = OpportunitySchema.safeParse(parsed);
      return single.success ? [single.data] : [];
    }

    const validated = parsed
      .map(item => OpportunitySchema.safeParse(item))
      .filter(p => p.success)
      .map(p => p.data);

    console.log(`[Healer] Successfully healed ${validated.length} records from ${sourceName} mutation.`);
    return validated;
  } catch (err) {
    console.error(`[Healer] Batch healing failed for ${sourceName}:`, err);
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
