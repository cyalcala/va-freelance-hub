import { AIMesh } from "../../packages/ai/ai-mesh";
import { BudgetShield } from "./budget-shield";

/**
 * 🕵️ AEON SEMANTIC SCOUT
 * 
 * Mandate: Prevent "Entropy Ratholes" by autonomously re-discovering 
 * target data (Titles, Companies, URLs) when HTML structures break.
 */

export interface ScoutTarget {
  name: string;
  description: string;
  exampleValue?: string;
}

export class SemanticScout {
  private shield: BudgetShield;

  constructor() {
    this.shield = new BudgetShield({ agentId: 'aeon_scout' });
  }

  /**
   * Re-discovers a CSS selector or Regex for a given target.
   */
  async reDiscoverSelector(html: string, targets: ScoutTarget[]): Promise<Record<string, string>> {
    console.log(`[AEON-SCOUT] Analyzing entropy shift for ${targets.length} targets...`);

    const samples = html.slice(0, 15000); // 15k chars for deep analysis
    
    const prompt = `
YOU ARE THE AEON SEMANTIC SCOUT.
The current scraper selectors are failing due to site structure "Entropy".
Your mission: Analyze the raw HTML and provide new, ROBUST CSS selectors or Regex patterns for the requested targets.

### TARGETS TO FIND:
${targets.map(t => `- ${t.name}: ${t.description} (Example: ${t.exampleValue || 'N/A'})`).join('\n')}

### OUTPUT RULES:
- Prefer CSS selectors if possible.
- Use Regex if the data is buried in scripts or attributes.
- Ensure selectors are "Future-Proof" (avoid overly specific auto-generated classes if better semantic ones exist).
- Respond ONLY with valid JSON mapping target name to selector/pattern.

### JSON STRUCTURE:
{
  "target_name": "selector_or_regex"
}
    `;

    try {
      if (!(await this.shield.checkAiQuota())) {
        throw new Error("AEON_SCOUT_BUDGET_EXHAUSTED");
      }

      const rawResult = await AIMesh.callModel(
        { name: 'aeon-scout', provider: 'gemini', modelId: 'gemini-1.5-flash' }, 
        prompt, 
        samples
      );

      const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
         const mapping = JSON.parse(jsonMatch[0]);
         await this.shield.incrementAiQuota();
         return mapping;
      }
      
      throw new Error("AEON_SCOUT_INVALID_RESPONSE");
    } catch (err) {
      console.error(`[AEON-SCOUT] Discovery failure:`, err);
      return {};
    }
  }
}
