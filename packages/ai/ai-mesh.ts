import { AIExtractionSchema, type AIExtraction } from '../db/validation';

/**
 * V12 SIFTER: Intelligent AI Mesh
 * 
 * Features:
 * 1. Fast-Triage (Cerebras/Groq) to drop trash quickly.
 * 2. Intelligent Rotation (OpenRouter Free Models) to bypass rate limits.
 * 3. Deep-Thinking Fallback (Gemini) for complex payloads.
 */

const SYSTEM_PROMPT = `
YOU ARE THE V12 INTELLIGENCE ENGINE (THE AGENTIC SIFTER).
Your mission is to EXTRACT structured data and SIFT for quality in a single pass.

### EXTRACTION RULES:
- Niche MUST be one of the pre-defined categories.
- Triage PH-compatibility and compensation signals.

### JSON OUTPUT FORMAT:
(YOU MUST RETURN ONLY VALID JSON)
{
  "title": string,
  "company": string,
  "salary": string | null,
  "description": string,
  "niche": "TECH_ENGINEERING" | "MARKETING" | "SALES_GROWTH" | "VA_SUPPORT" | "ADMIN_BACKOFFICE" | "CREATIVE_MULTIMEDIA" | "BPO_SERVICES",
  "type": "agency" | "direct",
  "locationType": "remote" | "hybrid" | "onsite",
  "tier": 0 | 1 | 2 | 3 | 4,
  "isPhCompatible": boolean,
  "relevanceScore": number (0-100)
}
`

const TRIAGE_PROMPT = `
Identify if this job is Remote and PH-friendly (Worldwide/APAC). 
Also check if it's high-value (not low-ball $3/hr).
Answer ONLY with: PASSED or REJECTED.
`;

/**
 * V12 REINFORCED: OpenRouter-First Rotation Pool
 * Includes 20+ diverse free models to bypass RPD/RPM limits.
 */
const OPENROUTER_FREE_MODELS = [
  // Keep this list intentionally short and vetted to reduce timeout churn.
  'openrouter/free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
];

interface ModelConfig {
  name: string;
  provider: 'cerebras' | 'groq' | 'openrouter' | 'gemini';
  modelId: string;
}

const PROVIDER_DB_NAME: Record<ModelConfig['provider'], string> = {
  cerebras: 'Cerebras',
  groq: 'Groq',
  openrouter: 'OpenRouter',
  gemini: 'Gemini',
};

export class AIMesh {
  private static readonly REQUEST_TIMEOUT_MS = 20000;
  private static extractJson(text: string): any {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }

  /**
   * PHASE 1: Fast Triage
   * Uses the fastest free models to drop garbage jobs before heavy processing.
   */
  static async triage(html: string): Promise<'PASSED' | 'REJECTED'> {
    const models: ModelConfig[] = [
      { name: 'cerebras-llama', provider: 'cerebras', modelId: 'llama3.1-8b' },
      { name: 'groq-llama', provider: 'groq', modelId: 'llama-3.1-70b-versatile' }
    ];

    for (const config of models) {
      try {
        const result = await this.callModel(config, TRIAGE_PROMPT, html.slice(0, 3000));
        if (result?.toUpperCase().includes('PASSED')) return 'PASSED';
        if (result?.toUpperCase().includes('REJECTED')) return 'REJECTED';
      } catch (err) {
        console.warn(`[AI-MESH] Triage model ${config.name} failed. Trying next...`);
      }
    }

    return 'PASSED'; // Default to pass if triage fails to be safe
  }

  /**
   * PHASE 2: Structured Extraction
   * Rotates through OpenRouter free models and Gemini, skipping blocked providers.
   */
  static async extract(html: string): Promise<AIExtraction> {
    // 1. Get Global Cooldown Status
    const { getAIStatus, reportAICooldown } = await import('../db/supabase');
    const statuses = await getAIStatus();
    const blockedProviders = new Set(
      statuses
        .filter(s => s.is_blocked)
        .map(s => String(s.provider_name || '').trim().toLowerCase())
    );

    // 2. Prepare Balanced Queue (OpenRouter-First Strategy)
    const rotatedORModels = [...OPENROUTER_FREE_MODELS]
      .sort(() => Math.random() - 0.5) // Random rotation for load balancing
      .map(m => ({ name: `or-${m}`, provider: 'openrouter' as const, modelId: m }));

    const candidates: ModelConfig[] = [
      ...rotatedORModels, // The Primary Workhorses (80%)
      { name: 'groq-llama', provider: 'groq', modelId: 'llama-3.3-70b-versatile' }, // Moderate Chef (15%)
      { name: 'cerebras-llama', provider: 'cerebras', modelId: 'llama3.1-8b' }, // Recovery Expert
      { name: 'gemini-flash', provider: 'gemini', modelId: 'gemini-1.5-flash' } // The Wall
    ];

    const extractionQueue = candidates.filter((config: ModelConfig) => {
      const providerName = PROVIDER_DB_NAME[config.provider].toLowerCase();
      return !blockedProviders.has(providerName);
    });

    if (extractionQueue.length === 0) {
      throw new Error('[AI-MESH] CRITICAL: All $0-cost providers are currently in Cooldown.');
    }

    for (const config of extractionQueue) {
      try {
        console.log(`[AI-MESH] Attempting extraction with ${config.name}...`);
        const rawResult = await this.callModel(config, SYSTEM_PROMPT, html.slice(0, 10000));
        const json = this.extractJson(rawResult);
        const validated = AIExtractionSchema.safeParse(json);

        if (validated.success) {
          return { ...validated.data, metadata: { model: config.name } };
        } else {
          console.error(`[AI-MESH] Validation failed for ${config.name}:`, validated.error?.format());
          console.log(`[AI-MESH] Raw JSON from ${config.name}:`, JSON.stringify(json, null, 2));
        }
      } catch (err: any) {
        const errorMsg = err.message || JSON.stringify(err);
        console.error(`[AI-MESH] Model ${config.name} CRASHED:`, errorMsg);
        
        // Report Cooldown globally
        const providerName = PROVIDER_DB_NAME[config.provider];
        await reportAICooldown(providerName, errorMsg);
      }
    }

    throw new Error('[AI-MESH] CRITICAL: All available models failed extraction.');
  }

  private static async callModel(config: ModelConfig, system: string, user: string): Promise<string> {
    switch (config.provider) {
      case 'cerebras':
        return this.fetchCerebras(config.modelId, system, user);
      case 'groq':
        return this.fetchGroq(config.modelId, system, user);
      case 'openrouter':
        return this.fetchOpenRouter(config.modelId, system, user);
      case 'gemini':
        return this.fetchGemini(config.modelId, system, user);
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }

  private static async fetchCerebras(model: string, system: string, user: string) {
    const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
      headers: { 'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: 0,
      })
    });
    const data: any = await res.json();
    if (!res.ok) throw new Error(`Cerebras API Error: ${data.error?.message || JSON.stringify(data)}`);
    return data.choices[0].message.content;
  }

  private static async fetchGroq(model: string, system: string, user: string) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: 0,
      })
    });
    const data: any = await res.json();
    if (!res.ok) throw new Error(`Groq API Error: ${data.error?.message || JSON.stringify(data)}`);
    return data.choices[0].message.content;
  }

  private static async fetchOpenRouter(model: string, system: string, user: string) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
      headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: 0,
      })
    });
    const data: any = await res.json();
    if (!res.ok) throw new Error(`OpenRouter API Error: ${data.error?.message || JSON.stringify(data)}`);
    return data.choices[0].message.content;
  }

  private static async fetchGemini(model: string, system: string, user: string) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${system}\n\nCONTENT:\n${user}` }] }],
        generationConfig: { 
          temperature: 0, 
          responseMimeType: 'application/json' 
        }
      })
    });
    const data: any = await res.json();
    if (!res.ok) throw new Error(`Gemini API Error: ${data.error?.message || JSON.stringify(data)}`);
    return data.candidates[0].content.parts[0].text;
  }
}
