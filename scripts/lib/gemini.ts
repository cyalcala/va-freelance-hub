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
}

export async function askGemini(errorContext: string, codebaseContext: string): Promise<FixProtocol> {
  if (!API_KEY) {
    throw new Error("[Sentinel Bridge] CRITICAL: GEMINI_API_KEY is not set.");
  }

  const prompt = `
YOU ARE THE APEX SRE SENTINEL. YOUR MISSION IS TO MAINTAIN THE VA-FREELANCE-HUB AT $0 COST.
YOU HAVE A "TITANIUM" ARCHITECTURAL BIAS: STICK TO THE GUARDRAILS IN THE ARCHITECTURE.MD.

### CURRENT SYSTEM FAILURE:
${errorContext}

### CODEBASE CONTEXT:
${codebaseContext}

### YOUR INSTRUCTIONS:
1. ANALYZE THE ERROR AGAINST THE CODEBASE.
2. **REFLECT**: CROSS-EXAMINE THE PROPOSED FIX AGAINST ARCHITECTURE.MD. DOES IT VIOLATE SIMD PURITY, $0 COST, OR SSR PRINCIPLES?
3. **CONSERVATIVE BIAS**: IF TWO FIXES ARE POSSIBLE, YOU MUST CHOOSE THE ONE WITH THE FEWEST LINES OF CODE CHANGED.
4. PROVIDE A STRATEGIC, MINIMAL FIX THAT STAYS WITHIN THE FREE TIER.
5. IF YOU ARE UNSURE OR IF THE FIX REQUIRES $>5$ LINES OF COMPLEX LOGIC, CHOOSE "ALERT_HUMAN".
6. RESPOND ONLY WITH A VALID JSON OBJECT IN THIS FORMAT:
{
  "analysis": "Brief analysis of root cause",
  "confidence": 95,
  "action": "PATCH_CODE",
  "patches": [{ "path": "path/to/file.ts", "content": "Full new content" }],
  "explanation": "Why this fix works, how it respects Architecture.md, and confirmation of minimal line count."
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
