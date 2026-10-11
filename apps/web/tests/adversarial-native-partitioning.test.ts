import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

const REFERENCE = "2026-10-10T12:00:00.000Z";
const FRESH_1 = "2026-10-09T12:00:00.000Z";
const FRESH_2 = "2026-10-08T12:00:00.000Z";
const BOUNDARY_EXACT = "2026-09-10T12:00:00.000Z"; // Exactly 30 days inclusive

type Scenario = {
  source: "remotive" | "remote-ok";
  dates: Array<string | null>;
  dedup?: boolean;
};

type NativeResult = {
  scope: { reference: string; clock: string };
  rawInputs: Array<{ source: string; dates: Array<string | null>; body: string }>;
  parsed: Array<{ source: string; items: Array<{ title: string; postedAt: string | null; locationType: string; locationRaw: string | null }> }>;
  status: number;
  body: Record<string, any>;
  aiCalls: number;
  rows: Array<{
    id: number;
    title: string;
    active: number;
    reason: string | null;
    eligibility: string;
    type: string;
    source: string;
    postedAt: string | null;
    scrapedAt: string;
    updatedAt: string;
  }>;
  visible: Array<{ id: number }>;
  ftsCount: number;
  ledger: Array<{ source: string; n: number; ids: string }>;
  ownershipReads: number;
  actualReturnedIds: number[][];
  opportunityInserts: number;
  deleteQueries: number;
};

async function runNative(scenario: Scenario): Promise<NativeResult> {
  const child = Bun.spawn(
    [
      process.execPath,
      "run",
      "--no-env-file",
      "--preload",
      "./scripts/ci/test-environment.ts",
      "./apps/web/tests/fixtures/native-fresh-scrape-posting-date.ts",
      JSON.stringify(scenario),
    ],
    {
      cwd: fileURLToPath(new URL("../../..", import.meta.url)),
      stdout: "pipe",
      stderr: "pipe",
    }
  );

  const [stdout, stderr, exit] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);

  if (exit !== 0) {
    throw new Error(`Native runner failed (${exit}): ${stderr.slice(-3000)}`);
  }

  const markers = stdout.split(/\r?\n/).filter((line) => line.startsWith("NATIVE_POSTING_DATE_RESULT "));
  if (markers.length !== 1) {
    throw new Error("Native fixture did not emit exactly one result marker");
  }

  return JSON.parse(markers[0]!.slice("NATIVE_POSTING_DATE_RESULT ".length)) as NativeResult;
}

describe("Adversarial Empirical Challenge: Native Batch Partitioning & Public Gating", () => {
  test("All-bad multi-item batch yields EXACTLY ZERO visible rows and ZERO ledger entries", async () => {
    // 6 distinct bad dates in one batch:
    const allBadDates = [
      "2026-09-31T12:00:00.000Z", // impossible Sep 31
      "2026-02-29T12:00:00.000Z", // non-leap Feb 29
      "2026-10-10T12:00:00.000000001Z", // future by 1ns
      "2026-09-10T11:59:59.999999999Z", // stale by 30 days + 1ns
      null, // missing
      "not-a-date", // unparseable
    ];

    const result = await runNative({ source: "remotive", dates: allBadDates });

    expect(result.status).toBe(200);
    expect(result.rows).toHaveLength(6);

    // Invariant 1: ZERO public-selectable rows
    expect(result.visible).toEqual([]);

    // Invariant 2: ZERO ledger entries (no publication receipts!)
    expect(result.ledger).toEqual([]);

    // Invariant 3: Zero actual returned published IDs
    expect(result.actualReturnedIds).toEqual([]);

    // Invariant 4: Zero AI triage calls (withheld BEFORE AI!)
    expect(result.aiCalls).toBe(0);

    // Invariant 5: In DB, every single row is inactive with a posting-freshness reason
    for (const row of result.rows) {
      expect(row.active).toBe(0);
      expect(row.reason).toMatch(/^posting-freshness-/);
    }

    // Invariant 6: Response body confirms 0 inserted
    expect(result.body).toMatchObject({ inserted: 0, actualChanges: 0 });
  }, 45000);

  test("Mixed complex batch partitions strictly: only qualified rows publish", async () => {
    // Mixed batch:
    // Index 0: bad (null)
    // Index 1: FRESH_1 (valid)
    // Index 2: bad (impossible Sep 31)
    // Index 3: BOUNDARY_EXACT (valid 30-day boundary)
    // Index 4: bad (future +1ns)
    // Index 5: FRESH_2 (valid)
    // Index 6: bad (stale 30d + 1ms)
    const mixedDates = [
      null,
      FRESH_1,
      "2026-09-31T12:00:00.000Z",
      BOUNDARY_EXACT,
      "2026-10-10T12:00:00.000000001Z",
      FRESH_2,
      "2026-09-10T11:59:59.999Z",
    ];

    const result = await runNative({ source: "remote-ok", dates: mixedDates });

    expect(result.status).toBe(200);
    expect(result.rows).toHaveLength(7);

    // Exactly 3 items are valid (Index 1, 3, 5)
    const validRows = result.rows.filter((r) => r.active === 1);
    expect(validRows).toHaveLength(3);

    const badRows = result.rows.filter((r) => r.active === 0);
    expect(badRows).toHaveLength(4);

    // Verify valid rows have expected IDs and properties
    const validIds = validRows.map((r) => r.id);
    expect(result.visible.map((v) => v.id).sort()).toEqual(validIds.sort());

    // Verify ledger contains exactly the valid IDs
    expect(result.ledger).toHaveLength(1);
    expect(result.ledger[0]!.source).toBe("remote-ok");
    expect(result.ledger[0]!.n).toBe(3);
    const publishedIds = JSON.parse(result.ledger[0]!.ids) as number[];
    expect(publishedIds.sort()).toEqual(validIds.sort());

    // Verify AI calls was made ONLY for valid items (3 items)
    expect(result.aiCalls).toBe(3);

    // Verify bad rows are all inactive with posting-freshness reason
    for (const badRow of badRows) {
      expect(badRow.active).toBe(0);
      expect(badRow.reason).toMatch(/^posting-freshness-/);
    }

    // Verify body counts
    expect(result.body).toMatchObject({ inserted: 3, actualChanges: 3 });
  }, 45000);
});
