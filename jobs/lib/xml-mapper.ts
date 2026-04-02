import { XMLParser } from "fast-xml-parser";
import { type MacroSieveResult } from "../../scripts/lib/cerebras";

/**
 * VECTOR 1: RSS/XML EXPLOITATION (Agentic Mapping)
 * Mandate: Map dynamic XML namespaces to Turso/Drizzle schemas.
 */

const parser = new XMLParser({
  ignoreAttributes: false,
  processEntities: true,
});

export async function mapXmlWithCerebras(rawXml: string): Promise<MacroSieveResult | null> {
  const parsed = parser.parse(rawXml);
  
  // SRE REQUIREMENT: If Zod fails, we let Cerebras infer the mapping.
  // This handles job boards with custom namespaces (e.g., <dc:creator>, <job:location>).
  const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;
  if (!CEREBRAS_API_KEY) return null;

  // We sample the first few items to infer the schema.
  const sample = JSON.stringify(parsed).slice(0, 3000);

  const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${CEREBRAS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen-3-235b-a22b-instruct-2507",
      messages: [
        {
          role: "system",
          content: "You are the RSS Schema Mapper. Extract job data from this raw XML-to-JSON blob. Map fields to: { title, company, location, description, sourceUrl }. Return valid JSON."
        },
        { role: "user", content: `XML Sample: ${sample}` }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);

  return {
    pass_to_tier2: true,
    rejection_reason: null,
    extracted_payload: result
  };
}
