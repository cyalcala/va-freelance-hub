import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import { D1_MAX_BOUND_PARAMETERS } from "../../../packages/scraper/batch";

const REFERENCE = "2026-10-10T12:00:00.000Z";
const FRESH = "2026-10-09T12:00:00.000Z";
const STALE = "2026-09-09T12:00:00.000Z";
const BAD_CALENDAR = "2026-09-31T12:00:00.000Z";
const FUTURE = "2026-10-10T12:00:00.000000001Z";

type Scenario = {
  source: "remotive" | "remote-ok";
  dates: Array<string | null>;
  sourceDates?: Record<string, Array<string | null>>;
  prefixDrift?: boolean;
  dedup?: boolean;
  failOpportunityInsertAttempt?: number;
  duplicateSourceUrlIndex?: number;
};
type NativeResult = {
  scope: { reference: string; clock: string; replacementCount: number; bindingBudget: string; maxBoundParameters: number };
  status: number;
  body: Record<string, unknown>;
  aiCalls: number;
  rows: Array<{ id: number; source: string; title: string; active: number; reason: string | null; postedAt: string | null }>;
  visible: Array<{ id: number }>;
  ftsCount: number;
  ledger: Array<{ source: string; n: number; ids: string }>;
  actualReturnedIds: number[][];
  bindingAttempts: Array<{ opportunityInsert: boolean; parameters: number; rejected: boolean }>;
  opportunityInsertAttempts: number;
  insertFaultInjected: boolean;
  deleteQueries: number;
};

async function nativeScrape(scenario: Scenario): Promise<NativeResult> {
  const child = Bun.spawn([process.execPath, "run", "--no-env-file", "--preload", "./scripts/ci/test-environment.ts",
    "./apps/web/tests/fixtures/native-fresh-scrape-posting-date.ts",
    JSON.stringify({ ...scenario, enforceD1BindingBudget: true })], {
    cwd: fileURLToPath(new URL("../../..", import.meta.url)), stdout: "pipe", stderr: "pipe",
  });
  const [stdout, stderr, exit] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  if (exit !== 0) throw new Error(`native D1 budget fixture failed (${exit}): ${stderr.slice(-4000)}`);
  const markers = stdout.split(/\r?\n/).filter(line => line.startsWith("NATIVE_POSTING_DATE_RESULT "));
  if (markers.length !== 1) throw new Error("native D1 budget fixture did not emit exactly one result");
  const result = JSON.parse(markers[0]!.slice("NATIVE_POSTING_DATE_RESULT ".length)) as NativeResult;
  console.log(`NATIVE_D1_BINDING_BUDGET_EVIDENCE ${JSON.stringify(result)}`);
  return result;
}

const sorted = (ids: number[]) => [...ids].sort((a, b) => a - b);
function expectBudget(result: NativeResult) {
  expect(result.scope).toMatchObject({ reference: REFERENCE,
    clock: "CLOCK_PROJECTED_NATIVE_TRIGGERS_NOT_BYTE_IDENTICAL_RUNTIME_PROOF", replacementCount: 1,
    bindingBudget: "D1_PARAMETER_CAP_ONLY_NOT_FULL_D1_RUNTIME", maxBoundParameters: D1_MAX_BOUND_PARAMETERS });
  expect(result.bindingAttempts.length).toBeGreaterThan(0);
  expect(result.bindingAttempts.every(attempt => attempt.parameters <= D1_MAX_BOUND_PARAMETERS && !attempt.rejected)).toBe(true);
}
function expectPublished(result: NativeResult, count: number, hidden: number = 0, aiCount: number = count) {
  expectBudget(result);
  expect(result.status).toBe(200);
  expect(result.rows).toHaveLength(count + hidden);
  const active = result.rows.filter(row => row.active === 1);
  expect(active).toHaveLength(count);
  for (const row of active) expect(row).toMatchObject({ postedAt: FRESH, reason: null });
  const ids = sorted(active.map(row => row.id));
  expect(sorted(result.visible.map(row => row.id))).toEqual(ids);
  expect(sorted(result.actualReturnedIds.flat())).toEqual(ids);
  expect(sorted(result.ledger.flatMap(receipt => JSON.parse(receipt.ids) as number[]))).toEqual(ids);
  expect(result.ledger.reduce((sum, receipt) => sum + receipt.n, 0)).toBe(count);
  for (const receipt of result.ledger) {
    const sourceIds = active.filter(row => row.source === receipt.source).map(row => row.id);
    expect(receipt.n).toBe(sourceIds.length);
    expect(sorted(JSON.parse(receipt.ids) as number[])).toEqual(sorted(sourceIds));
  }
  for (const row of result.rows.filter(row => row.active === 0)) expect(row.reason).toMatch(/^posting-freshness-/);
  expect(result.aiCalls).toBe(aiCount);
  expect(result.ftsCount).toBe(count + hidden);
  expect(result.body).toMatchObject({ inserted: count, actualChanges: count });
}

describe("native grouped scrape obeys the D1 bound-parameter budget", () => {
  test("three qualified rows preserve real IDs, one receipt and public visibility", async () => {
    const result = await nativeScrape({ source: "remotive", dates: [FRESH, FRESH, FRESH] });
    expectPublished(result, 3);
    expect(result.ledger).toHaveLength(1);
  }, 45000);

  for (const count of [4, 10]) test(`${count} same-source qualified rows publish under the parameter cap`, async () => {
    const result = await nativeScrape({ source: "remote-ok", dates: Array(count).fill(FRESH) });
    expectPublished(result, count);
    expect(result.ledger).toHaveLength(1);
    expect(result.ledger[0]!.source).toBe("remote-ok");
  }, 45000);

  test("mixed source groups and invalid originals keep receipts equal to qualified rows", async () => {
    const result = await nativeScrape({ source: "remotive", dates: [], sourceDates: {
      remotive: [FRESH, FRESH, FRESH, FRESH, FRESH, null, BAD_CALENDAR],
      "real-work-from-anywhere": [FRESH, STALE, FRESH],
      "remote-ok": [FRESH, FUTURE, FRESH, FRESH, FRESH],
    } });
    expectPublished(result, 11, 4);
    expect(result.ledger).toHaveLength(3);
  }, 45000);

  test("four previously stored identities create no new exposure or receipt", async () => {
    const result = await nativeScrape({ source: "remote-ok", dates: Array(4).fill(FRESH), dedup: true });
    expectBudget(result);
    expect(result.status).toBe(200);
    expect(result.rows).toHaveLength(4);
    expect(result.visible).toHaveLength(4);
    expect(result.ftsCount).toBe(4);
    expect(result.aiCalls).toBe(0);
    expect(result.body).toMatchObject({ inserted: 0, actualChanges: 0 });
    expect(result.ledger).toEqual([]);
    expect(result.actualReturnedIds).toEqual([]);
    expect(result.opportunityInsertAttempts).toBe(0);
  }, 45000);

  test("a conflict in the second chunk records only the three actually returned IDs", async () => {
    const result = await nativeScrape({ source: "remote-ok", dates: Array(4).fill(FRESH), duplicateSourceUrlIndex: 3 });
    expectPublished(result, 3, 0, 4);
    expect(result.actualReturnedIds).toEqual([[1, 2, 3], []]);
    expect(result.bindingAttempts.filter(attempt => attempt.opportunityInsert).map(attempt => attempt.parameters)).toEqual([81, 27]);
    expect(result.ledger).toEqual([{ source: "remote-ok", n: 3, ids: "[1,2,3]" }]);
    expect(result.body).toMatchObject({ acceptedForInsert: 4, attemptedInsert: 4, skipped: 1 });
  }, 45000);

  test("later chunk failure preserves only confirmed source prefix and stops subsequent writers", async () => {
    const result = await nativeScrape({ source: "remotive", dates: [], failOpportunityInsertAttempt: 3, sourceDates: {
      remotive: [FRESH, FRESH, FRESH],
      "real-work-from-anywhere": [FRESH, FRESH, FRESH, FRESH],
      "remote-ok": [FRESH, FRESH, null],
    } });
    expectBudget(result);
    expect(result.insertFaultInjected).toBe(true);
    expect(result.opportunityInsertAttempts).toBe(3);
    expect(result.status).toBe(500);
    expect(result.body).toMatchObject({ publicationOutcome: "UNKNOWN", inserted: null,
      actualChanges: null, skipped: null, confirmedPublishedLowerBound: 3, reconciliationRequired: true });
    expect(result.rows).toHaveLength(6);
    expect(result.rows.every(row => row.active === 1 && row.postedAt === FRESH)).toBe(true);
    expect(result.rows.filter(row => row.source === "remote-ok")).toEqual([]);
    const prefixIds = result.rows.filter(row => row.source === "remotive").map(row => row.id);
    expect(result.ledger).toEqual([{ source: "remotive", n: 3, ids: JSON.stringify(prefixIds) }]);
    expect(sorted(result.actualReturnedIds.flat())).toEqual(sorted(result.rows.map(row => row.id)));
    // Partial physical exposure remains visible. This test proves UNKNOWN and
    // caller fencing, not atomic rollback or complete uncertainty withdrawal.
    expect(sorted(result.visible.map(row => row.id))).toEqual(sorted(result.rows.map(row => row.id)));
    expect(result.ftsCount).toBe(6);
    expect(result.deleteQueries).toBe(0);
  }, 45000);

  test("post-write drift in a chunked second source retains confirmed prefix and stops the later source", async () => {
    const result = await nativeScrape({ source: "remotive", dates: [], prefixDrift: true, sourceDates: {
      remotive: [FRESH, FRESH, FRESH],
      "real-work-from-anywhere": [FRESH, FRESH, FRESH, FRESH],
      "remote-ok": [FRESH, FRESH],
    } });
    expectBudget(result);
    expect(result.status).toBe(500);
    expect(result.body).toMatchObject({ publicationOutcome: "UNKNOWN", inserted: null,
      actualChanges: null, confirmedPublishedLowerBound: 3 });
    expect(result.rows).toHaveLength(7);
    expect(result.rows.every(row => row.active === 1)).toBe(true);
    expect(result.rows.filter(row => row.source === "remote-ok")).toEqual([]);
    const prefix = result.rows.filter(row => row.source === "remotive");
    expect(result.ledger).toEqual([{ source: "remotive", n: 3, ids: JSON.stringify(prefix.map(row => row.id)) }]);
    expect(result.rows.filter(row => row.source === "real-work-from-anywhere" && row.postedAt === STALE)).toHaveLength(1);
    expect(sorted(result.actualReturnedIds.flat())).toEqual(sorted(result.rows.map(row => row.id)));
    // UNKNOWN does not establish atomicity or withdrawal. The existing public
    // predicate still selects the physically active second-source rows.
    expect(sorted(result.visible.map(row => row.id))).toEqual(sorted(result.rows.map(row => row.id)));
    expect(result.ftsCount).toBe(7);
  }, 45000);
});
