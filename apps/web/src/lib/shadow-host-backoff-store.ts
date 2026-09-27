import { sourceShadowHostBackoff } from "@va-hub/db";
import { eq, sql } from "drizzle-orm";
import type { ShadowHostBackoff } from "../../../../packages/scraper/shadow-host-backoff";

/** Primary-key reads and monotonic writes; a concurrent shorter hold cannot win. */
export function createShadowHostBackoffStore(db: any) {
  return {
    async get(host: string): Promise<ShadowHostBackoff | null> {
      const rows = await db.select().from(sourceShadowHostBackoff).where(eq(sourceShadowHostBackoff.host, host));
      return rows[0] ?? null;
    },
    async put(record: ShadowHostBackoff): Promise<void> {
      const result = await db.insert(sourceShadowHostBackoff).values(record).onConflictDoUpdate({
        target: sourceShadowHostBackoff.host,
        set: { sourceId: record.sourceId, limitedAt: record.limitedAt, nextEligibleAt: record.nextEligibleAt, reason: record.reason },
        setWhere: sql`${sourceShadowHostBackoff.nextEligibleAt} < ${record.nextEligibleAt}`,
      });
      if (!result.success) throw new Error("D1 rejected shadow host backoff persistence");
    },
  };
}
