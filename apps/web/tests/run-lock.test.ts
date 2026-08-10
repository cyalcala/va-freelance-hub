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
