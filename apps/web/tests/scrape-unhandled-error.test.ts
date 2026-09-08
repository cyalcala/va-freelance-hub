import { describe, expect, mock, test } from "bun:test";
import { sourceOptOuts, sourceRegistry } from "@va-hub/db";
import { INGEST_DIAG_ID, summarizeRunDiagnostics } from "../src/lib/run-diagnostics";
import { createScrapeHandler } from "../src/pages/api/cron/scrape";

function requestContext() {
  return {
    request: new Request("https://remotejobs.ph/api/cron/scrape", {
      method: "POST",
      headers: { Authorization: "Bearer test-cron-secret" },
    }),
    locals: { runtime: { env: { CRON_SECRET: "test-cron-secret" } } },
  } as any;
}

/**
 * Governance reads succeed and the run lock is acquired; every later D1 read
 * throws, simulating a mid-run failure (the issue #123 shape: the lock goes
 * fresh while the heartbeat never advances).
 */
function crashingDb() {
  const diagWrites: Record<string, unknown>[] = [];
  let lockClaimed = false;
  const db = {
    select() {
      return {
        // NOTE: intentionally synchronous. An async stub would turn every
        // drizzle `.from(t).where(...).limit(...)` chain into an un-awaited
        // rejected promise (an unhandled rejection under the test runner)
        // instead of the synchronous throw the real client surfaces here.
        from(table: unknown) {
          if (table === sourceRegistry || table === sourceOptOuts) return [];
          throw new Error("simulated mid-run D1 failure");
        },
      };
    },
    insert() {
      return {
        values: (row: Record<string, unknown>) => {
          if (row?.sourceId === INGEST_DIAG_ID) {
            diagWrites.push(row);
            return { onConflictDoUpdate: async () => {} };
          }
          return { onConflictDoNothing: async () => {} };
        },
      };
    },
    update() {
      return {
        set: () => ({
          where: async () => {
            if (!lockClaimed) {
              lockClaimed = true;
              return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
          },
        }),
      };
    },
  };
  return { db, diagWrites };
}

describe("scrape catch-all heartbeat (issue #123)", () => {
  test("a mid-run throw still returns 500 and stamps the ingest heartbeat", async () => {
    const { db, diagWrites } = crashingDb();
    const previousFetch = globalThis.fetch;
    globalThis.fetch = mock(async () => {
      throw new Error("outbound requests are forbidden in this test");
    }) as unknown as typeof fetch;
    try {
      const response = await createScrapeHandler({ getDb: () => db as any })(requestContext());

      expect(response.status).toBe(500);
      expect(await response.json()).toMatchObject({ error: "Internal Server Error" });
      expect(diagWrites).toHaveLength(1);
      // The exact message depends on which post-lock stage throws; the
      // invariant is that a crashing run stamps a degraded heartbeat.
      expect(diagWrites[0]).toMatchObject({
        sourceId: INGEST_DIAG_ID,
        lastError: expect.stringContaining("unhandledError="),
      });
      expect(typeof diagWrites[0].lastAttemptAt).toBe("string");
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  test("unhandledError sanitizes to a single bounded signal", () => {
    const summary = summarizeRunDiagnostics({ unhandledError: "boom\n  line\twith\ttabs" });
    expect(summary.degraded).toBe(true);
    expect(summary.signalCount).toBe(1);
    expect(summary.summary).toBe("unhandledError=boom line with tabs");
    expect(summarizeRunDiagnostics({}).degraded).toBe(false);
  });
});
