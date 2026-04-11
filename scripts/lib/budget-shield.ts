import { createClient } from "@libsql/client/http";

/**
 * 🛡️ VA.INDEX BUDGET SHIELD
 * 
 * Enforces $0 cost constraints and prevents autonomous "runaway" behaviors.
 * Tracks AI quotas, execution stability, and repetitive failure loops.
 */

export interface BudgetConfig {
  agentId: string;
  dailyAiLimit?: number;
  maxSuccessiveFailures?: number;
}

export class BudgetShield {
  private agentId: string;
  private dailyLimit: number;
  private maxFailures: number;

  constructor(config: BudgetConfig) {
    this.agentId = config.agentId;
    this.dailyLimit = config.dailyAiLimit || 10;
    this.maxFailures = config.maxSuccessiveFailures || 3;
  }

  private getDb() {
    const url = process.env.TURSO_DATABASE_URL;
    const token = process.env.TURSO_AUTH_TOKEN;
    if (!url || !token) throw new Error("TURSO_DATABASE_URL or TURSO_AUTH_TOKEN missing");
    return createClient({ url, authToken: token });
  }

  /**
   * Check if the agent is within its daily AI budget.
   * Aligned with Global "Titanium Central" Quota.
   */
  async checkAiQuota(): Promise<boolean> {
    const db = this.getDb();
    const GLOBAL_ID = "titanium_central";
    const today = new Date().toISOString().split('T')[0];
    
    let result = await db.execute({
      sql: "SELECT ai_quota_count, ai_quota_date, lock_updated_at FROM vitals WHERE id = ?",
      args: [GLOBAL_ID]
    });

    if (result.rows.length === 0) {
      await db.execute({
        sql: "INSERT INTO vitals (id, ai_quota_count, ai_quota_date, successive_failure_count, lock_updated_at) VALUES (?, 1, ?, 0, ?)",
        args: [GLOBAL_ID, today, Date.now()]
      });
      return true;
    }
    
    const row = result.rows[0];
    if (row.ai_quota_date !== today) {
      await db.execute({
        sql: "UPDATE vitals SET ai_quota_count = 1, ai_quota_date = ?, lock_updated_at = ? WHERE id = ?",
        args: [today, Date.now(), GLOBAL_ID]
      });
      return true;
    }

    // RPM Throttle (4s)
    if (row.lock_updated_at) {
      const last = Number(row.lock_updated_at);
      const diff = Date.now() - last;
      if (diff < 4000) {
        const wait = 4000 - diff;
        console.log(`[budget-shield] Throttling for ${wait}ms...`);
        await new Promise(r => setTimeout(r, wait));
      }
    }

    // Daily Cap (Using the individual agent's limit check against global progress)
    if (Number(row.ai_quota_count) >= 1000) { // Global safety
      console.error(`🛑 GLOBAL BUDGET EXCEEDED: Reached 1,000 daily AI limit.`);
      return false;
    }
    
    // Also respect per-agent limit for conservative behavior if requested
    if (this.dailyLimit < 1000 && Number(row.ai_quota_count) >= this.dailyLimit) {
        console.warn(`⚠️ AGENT BUDGET REACHED: ${this.agentId} limited to ${this.dailyLimit} calls.`);
        return false;
    }

    return true;
  }

  async incrementAiQuota() {
    const db = this.getDb();
    const GLOBAL_ID = "titanium_central";
    await db.execute({
      sql: "UPDATE vitals SET ai_quota_count = ai_quota_count + 1, lock_updated_at = ? WHERE id = ?",
      args: [Date.now(), GLOBAL_ID]
    });
  }

  /**
   * Sanity check to prevent repetitive loops (Self-Correction Mechanism).
   */
  async validateStability(errorHash: string): Promise<boolean> {
    const db = this.getDb();
    const result = await db.execute({
      sql: "SELECT successive_failure_count, last_error_hash FROM vitals WHERE id = ?",
      args: [this.agentId]
    });

    if (result.rows.length === 0) return true;
    const row = result.rows[0];

    if (row.last_error_hash === errorHash) {
      const newCount = Number(row.successive_failure_count) + 1;
      await db.execute({
        sql: "UPDATE vitals SET successive_failure_count = ? WHERE id = ?",
        args: [newCount, this.agentId]
      });

      if (newCount >= this.maxFailures) {
        console.error(`🚨 LOOP DETECTED: Agent ${this.agentId} has failed with the same error ${newCount} times. ABORTING.`);
        return false;
      }
    } else {
      // Different error or first error, reset counter
      await db.execute({
        sql: "UPDATE vitals SET successive_failure_count = 1, last_error_hash = ? WHERE id = ?",
        args: [errorHash, this.agentId]
      });
    }
    return true;
  }

  async reportSuccess() {
    const db = this.getDb();
    await db.execute({
      sql: "UPDATE vitals SET successive_failure_count = 0, last_error_hash = NULL, last_recovery_at = ? WHERE id = ?",
      args: [Date.now(), this.agentId]
    });
  }
  async getPreferredProvider(): Promise<ModelConfig> {
    const db = this.getDb();
    const statuses = await db.execute("SELECT id, is_blocked, last_error FROM vitals WHERE id LIKE 'provider_%'");
    
    const providers: ModelConfig[] = [
      { name: 'flash-shield', provider: 'gemini', modelId: 'gemini-1.5-flash' },
      { name: 'macro-sieve-cerebras', provider: 'cerebras', modelId: 'qwen-3-235b-a22b-instruct-2507' },
      { name: 'groq-llama', provider: 'groq', modelId: 'llama-3.3-70b-versatile' }
    ];

    const blocked = new Set(statuses.rows.filter(r => r.is_blocked).map(r => r.id.replace('provider_', '')));
    
    for (const p of providers) {
      if (!blocked.has(p.provider)) return p;
    }

    // Default to Gemini (Primary Resilience)
    return providers[0];
  }

  async reportAICooldown(provider: string, error: string) {
    const db = this.getDb();
    const id = `provider_${provider.toLowerCase()}`;
    await db.execute({
      sql: "INSERT INTO vitals (id, is_blocked, last_error, lock_updated_at) VALUES (?, 1, ?, ?) ON CONFLICT(id) DO UPDATE SET is_blocked=1, last_error=?, lock_updated_at=?",
      args: [id, error, Date.now(), error, Date.now()]
    });
  }
}

export interface ModelConfig {
  name: string;
  provider: 'cerebras' | 'groq' | 'openrouter' | 'gemini';
  modelId: string;
}
