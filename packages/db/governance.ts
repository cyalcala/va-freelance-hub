import { db } from './client';
import { vitals, opportunities } from './schema';
import { eq, sql, desc, and, gte } from 'drizzle-orm';

/**
 * V12 GOVERNANCE: Trigger.dev Circuit Breaker
 * 
 * This utility manages the autonomous pause/resume logic for Trigger.dev tasks
 * based on credit exhaustion telemetry.
 */

/**
 * Runner-aware credit check.
 * @param runnerId - Which engine is asking: 'trigger' | 'inngest' | 'gha' | 'cf-worker'
 *   Only 'trigger' (or omitted) respects the circuit breaker.
 *   All fallback engines bypass the credit gate.
 */
export async function getTriggerStatus(runnerId?: string) {
  // Fallback engines are NEVER blocked by the Trigger.dev circuit breaker
  const BYPASS_RUNNERS = ['inngest', 'gha', 'cf-worker'];
  if (runnerId && BYPASS_RUNNERS.includes(runnerId)) {
    console.log(`✅ [GOVERNANCE] Bypass granted for runner: ${runnerId}`);
    return { ok: true, bypassed: true };
  }

  try {
    const [record] = await db.select().from(vitals).limit(1);
    
    // If no vitals record exists, initialize it
    if (!record) {
      await db.insert(vitals).values({ id: 'GLOBAL', triggerCreditsOk: true });
      return { ok: true };
    }

    return { 
      ok: record.triggerCreditsOk ?? true,
      lastExhaustion: record.triggerLastExhaustion 
    };
  } catch (err) {
    console.error('🚫 [GOVERNANCE] Failed to fetch Trigger status:', err);
    return { ok: true }; // Fail-open to avoid blocking system
  }
}

export async function setTriggerExhausted(reason: string) {
  console.log(`🧨 [CIRCUIT BREAKER] Trigger.dev Exhaustion Detected: ${reason}`);
  try {
    await db.update(vitals)
      .set({ 
        triggerCreditsOk: false, 
        triggerLastExhaustion: new Date() 
      })
      .where(eq(vitals.id, 'GLOBAL'));
    
    console.log('🛑 [GOVERNANCE] Trigger.dev has been autonomously PAUSED.');
  } catch (err) {
    console.error('🚫 [GOVERNANCE] Failed to set exhaustion state:', err);
  }
}

export async function resetTriggerCredits() {
  console.log('🌅 [GOVERNANCE] Resetting Trigger.dev Credit Flag for new cycle...');
  try {
    await db.update(vitals)
      .set({ triggerCreditsOk: true })
      .where(eq(vitals.id, 'GLOBAL'));
    console.log('✅ [GOVERNANCE] Trigger.dev has been autonomously RESUMED.');
  } catch (err) {
    console.error('🚫 [GOVERNANCE] Failed to reset Trigger credits:', err);
  }
}

export async function emitProcessingHeartbeat(source: string, region: string = 'GLOBAL') {
  console.log(`🚥 [HEARTBEAT] Processing heartbeat: ${source} (${region})`);
  try {
    await db.insert(vitals).values({
      id: `HEARTBEAT_${region}`,
      region,
      lastProcessingHeartbeatMs: Date.now(),
      heartbeatSource: source,
      lockUpdatedAt: new Date(),
    }).onConflictDoUpdate({
      target: [vitals.id],
      set: {
        lastProcessingHeartbeatMs: Date.now(),
        heartbeatSource: source,
        lockUpdatedAt: new Date(),
      }
    });

    // Also update legacy GLOBAL pulse for backward compatibility
    await db.update(vitals)
      .set({ 
        lastProcessingHeartbeatMs: Date.now(), 
        heartbeatSource: source,
        lockUpdatedAt: new Date()
      })
      .where(eq(vitals.id, 'GLOBAL'));
  } catch (err) {
    console.error('🚫 [HEARTBEAT] Failed to emit processing heartbeat:', err);
  }
}

export async function emitIngestionHeartbeat(source: string, region: string = 'GLOBAL') {
  console.log(`🚥 [HEARTBEAT] Ingestion heartbeat: ${source} (${region})`);
  const now = Date.now();
  try {
    await db.insert(vitals).values({
      id: `HEARTBEAT_${region}`,
      region,
      lastIngestionHeartbeatMs: now,
      lastProcessingHeartbeatMs: now, // 🚥 Sync: Ingestion implies a processing cycle in V12
      heartbeatSource: source,
      lockUpdatedAt: new Date(),
    }).onConflictDoUpdate({
      target: [vitals.id],
      set: {
        region,
        lastIngestionHeartbeatMs: now,
        lastProcessingHeartbeatMs: now,
        heartbeatSource: source,
        lockUpdatedAt: new Date(),
      }
    });

    // Also update legacy GLOBAL pulse
    await db.update(vitals)
      .set({ 
        lastIngestionHeartbeatMs: now, 
        lastProcessingHeartbeatMs: now,
        heartbeatSource: source,
        lockUpdatedAt: new Date()
      })
      .where(eq(vitals.id, 'GLOBAL'));
  } catch (err) {
    console.error('🚫 [HEARTBEAT] Failed to emit ingestion heartbeat:', err);
  }
}

/**
 * 🛡️ THE ATOMIC SEAT: Sovereign Consensus
 * Uses a single atomic SQL update to ensure only one engine is in the cockpit.
 * @returns true if lease was ACQUIRED, false if already held.
 */
export async function acquireLease(engineId: string, region: string = 'GLOBAL', windowMinutes: number = 25) {
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  const cutoff = new Date(now - windowMs);

  try {
     // ATOMIC OPERATION: Update ONLY if last_harvest_at is old or NULL
     const result = await db.run(sql`
        UPDATE vitals 
        SET 
          last_harvest_at = ${now}, 
          last_harvest_engine = ${engineId},
          lock_status = 'BUSY',
          lock_updated_at = ${now}
        WHERE 
          id = ${`HEARTBEAT_${region}`} 
          AND (last_harvest_at < ${cutoff.getTime()} OR last_harvest_at IS NULL)
     `);

     // In LibSQL result.rowsAffected or similar indicates if the update happened
     // Since result format varies by driver, we check record count
     if (result.rowsAffected === 1) {
        console.log(`📡 [APEX] Lease ACQUIRED by '${engineId}' for ${region}.`);
        return true;
     }

     console.log(`🚥 [APEX] Lease DENIED for '${engineId}'. Seat currently held.`);
     return false;
  } catch (err) {
     console.error(`🚫 [APEX] Atomic lease failure:`, err);
     return false; 
  }
}

/**
 * 🛡️ FORCE RELEASE: Used by Sentinel to prune dead engines.
 */
export async function releaseLease(region: string = 'GLOBAL') {
  try {
    await db.update(vitals)
      .set({ 
        lockStatus: 'IDLE',
        lastHarvestAt: null,
        lastHarvestEngine: null 
      })
      .where(eq(vitals.id, `HEARTBEAT_${region}`));
    console.log(`🛰️ [APEX] Lease RELEASED for ${region}.`);
  } catch (err) {
    console.error(`🚫 [APEX] Lease release failure:`, err);
  }
}

/**
 * 🛡️ THE ETHICAL FLEET: Respect the Seat
 * (Legacy wrapper, now uses Atomic Seat)
 */
export async function shouldSkipDiscovery(engineId: string, region: string = 'GLOBAL') {
  const hasLease = await acquireLease(engineId, region);
  return !hasLease; // Skip if we failed to acquire lease
}

/**
 * 🛰️ Record a successful Fleet Discovery run.
 */
export async function recordHarvestSuccess(engineId: string, region: string = 'GLOBAL') {
  try {
    await db.update(vitals).set({ 
      lastHarvestAt: new Date(), 
      lastHarvestEngine: engineId 
    }).where(eq(vitals.id, `HEARTBEAT_${region}`));
    console.log(`🛰️ [FLEET] Leadership recorded: '${engineId}' successfully harvested ${region}.`);
  } catch (err) {
    console.error(`🚫 [FLEET] Failed to record harvest success for ${region}:`, err);
  }
}

/**
 * 🛰️ ADAPTIVE PULSE LOGIC (The Pulse)
 * Calculates the optimal harvesting frequency based on recent signal density.
 */
export async function getAdaptiveCadence(region: string = 'Philippines'): Promise<{ cadence: 'BURST' | 'NORMAL' | 'CALM', intervalMin: number }> {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Count high-value signals in the last 24h
    const [stats] = await db
      .select({ 
        count: sql<number>`count(*)` 
      })
      .from(opportunities)
      .where(and(
        eq(opportunities.region, region),
        gte(opportunities.createdAt, twentyFourHoursAgo),
        sql`${opportunities.tier} <= 1` // Platinum or Gold
      ));

    const density = stats?.count || 0;

    if (density < 10) {
      return { cadence: 'BURST', intervalMin: 10 }; // Drought: Hunt harder
    } else if (density > 50) {
      return { cadence: 'CALM', intervalMin: 30 }; // Overflow: Conserve credits
    } else {
      return { cadence: 'NORMAL', intervalMin: 15 }; // Balanced
    }
  } catch (err) {
    console.error('🚫 [PULSE] Failed to calculate adaptive cadence:', err);
    return { cadence: 'NORMAL', intervalMin: 15 };
  }
}
