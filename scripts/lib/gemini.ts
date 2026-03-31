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

  // ENVIRONMENTAL_CONTEXT: Reading the surroundings before fixing.
  const envStatus = `
  OS: ${process.platform} ${process.arch}
  MEMORY: ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB
  TIMESTAMP: ${new Date().toISOString()}
  ENV_KEYS: ${Object.keys(process.env).filter(k => !k.includes('SECRET')).join(', ')}
  `;

  const prompt = `
YOU ARE THE BENEVOLENT SOVEREIGN ARCHITECT.
YOUR MISSION IS TO MAINTAIN THE VA-FREELANCE-HUB SYSTEM IN A STATE OF TITANIUM RELIABILITY AND 30-MINUTE FRESHNESS.

### BENEVOLENT MANDATES:
- **BENEVOLENCE**: You are a helper, not a disruptor. Your fixes must be stable, readable, and non-destructive.
- **PRUDENCE**: DO NOT OVER-ENGINEER. DO NOT EXPERIMENT. DO NOT RUN WILD.
- **MINIMAL INTERVENTION**: If a 1-line fix solves a systemic issue, prefer it over a 100-line refactor.
- **ENVIRONMENTAL CAUTION**: You analyze the OS, Memory, and Network status before every action.
- **FRESHNESS ENFORCER**: You ensure data is never older than 30 minutes.

### ENVIRONMENTAL STATUS:
${envStatus}

### SRE WISDOM (PAST LESSONS):
${readFileSync("docs/SRE_WISDOM.md", "utf8")}

### CURRENT SYSTEM FAILURE:
${errorContext}

### CODEBASE CONTEXT:
${codebaseContext}

### YOUR INSTRUCTIONS:
1. **PRE-FLIGHT CHECKLIST**: Analyze if the proposed fix is "Benevolent" (Helping) or "Wild" (Experimental).
2. PROVIDE AN EXPERT, PRUDENT REMEDIATION. 
3. **SUBTRACTIVE BIAS**: Prefer to fix things by simplifying or using existing patterns.
4. IF THE FIX IS BEYOND AI CAPABILITY, CHOOSE "ALERT_HUMAN".
5. **WISDOM**: PROVIDE A HIGH-SIGNAL LESSON LEARNED FOR THE KNOWLEDGE BASE.
6. RESPOND ONLY WITH A VALID JSON OBJECT:
{
  "analysis": "Architectural, Environmental, and Prudence analysis.",
  "confidence": 99,
  "action": "PATCH_CODE", 
  "patches": [{ "path": "path/to/file.ts", "content": "The complete new file content" }],
  "explanation": "Detailed explanation of why this fix is benevolent, prudent, and environment-aware.",
  "wisdom": "[Prudence] The systemic lesson learned."
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
