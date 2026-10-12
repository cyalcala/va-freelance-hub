import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import { D1_MAX_BOUND_PARAMETERS } from "../../../packages/scraper/batch";

const REFERENCE = "2026-10-10T12:00:00.000Z";
const FRESH = "2026-10-09T12:00:00.000Z";
type Group = { source: "remotive" | "remote-ok" | "jobicy-admin-support-apac"; dates: Array<string | null> };
type Scenario = { groups: Group[]; retryAndDedup?: boolean; duplicateAcrossChunks?: boolean; canaryCap?: number; canaryDifferentRetry?: boolean;
  failBeforeInsert?: number; failAfterInsert?: number };
type Reply = {
  status: number; body: Record<string, unknown>;
  rows: Array<{ id: number; source: string; active: number; reason: string | null; postedAt: string | null }>;
  visible: Array<{ id: number }>;
  ledger: Array<{ source: string; mode: string; proposed: number; n: number; ids: string; retryKey: string }>;
  ftsCount: number;
  bindingAttempts: Array<{ opportunityInsert: boolean; parameters: number; rejected: boolean }>;
  returnedInsertIds: number[][]; executedInsertIds: number[][];
  insertFailures: Array<{ ordinal: number; phase: string }>;
};
type NativeResult = { scope: { reference: string; clock: string; replacementCount: number; bindingBudget: string;
  maxBoundParameters: number; canarySetup: string }; replies: Reply[]; canary: { state: string; cap: number } | null; transports: number };
const sorted = (ids: number[]) => [...ids].sort((a, b) => a - b);

async function nativeIngest(scenario: Scenario): Promise<NativeResult> {
  const child = Bun.spawn([process.execPath, "run", "--no-env-file", "--preload", "./scripts/ci/test-environment.ts",
    "./apps/web/tests/fixtures/native-direct-ingest-binding-budget.ts", JSON.stringify(scenario)], {
    cwd: fileURLToPath(new URL("../../..", import.meta.url)), stdout: "pipe", stderr: "pipe",
  });
  const [stdout, stderr, exit] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  if (exit !== 0) throw new Error(`native direct ingest fixture failed (${exit}): ${stderr.slice(-4000)}`);
  const markers = stdout.split(/\r?\n/).filter(line => line.startsWith("NATIVE_DIRECT_INGEST_BUDGET_RESULT "));
  if (markers.length !== 1) throw new Error("native direct ingest fixture did not emit exactly one result");
  const result = JSON.parse(markers[0]!.slice("NATIVE_DIRECT_INGEST_BUDGET_RESULT ".length)) as NativeResult;
  console.log(`NATIVE_DIRECT_INGEST_BUDGET_EVIDENCE ${JSON.stringify(result)}`);
  expect(result.scope).toMatchObject({ reference: REFERENCE,
    clock: "CLOCK_PROJECTED_NATIVE_TRIGGERS_NOT_BYTE_IDENTICAL_RUNTIME_PROOF", replacementCount: 1,
    bindingBudget: "D1_PARAMETER_CAP_ONLY_NOT_FULL_D1_RUNTIME", maxBoundParameters: D1_MAX_BOUND_PARAMETERS });
  expect(result.transports).toBe(0);
  return result;
}
function expectBudget(reply: Reply) {
  expect(reply.bindingAttempts.length).toBeGreaterThan(0);
  expect(reply.bindingAttempts.every(attempt => !attempt.rejected && attempt.parameters <= D1_MAX_BOUND_PARAMETERS)).toBe(true);
}
function expectPublished(reply: Reply, count: number, hidden = 0) {
  expectBudget(reply);
  expect(reply.status).toBe(200);
  expect(reply.body).toMatchObject({ success: true, inserted: count + hidden, publishedCount: count, hiddenInserted: hidden });
  expect(reply.rows).toHaveLength(count + hidden);
  const active = reply.rows.filter(row => row.active === 1);
  expect(active).toHaveLength(count);
  for (const row of active) expect(row).toMatchObject({ postedAt: FRESH, reason: null });
  const ids = sorted(active.map(row => row.id));
  expect(sorted(reply.visible.map(row => row.id))).toEqual(ids);
  expect(sorted(reply.returnedInsertIds.flat())).toEqual(sorted(reply.rows.map(row => row.id)));
  expect(sorted(reply.ledger.flatMap(row => JSON.parse(row.ids) as number[]))).toEqual(ids);
  expect(reply.ledger.reduce((sum, row) => sum + row.n, 0)).toBe(count);
  for (const receipt of reply.ledger) {
    const sourceIds = active.filter(row => row.source === receipt.source).map(row => row.id);
    expect(receipt.n).toBe(sourceIds.length);
    expect(sorted(JSON.parse(receipt.ids) as number[])).toEqual(sorted(sourceIds));
  }
  for (const row of reply.rows.filter(row => row.active === 0)) expect(row.reason).toMatch(/^posting-freshness-/);
  expect(reply.ftsCount).toBe(count + hidden);
}

describe("native authenticated direct ingest respects D1 binding limits", () => {
  for (const count of [3, 4, 10]) test(`${count} same-source fresh rows preserve one whole-proposal receipt`, async () => {
    const result = await nativeIngest({ groups: [{ source: "remotive", dates: Array(count).fill(FRESH) }] });
    expectPublished(result.replies[0]!, count);
    expect(result.replies[0]!.ledger).toHaveLength(1);
    expect(result.replies[0]!.ledger[0]).toMatchObject({ source: "remotive", proposed: count, n: count });
  }, 45000);

  test("mixed sources and invalid originals preserve exact public and hidden identities", async () => {
    const result = await nativeIngest({ groups: [
      { source: "remotive", dates: [FRESH, FRESH, null, FRESH, FRESH] },
      { source: "remote-ok", dates: [FRESH, "2026-09-31T12:00:00.000Z", FRESH, FRESH, FRESH] },
      { source: "jobicy-admin-support-apac", dates: ["2026-10-10T12:00:00.000000001Z", FRESH] },
    ] });
    expectPublished(result.replies[0]!, 9, 3);
    expect(result.replies[0]!.ledger).toHaveLength(3);
  }, 45000);

  test("same-material retry is historical and later-tick duplicates create zero new IDs", async () => {
    const result = await nativeIngest({ groups: [{ source: "remote-ok", dates: Array(4).fill(FRESH) }], retryAndDedup: true });
    const [first, retry, duplicate] = result.replies as [Reply, Reply, Reply];
    expectPublished(first, 4);
    expectBudget(retry);
    expect(retry.status).toBe(200);
    // Existing retry responses carry the historical receipt count. No fresh
    // physical publication occurred, so this cannot be counted as new flow.
    expect(retry.body).toMatchObject({ inserted: 4, publishedCount: 4, hiddenInserted: 0 });
    expect(retry.returnedInsertIds).toEqual([]);
    expect(retry.ledger).toEqual(first.ledger);
    expect(retry.rows).toEqual(first.rows);
    expectBudget(duplicate);
    expect(duplicate.status).toBe(200);
    expect(duplicate.body).toMatchObject({ inserted: 0, publishedCount: 0, hiddenInserted: 0 });
    expect(duplicate.rows).toEqual(first.rows);
    expect(duplicate.visible).toEqual(first.visible);
    expect(duplicate.returnedInsertIds.flat()).toEqual([]);
    expect(duplicate.ledger).toHaveLength(2);
    expect(duplicate.ledger[1]).toMatchObject({ proposed: 4, n: 0, ids: "[]" });
  }, 45000);

  test("a duplicate in the later SQL chunk records only the three actual new IDs", async () => {
    const result = await nativeIngest({ groups: [{ source: "remotive", dates: Array(4).fill(FRESH) }], duplicateAcrossChunks: true });
    const reply = result.replies[0]!;
    expectPublished(reply, 3);
    expect(reply.body).toMatchObject({ totalReceived: 4 });
    expect(reply.ledger).toHaveLength(1);
    expect(reply.ledger[0]).toMatchObject({ proposed: 4, n: 3 });
    expect(reply.returnedInsertIds.map(ids => ids.length)).toEqual([3, 0]);
  }, 45000);

  test("canary cap spans chunks and another same-tick proposal cannot exceed the shared cap", async () => {
    const result = await nativeIngest({ groups: [{ source: "remotive", dates: Array(7).fill(FRESH) }],
      canaryCap: 4, canaryDifferentRetry: true });
    const [first, exhausted] = result.replies as [Reply, Reply];
    expect(result.scope.canarySetup).toBe("SYNTHETIC_INITIAL_REGISTRY_STATE_SEEDED_BEFORE_LIFECYCLE_TRIGGERS_NOT_ADMISSION_EVIDENCE");
    expectPublished(first, 4);
    expect(first.ledger).toHaveLength(1);
    expect(first.ledger[0]).toMatchObject({ source: "remotive", mode: "capped", proposed: 4, n: 4 });
    expectBudget(exhausted);
    expect(exhausted.status).toBe(200);
    expect(exhausted.body).toMatchObject({ inserted: 0, publishedCount: 0, hiddenInserted: 0 });
    expect(exhausted.rows).toEqual(first.rows);
    expect(exhausted.returnedInsertIds).toEqual([]);
    expect(exhausted.ledger).toHaveLength(2);
    expect(exhausted.ledger[1]).toMatchObject({ mode: "blocked", n: 0, ids: "[]" });
    expect(result.canary).toEqual({ state: "canary", cap: 4 });
  }, 45000);

  for (const failure of ["before-write", "after-write"] as const) test(`later chunk ${failure} failure retains only the previous source's confirmed receipt`, async () => {
    const result = await nativeIngest({ groups: [
      { source: "remotive", dates: [FRESH, FRESH, FRESH] },
      { source: "remote-ok", dates: Array(7).fill(FRESH) },
      { source: "jobicy-admin-support-apac", dates: [FRESH, null] },
    ], ...(failure === "before-write" ? { failBeforeInsert: 3 } : { failAfterInsert: 3 }) });
    const reply = result.replies[0]!;
    expectBudget(reply);
    expect(reply.status).toBe(500);
    expect(reply.body).toMatchObject({ code: "POST_PERSISTENCE_FAILURE", publicationOutcome: "UNKNOWN",
      inserted: null, confirmedPublishedLowerBound: 3, reconciliationRequired: true });
    expect(reply.insertFailures).toEqual([{ ordinal: 3, phase: failure }]);
    const physicalCount = failure === "before-write" ? 6 : 9;
    expect(reply.rows).toHaveLength(physicalCount);
    expect(reply.rows.every(row => row.active === 1 && row.postedAt === FRESH)).toBe(true);
    expect(reply.rows.filter(row => row.source === "jobicy-admin-support-apac")).toEqual([]);
    const confirmed = reply.rows.filter(row => row.source === "remotive").map(row => row.id);
    expect(reply.ledger).toHaveLength(1);
    expect(reply.ledger[0]).toMatchObject({ source: "remotive", n: 3, ids: JSON.stringify(confirmed) });
    expect(sorted(reply.executedInsertIds.flat())).toEqual(sorted(reply.rows.map(row => row.id)));
    expect(reply.returnedInsertIds.flat()).toHaveLength(6);
    // Partial callback failure does not establish rollback, atomic visibility,
    // or a complete durable uncertainty marker for current-group chunks.
    expect(sorted(reply.visible.map(row => row.id))).toEqual(sorted(reply.rows.map(row => row.id)));
    expect(reply.ftsCount).toBe(physicalCount);
  }, 45000);
});
