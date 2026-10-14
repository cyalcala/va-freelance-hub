import { expect, test } from "bun:test";
import { runLockOutcome } from "../src/lib/run-lock";

const LOCK_ID = "__scrape_run_lock__";
const OBSERVED_AT = "2026-10-12T05:00:00.000Z";
const outcome = (result: unknown) => runLockOutcome(result, LOCK_ID, OBSERVED_AT);

test("distinguishes an exact returned owner from an unchanged conditional lock", () => {
  expect(outcome([{ sourceId: LOCK_ID, lastAttemptAt: OBSERVED_AT }])).toBe("acquired");
  expect(outcome([])).toBe("held");
});

test("mutation metadata cannot substitute for a returned owner acknowledgement", () => {
  for (const result of [{ meta: { changes: 1 } }, { rowsAffected: 1 }, { meta: { changes: 0 } },
    { rowsAffected: 0 }, { meta: {} }, null, undefined]) expect(outcome(result)).toBe("unavailable");
});

test("malformed, mismatched and ambiguous returned owners fail closed", () => {
  for (const result of [[null], [{}], [{ sourceId: LOCK_ID }], [{ lastAttemptAt: OBSERVED_AT }],
    [{ sourceId: "other", lastAttemptAt: OBSERVED_AT }], [{ sourceId: LOCK_ID, lastAttemptAt: "1970-01-01T00:00:00.000Z" }],
    [{ sourceId: LOCK_ID, lastAttemptAt: OBSERVED_AT }, { sourceId: LOCK_ID, lastAttemptAt: OBSERVED_AT }], new Array(1)]) {
    expect(outcome(result)).toBe("unavailable");
  }
});

test("absent expected owner context never acknowledges a claim", () => {
  const owner = [{ sourceId: LOCK_ID, lastAttemptAt: OBSERVED_AT }];
  expect(runLockOutcome(owner, "", OBSERVED_AT)).toBe("unavailable");
  expect(runLockOutcome(owner, LOCK_ID, "")).toBe("unavailable");
  expect(runLockOutcome(owner, undefined as unknown as string, OBSERVED_AT)).toBe("unavailable");
});

test("accessors and throwing proxies cannot manufacture an acknowledged owner", () => {
  let accesses = 0;
  const row = { get sourceId() { accesses++; return LOCK_ID; }, lastAttemptAt: OBSERVED_AT };
  expect(outcome([row])).toBe("unavailable");
  expect(accesses).toBe(0);
  const entries = Object.defineProperty(new Array(1), "0", { get() { accesses++; return row; } });
  expect(outcome(entries)).toBe("unavailable");
  expect(accesses).toBe(0);
  expect(outcome(new Proxy([], { get() { throw new Error("unreadable acknowledgement"); } }))).toBe("unavailable");
});

test("releaseRunLock issues fenced update to reset lastAttemptAt to epoch", async () => {
  const { releaseRunLock } = await import("../src/pages/api/cron/scrape");
  let capturedSet: any = null;
  const mockDb = {
    update: () => ({
      set: (values: any) => {
        capturedSet = values;
        return {
          where: async () => ({ meta: { changes: 1 } }),
        };
      },
    }),
  } as any;

  await releaseRunLock(mockDb, "2026-09-19T08:00:00.000Z");
  expect(capturedSet).not.toBeNull();
  expect(capturedSet.lastAttemptAt).toBe("1970-01-01T00:00:00.000Z");
  expect(typeof capturedSet.updatedAt).toBe("string");
});

test("releaseRunLock handles database failure without throwing", async () => {
  const { releaseRunLock } = await import("../src/pages/api/cron/scrape");
  const throwingDb = {
    update: () => {
      throw new Error("D1 connection lost");
    },
  } as any;

  // Must not throw
  await expect(releaseRunLock(throwingDb, "2026-09-19T08:00:00.000Z")).resolves.toBeUndefined();
});
