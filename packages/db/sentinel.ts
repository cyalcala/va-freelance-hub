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

      // 3. Economic Guardrails (The Budget)
      await this.enforceEconomics();

    } catch (err: any) {
      console.error(`🚫 [SENTINEL] Triage failure: ${err.message}`);
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
      { name: "last_harvest_engine", type: "TEXT" }
    ];

    try {
      // Query SQLite for current table structure
      const info: any = await db.run(sql`PRAGMA table_info(vitals)`);
      const existingColumns = info.rows ? info.rows.map((r: any) => r.name) : [];

      for (const col of REQUIRED_COLUMNS) {
        if (!existingColumns.includes(col.name)) {
          console.warn(`🧨 [SENTINEL] Drift detected! Missing column: ${col.name}. Repairing...`);
          await db.run(sql.raw(`ALTER TABLE vitals ADD COLUMN ${col.name} ${col.type};`));
          
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
        
        await db.update(vitals).set({
          lastHarvestAt: null, // Release the seat
          lastHarvestEngine: null,
          lastInterventionAt: new Date(),
          lastInterventionReason: `Ghost Lock Purge: Released seat from '${record.lastHarvestEngine}'`
        }).where(eq(vitals.id, 'GLOBAL'));
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
}

export const sentinel = ApexSentinel.getInstance();
