import { db } from './client';
import { vitals } from './schema';
import { eq } from 'drizzle-orm';

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
 * 🛡️ THE ETHICAL FLEET: Respect the Seat
 * Checks if another engine has performed a discovery run in the last X minutes.
 * Prevents DDoS-like behavior from overlapping GHA/CF/Trigger runs.
 */
export async function shouldSkipDiscovery(engineId: string, windowMinutes: number = 7) {
  try {
    // 🛡️ THE APEX SENTINEL: Triage Pulse
    // Before we even check the seat, let the Sentinel perform a surgical audit.
    const { sentinel } = await import('./sentinel');
    await sentinel.diagnoseAndRepair(engineId);

    const [record] = await db.select().from(vitals).where(eq(vitals.id, 'GLOBAL')).limit(1);
    if (!record || !record.lastHarvestAt) return false;

    const lastHarvestAt = new Date(record.lastHarvestAt).getTime();
    const diffMs = Date.now() - lastHarvestAt;
    const isWithinWindow = diffMs < (windowMinutes * 60 * 1000);

    if (isWithinWindow && record.lastHarvestEngine !== engineId) {
      console.log(`🚥 [FLEET] Respecting the Seat: Engine '${record.lastHarvestEngine}' harvested ${Math.floor(diffMs / 60000)}m ago. '${engineId}' is Backing Off.`);
      return true;
    }

    return false;
  } catch (err) {
    console.error('🚫 [FLEET] Failed to check harvest lockout:', err);
    return false; // Fail-open
  }
}

/**
 * 🛰️ Record a successful Fleet Discovery run.
 */
export async function recordHarvestSuccess(engineId: string) {
  try {
    await db.update(vitals).set({ 
      lastHarvestAt: new Date(), 
      lastHarvestEngine: engineId 
    }).where(eq(vitals.id, 'GLOBAL'));
    console.log(`🛰️ [FLEET] Leadership recorded: '${engineId}' successfully harvested.`);
  } catch (err) {
    console.error('🚫 [FLEET] Failed to record harvest success:', err);
  }
}
