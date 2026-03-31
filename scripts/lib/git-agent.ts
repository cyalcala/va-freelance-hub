import { $ } from "bun";
import { existsSync } from "fs";
import { createClient } from "@libsql/client/http";

/**
 * 🤖 VA.INDEX UNIVERSAL GIT AGENT
 * 
 * Provides unified repository management, locking, and multi-agent 
 * conflict resolution for GitHub Actions and Trigger.dev.
 */

export interface GitAgentConfig {
  agentId: string;
  githubToken?: string;
  lockTimeoutMs?: number;
}

export class GitAgent {
  private agentId: string;
  private token: string;
  private lockTimeout: number;

  constructor(config: GitAgentConfig) {
    this.agentId = config.agentId;
    this.token = config.githubToken || process.env.GITHUB_PAT || process.env.GITHUB_TOKEN || "";
    this.lockTimeout = config.lockTimeoutMs || 5 * 60 * 1000; // Default 5 mins
    
    if (!this.token) {
      console.warn(`[GitAgent] WARNING: No GITHUB_PAT or GITHUB_TOKEN found for agent: ${this.agentId}. Push will likely fail.`);
    }
  }

  private getDb() {
    const url = process.env.TURSO_DATABASE_URL;
    const token = process.env.TURSO_AUTH_TOKEN;
    if (!url || !token) throw new Error("TURSO_DATABASE_URL or TURSO_AUTH_TOKEN missing");
    return createClient({ url, authToken: token });
  }

  /**
   * Acquire a global lock to prevent concurrent git operations.
   */
  async acquireLock(): Promise<boolean> {
    const db = this.getDb();
    const now = Date.now();
    const staleThreshold = now - this.lockTimeout;

    try {
      // 1. Try to update an existing IDLE or STALE lock
      const result = await db.execute({
        sql: `UPDATE vitals 
              SET lock_status = 'RUNNING', lock_updated_at = ? 
              WHERE id = 'global_git_lock' AND (lock_status = 'IDLE' OR lock_updated_at < ?)`,
        args: [now, staleThreshold]
      });

      if (result.rowsAffected === 0) {
        // 2. Check if the row exists at all
        const check = await db.execute({
          sql: "SELECT id, lock_status FROM vitals WHERE id = 'global_git_lock'"
        });

        if (check.rows.length === 0) {
          // Initialize the global lock row
          await db.execute({
            sql: "INSERT INTO vitals (id, lock_status, lock_updated_at) VALUES ('global_git_lock', 'RUNNING', ?)",
            args: [now]
          });
          return true;
        }
        return false;
      }
      return true;
    } catch (err: any) {
      console.error(`[GitAgent] Lock acquisition error: ${err.message}`);
      return false;
    }
  }

  /**
   * Release the global lock.
   */
  async releaseLock() {
    const db = this.getDb();
    await db.execute({
      sql: "UPDATE vitals SET lock_status = 'IDLE', lock_updated_at = ? WHERE id = 'global_git_lock'",
      args: [Date.now()]
    });
  }

  /**
   * Setup git configuration for the runner.
   */
  async setupGit() {
    console.log(`[GitAgent] Configuring git for agent: ${this.agentId}`);
    await $`git config user.name "${this.agentId}"`.quiet();
    await $`git config user.email "bot-${this.agentId}@va-hub.ai"`.quiet();
    
    if (this.token) {
      try {
        const repoUrlRaw = await $`git remote get-url origin`.text();
        const repoUrl = repoUrlRaw.trim();
        let authedUrl = repoUrl;
        
        if (repoUrl.startsWith('https://')) {
          authedUrl = repoUrl.replace('https://', `https://x-access-token:${this.token}@`);
        } else if (repoUrl.startsWith('git@github.com:')) {
          authedUrl = repoUrl.replace('git@github.com:', `https://x-access-token:${this.token}@github.com/`);
        }
        
        if (authedUrl !== repoUrl) {
          await $`git remote set-url origin ${authedUrl}`.quiet();
          console.log(`[GitAgent] ✅ Remote 'origin' authenticated with token.`);
        }
      } catch (e: any) {
        console.warn(`[GitAgent] ⚠️ Failed to update remote URL: ${e.message}`);
      }
    }
  }

  /**
   * Perform safe commit and push with protection gates.
   */
  async safePush(message: string): Promise<boolean> {
    try {
      // 1. Run Guardrail
      console.log("[GitAgent] Running Architectural Guardrail...");
      await $`bun run scripts/guardrail.ts`.quiet();

      // 2. Run Certification
      console.log("[GitAgent] Running System Certification...");
      const cert = await $`bun run scripts/triage.ts --certify`.quiet();
      if (cert.exitCode !== 0 || cert.stdout.toString().includes("FAILURE")) {
        console.error("[GitAgent] Push ABORTED: System certification failed.");
        return false;
      }

      // 3. Staging and Committing
      console.log("[GitAgent] Staging changes...");
      await $`git add .`.quiet();
      
      const status = await $`git status --porcelain`.text();
      if (!status.trim()) {
        console.log("[GitAgent] No changes to commit.");
        return true;
      }

      await $`git commit -m "${message}"`.quiet();

      // 4. Atomic Push with Rebase
      console.log("[GitAgent] Executing atomic push with rebase...");
      let retries = 3;
      while (retries > 0) {
        try {
          await $`git fetch origin main`.quiet();
          await $`git rebase origin/main`.quiet();
          await $`git push origin main`.quiet();
          console.log("[GitAgent] Push successful! ✅");
          return true;
        } catch (e: any) {
          console.warn(`[GitAgent] Push failed, retrying (${retries} left): ${e.message}`);
          retries--;
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      console.error("[GitAgent] Push failed after all retries.");
      return false;
    } catch (err: any) {
      console.error(`[GitAgent] Fatal error during push: ${err.message}`);
      return false;
    }
  }
}
