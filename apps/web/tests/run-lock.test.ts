import { expect, test } from "bun:test";
import { runLockOutcome } from "../src/lib/run-lock";

test("distinguishes an acquired D1 lock from a lock held by another run", () => {
  expect(runLockOutcome({ meta: { changes: 1 } })).toBe("acquired");
  expect(runLockOutcome({ rowsAffected: 0 })).toBe("held");
});

test("fails closed when a database driver returns no verifiable mutation count", () => {
  expect(runLockOutcome({ meta: {} })).toBe("unavailable");
  expect(runLockOutcome(null)).toBe("unavailable");
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
