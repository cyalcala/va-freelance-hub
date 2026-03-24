import { readFileSync } from "fs";

/**
 * Apex SRE Gemini AI Bridge
 * Interfaces with Google AI Studio (Gemini 1.5 Flash) for autonomous reasoning.
 * Designed for zero-dependency execution using native Bun fetch.
 */

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-flash-latest";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

export interface FixProtocol {
  analysis: string;
  confidence: number; // 0-100
  action: "PATCH_CODE" | "REDEPLOY" | "RESTART_JOBS" | "ALERT_HUMAN";
  patches?: { path: string; content: string }[];
  explanation: string;
  wisdom?: string; // NEW: Lesson learned to be stored in SRE_WISDOM.md
}

export async function askGemini(errorContext: string, codebaseContext: string): Promise<FixProtocol> {
  if (!API_KEY) {
    throw new Error("[Sentinel Bridge] CRITICAL: GEMINI_API_KEY is not set.");
  }

  const prompt = `
YOU ARE THE APEX SRE SENTINEL. YOUR MISSION IS TO MAINTAIN THE VA-FREELANCE-HUB AT $0 COST.
YOU HAVE A "TITANIUM" ARCHITECTURAL BIAS: STICK TO THE GUARDRAILS IN THE ARCHITECTURE.MD.
YOUR DOMAIN EXPERTISE INCLUDES: HONO (EDGE-FAST ROUTING), HTMX (LOW-JS INTERACTIVITY), AND PREACT/JSX (LIGHTWEIGHT UI).
**META-MISSION**: YOU ARE AUTHORIZED TO SELF-EVOLVE. IF YOU IDENTIFY BUGS OR INEFFICIENCIES IN THE SRE SCRIPTS ('scripts/apex-sre.ts', 'scripts/triage.ts', 'scripts/lib/gemini.ts'), YOU MUST REWRITE THEM TO BE MORE EFFECTIVE AND WISE.
**UI/UX MANDATE**: YOU MUST ENSURE THE FRONTEND IS "SNAP-FAST." THIS MEANS 0PX LAYOUT SHIFTS AND MINIMAL ASSET BLOAT (<50KB).

### SRE WISDOM (PAST LESSONS):
${readFileSync("docs/SRE_WISDOM.md", "utf8")}

### CURRENT SYSTEM FAILURE:
${errorContext}

### CODEBASE CONTEXT:
${codebaseContext}

### YOUR INSTRUCTIONS:
1. ANALYZE THE ERROR AGAINST THE CODEBASE AND PAST WISDOM.
2. **META-REASONING**: IF THE SRE AGENT FAILED TO CATCH THIS DETERMINISTICALLY, UPDATE 'scripts/triage.ts' TO IMPROVE DETECTION FOR THE NEXT CYCLE.
3. **REFLECT**: CROSS-EXAMINE THE PROPOSED FIX AGAINST ARCHITECTURE.MD. DOES IT VIOLATE SIMD PURITY, $0 COST, OR SSR PRINCIPLES?
4. **CONSERVATIVE BIAS**: IF TWO FIXES ARE POSSIBLE, YOU MUST CHOOSE THE ONE WITH THE FEWEST LINES OF CODE CHANGED.
5. PROVIDE A STRATEGIC, MINIMAL FIX THAT STAYS WITHIN THE FREE TIER.
6. IF YOU ARE UNSURE OR IF THE FIX REQUIRES $>5$ LINES OF COMPLEX LOGIC, CHOOSE "ALERT_HUMAN".
7. **LEARNING**: IN THE "wisdom" FIELD, PROVIDE A ONE-SENTENCE LESSON LEARNED FROM THIS FIX FOR FUTURE REFERENCE.
8. RESPOND ONLY WITH A VALID JSON OBJECT IN THIS FORMAT:
{
  "analysis": "Brief analysis of root cause and meta-reasoning on why SRE missed it.",
  "confidence": 95,
  "action": "PATCH_CODE",
  "patches": [{ "path": "path/to/file.ts", "content": "Full new content" }],
  "explanation": "Why this fix works, how it respects Architecture.md, and confirmation of minimal line count.",
  "wisdom": "Bullet point lesson: [Category] Action taken and why."
}
`;

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1, // Conservative output for SRE
      }
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`[Gemini Bridge] API Error: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  try {
    let resultText = data.candidates[0].content.parts[0].text;
    
    // Manual JSON Extraction (v1 fallback)
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      resultText = jsonMatch[0];
    }

    return JSON.parse(resultText) as FixProtocol;
  } catch (e) {
    throw new Error("[Gemini Bridge] Failed to parse AI response into FixProtocol JSON. Content: " + data?.candidates?.[0]?.content?.parts?.[0]?.text);
  }
}
