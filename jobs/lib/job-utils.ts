import { eq } from "drizzle-orm";
import { vitals } from "@va-hub/db/schema";

/**
 * Titanium Quota Guard
 * Enforces a global hard-cap on Gemini API usage to ensure zero-cost operation.
 * Target: 1,000 requests per 24-hour window (Buffer below 1,500 RPD).
 * Enforces 15 RPM via a mandatory 4-second throttle.
 */
export async function checkAndIncrementAiQuota(db: any): Promise<boolean> {
  const HARD_CAP = 1000;
  const GLOBAL_ID = "titanium_central";
  const today = new Date().toISOString().split('T')[0];

  try {
    // 1. Ensure the global vitals record exists
    const stats = await db.select().from(vitals).where(eq(vitals.id, GLOBAL_ID)).limit(1);
    const vital = stats[0];

    // 2. Handle Reset or Initial Creation
    if (!vital || vital.aiQuotaDate !== today) {
      const initialValues = {
        id: GLOBAL_ID,
        aiQuotaCount: 1,
        aiQuotaDate: today,
        lockStatus: "IDLE",
        lockUpdatedAt: new Date(),
      };

      if (!vital) {
        await db.insert(vitals).values(initialValues);
      } else {
        await db.update(vitals)
          .set({ aiQuotaCount: 1, aiQuotaDate: today, lockUpdatedAt: new Date() })
          .where(eq(vitals.id, GLOBAL_ID));
      }
      return true;
    }

    // 3. Enforce RPM Throttling (15 RPM = ~4s per request)
    const now = new Date();
    if (vital.lockUpdatedAt) {
      const msSinceLast = now.getTime() - new Date(vital.lockUpdatedAt).getTime();
      const THROTTLE_MS = 4000; // 4 seconds buffer
      if (msSinceLast < THROTTLE_MS) {
        const waitMs = THROTTLE_MS - msSinceLast;
        console.log(`[quota-guard] RPM Limit near (${now.toISOString()}). Throttling for ${waitMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
    }

    // 4. Enforce Hard Cap (RPD)
    if (vital.aiQuotaCount >= HARD_CAP) {
      console.warn(`[quota-guard] Global Hard cap reached (${HARD_CAP} RPD). Blocking Gemini call.`);
      return false;
    }

    // 5. Increment and Update Vital timestamp
    await db.update(vitals)
      .set({ 
        aiQuotaCount: (vital.aiQuotaCount || 0) + 1,
        lockUpdatedAt: new Date()
      })
      .where(eq(vitals.id, GLOBAL_ID));

    return true;
  } catch (err) {
    console.error("[quota-guard] Critical failure in quota check. Blocking by default.", err);
    return false;
  }
}
