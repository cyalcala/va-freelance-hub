import { db } from './client';
import { vitals } from './schema';
import { eq } from 'drizzle-orm';

/**
 * V12 GOVERNANCE: Trigger.dev Circuit Breaker
 * 
 * This utility manages the autonomous pause/resume logic for Trigger.dev tasks
 * based on credit exhaustion telemetry.
 */

export async function getTriggerStatus() {
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
