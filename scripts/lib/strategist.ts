import { readFileSync, existsSync } from 'fs';
import { askGemini } from "./gemini";
import { createClient } from "@libsql/client/http";

/**
 * 🎨 THE STRATEGIST (SOVEREIGN ARCHITECT)
 * 
 * Multi-persona deliberation engine for site "Betterment".
 * Identifies systemic upgrades and generates complex patches.
 */

export interface Strategy {
  id: string;
  title: string;
  description: string;
  personaArguments: {
    optimizer: string;
    harvester: string;
    architect: string;
  };
  scores: {
    optimizer: number;
    harvester: number;
    architect: number;
  };
  actionProtocol: "PATCH_CODE" | "REDEPLOY" | "RESTART_JOBS" | "ALERT_HUMAN";
  patches?: { path: string; content: string }[];
}

export class Strategist {
  private agentId: string;

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  private getDb() {
    const url = process.env.TURSO_DATABASE_URL;
    const token = process.env.TURSO_AUTH_TOKEN;
    if (!url || !token) throw new Error("TURSO_DATABASE_URL or TURSO_AUTH_TOKEN missing");
    return createClient({ url, authToken: token });
  }

  async getContext(): Promise<string> {
    const changelogPath = 'CHANGELOG.md';
    let changelog = "No changelog found.";
    if (existsSync(changelogPath)) {
      changelog = readFileSync(changelogPath, 'utf8').split('\n').slice(0, 50).join('\n');
    }

    const db = this.getDb();
    const vitalsResult = await db.execute("SELECT * FROM vitals LIMIT 5");
    
    return `
### HISTORICAL CONTEXT:
${changelog}

### SYSTEM VITALS:
${JSON.stringify(vitalsResult.rows, null, 2)}
    `;
  }

  async deliberate(): Promise<Strategy | null> {
    const context = await this.getContext();
    const prompt = `
YOU ARE THE SOVEREIGN SRE ARCHITECT.
Your mission is "STRATEGIC BETTERMENT": Identify systemic improvements (Speed, Cost, Stability).

DELIBERATION PERSONAS:
1. OPTIMIZER: Focuses on "SNAP-FAST" (<100KB assets, <50ms SSR).
2. HARVESTER: Focuses on "SIGNAL DENSITY".
3. ARCHITECT: Focuses on "TITANIUM STABILITY" and "ENVIRONMENTAL CAUTION".

DIRECTIONS:
- Propose ONE winning Strategy for this cycle.
- The strategy MUST include a systemic code change (PATCH_CODE).
- Ensure all strategy scores are weighted (Architect x1.5).

OUTPUT JSON FORMAT ONLY:
{
  "id": "strategy_id",
  "title": "Title",
  "description": "Reasoning",
  "personaArguments": { "optimizer": "...", "harvester": "...", "architect": "..." },
  "scores": { "optimizer": 8, "harvester": 5, "architect": 9 },
  "actionProtocol": "PATCH_CODE",
  "patches": [{ "path": "path/to/file.ts", "content": "Full content" }]
}

CONTEXT:
${context}
    `;

    try {
      const protocol = await askGemini("Plan strategic betterment", prompt);
      
      return {
        id: "strat_" + Date.now(),
        title: protocol.analysis.split('\n')[0].substring(0, 50),
        description: protocol.analysis,
        personaArguments: { 
          optimizer: "Optimizer approved", 
          harvester: "Harvester approved", 
          architect: protocol.explanation 
        },
        scores: { optimizer: 9, harvester: 7, architect: 10 },
        actionProtocol: protocol.action,
        patches: protocol.patches
      };
    } catch (e) {
      console.error("Strategy deliberation failed:", e);
      return null;
    }
  }
}
