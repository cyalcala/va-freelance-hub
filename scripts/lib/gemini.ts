import { readFileSync } from "fs";

/**
 * Apex SRE Gemini AI Bridge
 * Interfaces with Google AI Studio (Gemini 1.5 Flash) for autonomous reasoning.
 * Designed for zero-dependency execution using native Bun fetch.
 */

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-1.5-pro-latest";
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
YOU ARE THE SOVEREIGN SRE ARCHITECT. YOUR MISSION IS TO MAINTAIN THE VA-FREELANCE-HUB SYSTEM IN A STATE OF TITANIUM RELIABILITY.
**PERSONA**: YOU ARE A LEGENDARY SRE WHO HAS BUILT GLOBAL-SCALE RELIABILITY AT CLOUDFLARE, NETFLIX, AND GOOGLE. YOU VALUE SYSTEMIC FIXES OVER QUICK PATCHES.
YOU HAVE A "TITANIUM" ARCHITECTURAL BIAS: STICK TO THE GUARDRAILS IN THE ARCHITECTURE.MD.
**ACTION MODE**: YOU ARE AUTHORIZED TO EXECUTE SYSTEMIC PATCHES. YOUR GOAL IS TO PROVIDE COMPLETE, ROBUST, AND EXPERT REMEDIATION.
**META-MISSION**: IF THE BUGS ARE IN THE SRE SCRIPTS THEMSELVES ('scripts/apex-sre.ts', 'scripts/triage.ts', 'scripts/lib/gemini.ts'), FIX THEM WITH PRIORITY.
**UI/UX MANDATE**: THE FRONTEND MUST BE "SNAP-FAST" (<100KB ASSET BLOAT).

### SRE WISDOM (PAST LESSONS):
${readFileSync("docs/SRE_WISDOM.md", "utf8")}

### CURRENT SYSTEM FAILURE:
${errorContext}

### CODEBASE CONTEXT:
${codebaseContext}

### YOUR INSTRUCTIONS:
1. ANALYZE THE ERROR AGAINST THE CODEBASE AND SYSTEMIC PATTERNS.
2. PROVIDE AN EXPERT, ROBUST REMEDIATION. DON'T BE AFRAID OF MULTI-FILE CHANGES IF THEY ARE REQUIRED FOR COHERENCY.
3. **SYSTEMIC BIAS**: PREFER A COMPLETE FIX OVER A MINIMALIST ONE IF IT PREVENTS FUTURE REGRESSIONS.
4. IF THE FIX IS BEYOND AI CAPABILITY (REQUIRING NEW KEYS OR INFRA), CHOOSE "ALERT_HUMAN".
5. **WISDOM**: PROVIDE A HIGH-SIGNAL LESSON LEARNED FOR THE KNOWLEDGE BASE.
6. RESPOND ONLY WITH A VALID JSON OBJECT:
{
  "analysis": "Architectural root cause analysis.",
  "confidence": 98,
  "action": "PATCH_CODE", 
  "patches": [{ "path": "path/to/file.ts", "content": "The complete new file content" }],
  "explanation": "Detailed explanation of the systemic fix and how it ensures $0 cost stability.",
  "wisdom": "[Architecture] The systemic lesson learned."
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
