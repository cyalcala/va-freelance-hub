/**
 * D1-backed implementation of the robots cache.
 *
 * The gate itself (packages/scraper/robotsGate.ts) is storage-agnostic so it
 * can be tested without a database. This adapter is the only place that knows
 * about D1, and it is deliberately thin: serialization, and nothing else.
 *
 * Errors are not swallowed here. `checkRobots` already treats a store failure
 * as withheld consent rather than implied consent, which is the behavior we
 * want — swallowing a read failure at this layer would silently convert
 * "we could not check" into "no rules found".
 */

import { robotsCache } from "@va-hub/db";
import { eq } from "drizzle-orm";
import type { RobotsCacheEntry, RobotsCacheStore } from "@va-hub/scraper";
import type { ContentSignals } from "@va-hub/scraper";

type AppDb = any;

function parseSignals(raw: string | null): ContentSignals | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as ContentSignals : null;
  } catch {
    // A corrupted blob must not break the gate; the row's rules still apply.
    return null;
  }
}

export function createRobotsStore(db: AppDb): RobotsCacheStore {
  return {
    async get(origin: string): Promise<RobotsCacheEntry | null> {
      const rows = await db
        .select()
        .from(robotsCache)
        .where(eq(robotsCache.origin, origin))
        .limit(1);

      const row = rows?.[0];
      if (!row) return null;

      return {
        origin: row.origin,
        fetchedAt: row.fetchedAt,
        status: row.status,
        body: row.body ?? null,
        crawlDelay: row.crawlDelay ?? null,
        contentSignals: parseSignals(row.contentSignals ?? null),
        error: row.error ?? null,
      };
    },

    async put(entry: RobotsCacheEntry): Promise<void> {
      const values = {
        origin: entry.origin,
        fetchedAt: entry.fetchedAt,
        status: entry.status,
        body: entry.body,
        crawlDelay: entry.crawlDelay,
        contentSignals: entry.contentSignals ? JSON.stringify(entry.contentSignals) : null,
        error: entry.error,
      };

      await db.insert(robotsCache).values(values).onConflictDoUpdate({
        target: robotsCache.origin,
        set: {
          fetchedAt: values.fetchedAt,
          status: values.status,
          body: values.body,
          crawlDelay: values.crawlDelay,
          contentSignals: values.contentSignals,
          error: values.error,
        },
      });
    },
  };
}
