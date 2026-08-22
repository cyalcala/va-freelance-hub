import { expect, test } from "bun:test";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import {
  buildVerifierSelectionQuery,
  clampVerifierLimit,
  isPlatformSubrequestLimitError,
  VERIFIER_EXTERNAL_SUBREQUEST_CAP,
  VERIFIER_LEGACY_REQUESTED_LIMIT,
  VERIFIER_MAX_FETCHES_PER_ITEM,
  VERIFIER_MAX_REDIRECT_HOPS,
  VERIFIER_SAFE_FETCH_BUDGET,
  VERIFIER_SAFE_ITEM_BUDGET,
} from "../src/lib/verifier-attempt";
import { fetchVerifierTarget } from "../src/pages/api/cron/verify-links";

test("verifier clamps the legacy request below the Workers Free external-subrequest cap", () => {
  expect(VERIFIER_EXTERNAL_SUBREQUEST_CAP).toBe(50);
  expect(VERIFIER_SAFE_FETCH_BUDGET).toBe(40);
  expect(VERIFIER_MAX_REDIRECT_HOPS).toBe(1);
  expect(VERIFIER_MAX_FETCHES_PER_ITEM).toBe(2);
  expect(VERIFIER_SAFE_ITEM_BUDGET).toBe(20);
  expect(VERIFIER_SAFE_ITEM_BUDGET * VERIFIER_MAX_FETCHES_PER_ITEM).toBe(40);
  expect(clampVerifierLimit(VERIFIER_LEGACY_REQUESTED_LIMIT)).toBe(20);
  expect(clampVerifierLimit(41)).toBe(20);
  expect(clampVerifierLimit(12.9)).toBe(12);
  expect(clampVerifierLimit(0)).toBe(20);
});

test("selection query can never receive more than the safe verifier budget", () => {
  const dialect = new SQLiteSyncDialect();
  const query = dialect.sqlToQuery(
    buildVerifierSelectionQuery(clampVerifierLimit(10_000)),
  );
  expect(query.params.at(-1)).toBe(VERIFIER_SAFE_ITEM_BUDGET);
});

test("platform subrequest exhaustion is distinguishable from target network failure", () => {
  expect(isPlatformSubrequestLimitError(new Error("Too many subrequests."))).toBe(true);
  expect(isPlatformSubrequestLimitError(new Error("Subrequest limit exceeded"))).toBe(true);
  expect(isPlatformSubrequestLimitError(new Error("fetch timed out"))).toBe(false);
});

test("verifier follows at most one redirect and forces manual redirect accounting", async () => {
  const calls: Array<{ url: string; redirect: RequestRedirect | undefined }> = [];
  const responses = [
    new Response(null, { status: 302, headers: { location: "/final" } }),
    new Response(null, { status: 302, headers: { location: "/third" } }),
    new Response("must not be fetched", { status: 200 }),
  ];
  const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), redirect: init?.redirect });
    return responses.shift()!;
  }) as typeof fetch;

  const response = await fetchVerifierTarget(
    "https://example.com/start",
    { method: "HEAD" },
    fetcher,
  );

  expect(response.status).toBe(302);
  expect(calls).toEqual([
    { url: "https://example.com/start", redirect: "manual" },
    { url: "https://example.com/final", redirect: "manual" },
  ]);
});
