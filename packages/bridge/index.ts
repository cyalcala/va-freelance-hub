import { AIMesh } from "../ai/ai-mesh";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

export interface FixProtocol {
  analysis: string;
  confidence: number;
  action: "PATCH_CODE" | "REDEPLOY" | "RESTART_JOBS" | "ALERT_HUMAN";
  patches?: { path: string; content: string }[];
  explanation: string;
  wisdom?: string;
}

export class AgenticBridge {
  private static readonly WISDOM_PATH = "docs/SRE_WISDOM.md";
  private static readonly STRATEGY_PATH = "docs/MASTER_STRATEGY.md";

  /**
   * REASONING ENGINE (The Nexus)
   * Unifies SRE logic with the Multi-Model AI Mesh.
   */
  static async reason(errorContext: string, codebaseContext: string): Promise<FixProtocol> {
    console.log("🌉 [Bridge] Initiating Multi-Model Agentic Reasoning...");
    
    const wisdom = this.readWisdom();
    const strategy = this.readStrategy();

    const prompt = `
YOU ARE THE NEXUS BRIDGE.
YOUR MISSION: Maintain V12 Titanium Stability through strategic multi-model consensus.

### WISDOM & STRATEGY:
${wisdom}
${strategy}

### CONTEXT:
${errorContext}

### CODEBASE:
${codebaseContext}

### YOUR INSTRUCTIONS:
1. Provide an expert remediation protocol.
2. If this involves code changes, provide COMPLETE file contents in the patches array.
3. RETURN ONLY VALID JSON:
{
  "analysis": "...",
  "confidence": 0-100,
  "action": "PATCH_CODE" | "REDEPLOY" | "RESTART_JOBS" | "ALERT_HUMAN",
  "patches": [{ "path": "...", "content": "..." }],
  "explanation": "...",
  "wisdom": "A tactical lesson learned."
}
`;

    // 🛡️ Strategic Borrowing: Try Gemini Pro (The Architect) first, then fallback to OpenRouter (The Coder)
    const models = [
      { name: 'gemini-pro', provider: 'gemini' as const, modelId: 'gemini-1.5-pro' },
      { name: 'deepseek-coder', provider: 'openrouter' as const, modelId: 'deepseek/deepseek-coder' },
      { name: 'claude-sonnet', provider: 'openrouter' as const, modelId: 'anthropic/claude-3.5-sonnet' }
    ];

    for (const config of models) {
      try {
        console.log(`🌉 [Bridge] Consultation with ${config.name}...`);
        
        // REUSE AIMesh's underlying fetch logic (accessing private method via type casting if needed or by exporting it)
        // For simplicity in this implementation, we will use a dedicated call method or update AIMesh to expose it.
        const result = await (AIMesh as any).callModel(config, "You are a Site Reliability Engineer Agent.", prompt);
        const json = this.extractJson(result);
        
        if (json && json.confidence > 80) {
          console.log(`🌉 [Bridge] Consensus reached with ${config.name} (${json.confidence}% confidence).`);
          return json as FixProtocol;
        }
      } catch (err: any) {
        console.error(`🌉 [Bridge] ${config.name} failed consultation: ${err.message}`);
      }
    }

    throw new Error("🌉 [Bridge] CRITICAL: Consensus failed across all cognitive nodes.");
  }

  /**
   * HEURISTIC BACK-PROPAGATION
   * Learns from AI extraction to update static sifter rules.
   */
  static async learn(extractionResult: any, sourceContext: string) {
    if (extractionResult.relevanceScore > 90 && extractionResult.tier === 0) {
        console.log("🧠 [Bridge] High-signal lead detected. Propagating heuristics...");
        // This will eventually emit an Inngest event or update SRE_WISDOM
        this.appendWisdom(`[Heuristic] High-quality pattern found in ${extractionResult.company}: ${extractionResult.title}`);
    }
  }

  private static readWisdom(): string {
    try { return readFileSync(this.WISDOM_PATH, "utf8"); } catch { return ""; }
  }

  private static readStrategy(): string {
    try { return readFileSync(this.STRATEGY_PATH, "utf8"); } catch { return ""; }
  }

  private static appendWisdom(entry: string) {
    const date = new Date().toISOString().split('T')[0];
    const content = `\n- [${date}] ${entry}`;
    try {
        const current = readFileSync(this.WISDOM_PATH, "utf8");
        writeFileSync(this.WISDOM_PATH, current + content);
    } catch {}
  }

  private static extractJson(text: string): any {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return JSON.parse(text);
    } catch { return null; }
  }
}
