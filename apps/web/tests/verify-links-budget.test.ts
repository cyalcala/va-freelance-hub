import { expect, test } from "bun:test";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import {
  buildVerifierSelectionQuery,
  clampVerifierLimit,
  isPlatformSubrequestLimitError,
  VERIFIER_EXTERNAL_SUBREQUEST_CAP,
  VERIFIER_LEGACY_REQUESTED_LIMIT,
  VERIFIER_SAFE_FETCH_BUDGET,
} from "../src/lib/verifier-attempt";

test("verifier clamps the legacy request below the Workers Free external-subrequest cap", () => {
  expect(VERIFIER_EXTERNAL_SUBREQUEST_CAP).toBe(50);
  expect(VERIFIER_SAFE_FETCH_BUDGET).toBe(40);
  expect(clampVerifierLimit(VERIFIER_LEGACY_REQUESTED_LIMIT)).toBe(40);
  expect(clampVerifierLimit(41)).toBe(40);
  expect(clampVerifierLimit(12.9)).toBe(12);
  expect(clampVerifierLimit(0)).toBe(40);
});

test("selection query can never receive more than the safe verifier budget", () => {
  const dialect = new SQLiteSyncDialect();
  const query = dialect.sqlToQuery(
    buildVerifierSelectionQuery(clampVerifierLimit(10_000)),
  );
  expect(query.params.at(-1)).toBe(VERIFIER_SAFE_FETCH_BUDGET);
});

test("platform subrequest exhaustion is distinguishable from target network failure", () => {
  expect(isPlatformSubrequestLimitError(new Error("Too many subrequests."))).toBe(true);
  expect(isPlatformSubrequestLimitError(new Error("Subrequest limit exceeded"))).toBe(true);
  expect(isPlatformSubrequestLimitError(new Error("fetch timed out"))).toBe(false);
});
