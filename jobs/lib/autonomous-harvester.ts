import { z } from "zod";

/**
 * VA.INDEX Autonomous Harvester (The Schema Healer)
 * Uses Gemini 1.5 Flash to map mutated upstream JSON back to our strict schema.
 */

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-1.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

// The strict target schema for an Opportunity
export const OpportunitySchema = z.object({
  title: z.string(),
  company: z.string().optional(),
  type: z.string().optional().default('agency'),
  sourceUrl: z.string().url(),
  sourcePlatform: z.string().optional(),
  description: z.string().optional(),
  postedAt: z.string().optional(), // ISO string or similar
  locationType: z.string().optional().default('remote'),
  payRange: z.string().optional(),
});

export type OpportunityPayload = z.infer<typeof OpportunitySchema>;

export async function healPayloadWithLLM(rawJson: any, sourceName: string): Promise<OpportunityPayload | null> {
  if (!API_KEY) {
    console.error("[Healer] GEMINI_API_KEY not set. Falling back to null.");
    return null;
  }

  const prompt = `
YOU ARE THE VA.INDEX SCHEMA HEALER.
AN UPSTREAM API (${sourceName}) HAS MUTATED ITS JSON PAYLOAD. 
YOUR MISSION IS TO MAP THIS RAW JSON BACK TO OUR STRICT "OPPORTUNITY" SCHEMA.

### TARGET SCHEMA:
{
  "title": "Job Title (Required)",
  "company": "Company Name",
  "sourceUrl": "Direct URL to job post (Required, must be absolute)",
  "sourcePlatform": "${sourceName}",
  "description": "Full job description text",
  "postedAt": "ISO Date String if available",
  "locationType": "remote | hybrid | onsite",
  "payRange": "Salary info if available"
}

### RAW MUTATED JSON:
${JSON.stringify(rawJson, null, 2)}

### INSTRUCTIONS:
1. EXTRACT THE DATA ACCURATELY.
2. IF A FIELD IS MISSING, LEAVE IT NULL OR OMIT IT.
3. **DO NOT INVENT DATA**.
4. RESPOND ONLY WITH THE VALID JSON OBJECT. NO MARKDOWN.
`;

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API Error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const resultText = data.candidates[0].content.parts[0].text;
    const healed = JSON.parse(resultText);

    // Final Zod Validation
    return OpportunitySchema.parse(healed);
  } catch (err) {
    console.error(`[Healer] Failed to heal payload from ${sourceName}:`, err);
    return null;
  }
}
