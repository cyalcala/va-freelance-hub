import { db, schema } from './index';
import { vitals } from './schema';
import { eq, sql } from 'drizzle-orm';
import { config } from '@va-hub/config';

/**
 * 🛡️ APEX SRE SENTINEL (Project Aegis)
 * 
 * The autonomous governor for the V12 Sifter.
 * Designed for Perpetuity: Self-Healing, Self-Evolution, and Economic Survival.
 */
export class ApexSentinel {
  private static instance: ApexSentinel;
  
  public static getInstance(): ApexSentinel {
    if (!ApexSentinel.instance) {
      ApexSentinel.instance = new ApexSentinel();
    }
    return ApexSentinel.instance;
  }

  /**
   * 🛠️ MAIN AUDIT PULSE
   * Runs the sentinel's autonomous decision engine.
   */
  public async diagnoseAndRepair(context: string) {
    console.log(`🛡️ [SENTINEL] Triage pulse initiated from: ${context}`);
    
    try {
      // 1. Surgical Schema Evolution (The Medic)
      await this.ensureSchemaResilience();

      // 2. Deadlock Purge (The Heart)
      await this.purgeGhostLocks();

      // 3. Surgical Defrost (The SRE)
      await this.defrostAIProviders();

      // 4. Economic Guardrails (The Budget)
      await this.enforceEconomics();

      // 5. Chronos Reaping (The Scythe)
      await this.reapStaleOpportunities();
      
      // 6. Hard Pruning (The Insurance)
      await this.pruneLegacyData();

      // 7. Shadow Vault Synchronization (The Recovery)
      await this.synchronizeShadowVault();

    } catch (err: any) {
      console.error(`🚫 [SENTINEL] Triage failure: ${err.message}`);
    }
  }

  /**
   * ❄️ SURGICAL DEFROST
   * Automatically clears AI provider blocks if they have been silent for > 15 minutes.
   */
  private async defrostAIProviders() {
    console.log("❄️ [SENTINEL] Auditing AI Cooldowns for potential defrosting...");
    const DEFROST_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
    const now = Date.now();

    try {
      const { aiCooldowns } = await import('./schema');
      const { and, lte, eq } = await import('drizzle-orm');

      // Identify providers that have been blocked for more than 15 minutes
      const result = await db.delete(aiCooldowns)
        .where(
          lte(aiCooldowns.blockedAt, new Date(now - DEFROST_THRESHOLD_MS))
        );

      if (result.rowsAffected > 0) {
        console.log(`🔥 [SENTINEL] Defrosted ${result.rowsAffected} AI providers. Mesh diversity restored.`);
        await db.update(vitals).set({
            lastInterventionAt: new Date(),
            lastInterventionReason: `Surgical Defrost: Cleared ${result.rowsAffected} stale AI cooldowns.`
        }).where(eq(vitals.id, 'GLOBAL'));
      }
    } catch (err: any) {
      console.error(`❄️ [SENTINEL] Defrost failure: ${err.message}`);
    }
  }

  /**
   * 💀 THE PERPETUAL REAPER
   * Hard deletes signals > 60 days to enforce the 1GB Storage Mandate.
   */
  private async pruneLegacyData() {
    console.log("💀 [SENTINEL] Pruning legacy signals (>60 days)...");
    const SIXTY_DAYS_AGO = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const NINETY_DAYS_AGO = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const { opportunities } = await import('./schema');
    const { and, lte, or } = await import('drizzle-orm');

    try {
      // Rule 1: Delete all signals > 60d that are already inactive
      const prune60 = await db.delete(opportunities)
        .where(
          and(
            lte(opportunities.createdAt, SIXTY_DAYS_AGO),
            eq(opportunities.isActive, false)
          )
        );

      // Rule 2: Hard prune ALL signals > 90d (Insurance Policy)
      const prune90 = await db.delete(opportunities)
        .where(lte(opportunities.createdAt, NINETY_DAYS_AGO));

      const totalDeleted = (prune60.rowsAffected || 0) + (prune90.rowsAffected || 0);

      if (totalDeleted > 0) {
        console.log(`🔪 [SENTINEL] Storage Insurance: Removed ${totalDeleted} legacy signals.`);
        await db.update(vitals).set({
          totalPurged: sql`total_purged + ${totalDeleted}`,
          lastInterventionAt: new Date(),
          lastInterventionReason: `Storage Insurance: Pruned ${totalDeleted} legacy signals.`
        }).where(eq(vitals.id, 'GLOBAL'));
      }
    } catch (err: any) {
      console.error(`💀 [SENTINEL] Pruning failure: ${err.message}`);
    }
  }

  /**
   * 🧬 SURGICAL SCHEMA MEDIC
   * Prevents 500 errors by verifying and repairing table columns at runtime.
   */
  private async ensureSchemaResilience() {
    console.log("🧬 [SENTINEL] Verifying schema integrity...");
    
    const REQUIRED_COLUMNS = [
      { name: "last_intervention_at", type: "INTEGER" },
      { name: "last_intervention_reason", type: "TEXT" },
      { name: "sentinel_state", type: "TEXT" },
      { name: "last_harvest_at", type: "INTEGER" },
      { name: "last_harvest_engine", type: "TEXT" },
      { name: "total_purged", type: "INTEGER" },
      { name: "geo_kills", type: "INTEGER" },
      { name: "quality_score", type: "INTEGER" }
    ];

    try {
      // Query SQLite for current table structure
      const info: any = await db.run(sql`PRAGMA table_info(vitals)`);
      const existingColumns = info.rows ? info.rows.map((r: any) => r.name) : [];

      for (const col of REQUIRED_COLUMNS) {
        if (!existingColumns.includes(col.name)) {
          console.warn(`🧨 [SENTINEL] Drift detected! Missing column: ${col.name}. Repairing...`);
          await db.run(sql.raw(`ALTER TABLE vitals ADD COLUMN ${col.name} ${col.type} DEFAULT ${col.type === 'INTEGER' ? 0 : 'NULL'};`));
          
          await db.update(vitals).set({
            lastInterventionAt: new Date(),
            lastInterventionReason: `Surgical Repair: Added missing column '${col.name}'`
          }).where(eq(vitals.id, 'GLOBAL'));
        }
      }
    } catch (err: any) {
      console.error(`🧬 [SENTINEL] Schema evolution failure: ${err.message}`);
    }
  }

  /**
   * 🔪 CHRONOS REAPING
   * Forcefully archives jobs that haven't been seen in 48 hours.
   */
  private async reapStaleOpportunities() {
    console.log("🔪 [SENTINEL] Reaping stale opportunities (>48h)...");
    const FORTY_EIGHT_HOURS_AGO = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const { opportunities } = await import('./schema');
    const { and, lte } = await import('drizzle-orm');

    try {
      const result = await db.update(opportunities)
        .set({ isActive: false })
        .where(
          and(
            eq(opportunities.isActive, true),
            lte(opportunities.lastSeenAt, FORTY_EIGHT_HOURS_AGO)
          )
        );
      
      if (result.rowsAffected > 0) {
        console.log(`✅ [SENTINEL] Reaped ${result.rowsAffected} stale signals.`);
        await db.update(vitals).set({
            lastInterventionAt: new Date(),
            lastInterventionReason: `Chronos Recall: Deactivated ${result.rowsAffected} stale jobs.`
        }).where(eq(vitals.id, 'GLOBAL'));
      }
    } catch (err: any) {
      console.error(`🚫 [SENTINEL] Reap failure: ${err.message}`);
    }
  }

  /**
   * 🛰️ DEADLOCK PURGER
   * Forcefully releases the "Seat" if an engine has crashed.
   */
  private async purgeGhostLocks() {
    const GHOST_LOCK_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();

    try {
      const [record] = await db.select().from(vitals).where(eq(vitals.id, 'GLOBAL')).limit(1);
      if (!record || !record.lastHarvestAt) return;

      const lastHarvest = new Date(record.lastHarvestAt).getTime();
      const diff = now - lastHarvest;

      if (diff > GHOST_LOCK_THRESHOLD_MS) {
        console.warn(`👻 [SENTINEL] Ghost lock detected from engine '${record.lastHarvestEngine}' (${Math.floor(diff / 60000)}m ago). Purging...`);
        
        const { releaseLease } = await import('./governance');
        await releaseLease(record.id.replace('HEARTBEAT_', ''));

        await db.update(vitals).set({
          lastInterventionAt: new Date(),
          lastInterventionReason: `Ghost Lock Purge: Released seat from '${record.lastHarvestEngine}'`
        }).where(eq(vitals.id, record.id));
      }
    } catch (err: any) {
      console.error(`👻 [SENTINEL] Lock purge failure: ${err.message}`);
    }
  }

  /**
   * 📒 ECONOMIC GUARDRAILS
   * Autonomously throtlles AI usage based on remaining quota.
   */
  private async enforceEconomics() {
    try {
      const [record] = await db.select().from(vitals).where(eq(vitals.id, 'GLOBAL')).limit(1);
      if (!record) return;

      const aiQuota = record.aiQuotaCount || 0;
      
      // If AI credits are low, switch to TIGHT budget mode autonomously
      if (aiQuota < 50 && config.budget_mode !== 'tight') {
        console.warn(`💰 [SENTINEL] Critical budget detected (${aiQuota} reqs left). Enforcing TIGHT mode.`);
        
        await db.update(vitals).set({
            sentinelState: JSON.stringify({ ai_quota_override: 'tight', threshold: 50 }),
            lastInterventionAt: new Date(),
            lastInterventionReason: "Economic survival mode activated (AI Quota Low)"
        }).where(eq(vitals.id, 'GLOBAL'));
      }
    } catch (err: any) {
      console.error(`💰 [SENTINEL] Economic guardrail failure: ${err.message}`);
    }
  }

  /**
   * 🏮 SHADOW VAULT SYNCHRONIZATION
   * Recover processed leads that were "staged" in Supabase due to Turso downtime.
   */
  private async synchronizeShadowVault() {
    console.log("🏮 [SENTINEL] Checking Shadow Vault for staged signals...");
    
    try {
      const { supabase } = await import('./supabase');
      const { data: stagedJobs } = await supabase
        .from('raw_job_harvests')
        .select('*')
        .eq('status', 'PLATED_STAGED')
        .limit(25);

      if (!stagedJobs || stagedJobs.length === 0) return;

      console.log(`🏮 [SENTINEL] Found ${stagedJobs.length} shadow-plated signals. Attempting translocation...`);
      const { withRetry } = await import('./client');
      const { opportunities } = await import('./schema');

      let recovered = 0;
      for (const job of stagedJobs) {
        try {
          const mapped = job.mapped_payload;
          if (!mapped) continue;

          await withRetry(async () => {
            return await db.insert(opportunities).values({
              id: (await import("crypto")).randomUUID(),
              md5_hash: (await import('../../apps/frontend/src/lib/inngest/chef-logic')).generateMd5Hash(mapped.title, mapped.company || 'Generic'),
              title: mapped.title,
              company: mapped.company || 'Confidential',
              url: job.source_url,
              description: mapped.description,
              salary: mapped.salary || null,
              niche: mapped.niche,
              type: mapped.type || 'direct',
              locationType: mapped.locationType || 'remote',
              sourcePlatform: `V12 Sentinel Recovery (${job.source_platform})`,
              region: job.region || "Philippines",
              scrapedAt: new Date(job.created_at),
              isActive: true,
              tier: mapped.tier,
              relevanceScore: mapped.relevanceScore,
              latestActivityMs: Date.now(),
              metadata: JSON.stringify({ ...mapped.metadata, recovered_by: 'sentinel' }),
            }).onConflictDoUpdate({
              target: opportunities.md5_hash,
              set: {
                lastSeenAt: sql`CURRENT_TIMESTAMP`,
                latestActivityMs: Date.now()
              }
            });
          });

          // Atomic Purge
          await supabase.from('raw_job_harvests').delete().eq('id', job.id);
          recovered++;
        } catch (e: any) {
          console.error(`🏮 [SENTINEL] Recovery failed for ${job.id}: ${e.message}`);
        }
      }

      if (recovered > 0) {
        console.log(`✅ [SENTINEL] Successfully recovered ${recovered} signals from shadow vault.`);
      }
    } catch (err: any) {
      console.error(`🏮 [SENTINEL] Vault synchronization failure: ${err.message}`);
    }
  }
}

export const sentinel = ApexSentinel.getInstance();
