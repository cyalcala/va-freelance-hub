import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

type Scenario = { types: Array<string | null>; description?: string; textMarker?: boolean; breezyTextMarker?: boolean;
  dedup?: boolean; postWriteDrift?: boolean; prefixDrift?: boolean };
type NativeResult = { status: number; body: Record<string, any>; aiCalls: number;
  rows: Array<{ id: number; active: number; reason: string | null; type: string | null; source: string }>;
  ftsCount: number; ledger: Array<{ source: string; n: number; ids: string }>;
  ownershipReads: number; feedCalls: string[]; transports: string[];
  opportunityInserts: number; deleteQueries: number };

async function nativeScrape(scenario: Scenario): Promise<NativeResult> {
  // Module mocks are confined to this child. The parent/full-suite process
  // never substitutes production scraper, geoGate, persistence or gateway.
  const child = Bun.spawn([process.execPath, "run", "--no-env-file", "--preload",
    "./scripts/ci/test-environment.ts", "./apps/web/tests/fixtures/native-fresh-scrape-remote.ts", JSON.stringify(scenario)],
  { cwd: fileURLToPath(new URL("../../..", import.meta.url)), stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exit] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  if (exit !== 0) throw new Error(`native child setup/runner failed (${exit}): ${stderr.slice(-4000)}`);
  const line = stdout.split(/\r?\n/).reverse().find(value => value.startsWith("NATIVE_FRESH_SCRAPE_RESULT "));
  if (!line) throw new Error("native child produced no result");
  return JSON.parse(line.slice("NATIVE_FRESH_SCRAPE_RESULT ".length));
}

describe("synthetic ADAPTER_OUTPUT_CONSUMER_BOUNDARY fresh scrape", () => {
  for (const type of ["onsite", "hybrid"]) test(`${type} with ordinary PH text stays hidden/policy-rejected before AI/public staging`, async () => {
    const result = await nativeScrape({ types: [type] });
    expect(result.rows).toEqual([{ id: 1, active: 0, reason: "policy-rejected", type, source: "remotive" }]);
    expect(result.status).toBe(200);
    expect(result.aiCalls).toBe(0);
    expect(result.body).toMatchObject({ inserted: 0, actualChanges: 0, geoGateRejected: 1, rejectedInsertFailedBatches: 0 });
    expect(result.ledger).toEqual([]);
    expect(result.ownershipReads).toBe(0);
    expect(result.ftsCount).toBe(1);
    expect(result.feedCalls).toContain("remotive");
  }, 30000);

  for (const control of [
    { label: "existing exact-six remote output shape", types: ["remote"] },
    { label: "description-only hybrid collaboration", types: ["remote"], description: "Hybrid collaboration. Remote role open to applicants in the Philippines." },
    { label: "opaque NULL noncontradiction", types: [null] },
    { label: "unsupported metadata noncontradiction", types: ["unproven-workplace"] },
  ]) test(`${control.label} retains declared behavior without remote-origin certification`, async () => {
    const result = await nativeScrape(control);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ inserted: 1, actualChanges: 1, geoGateRejected: 0 });
    expect(result.rows).toEqual([{ id: 1, active: 1, reason: null, type: control.types[0], source: "remotive" }]);
    expect(result.ledger).toEqual([{ source: "remotive", n: 1, ids: "[1]" }]);
    expect(result.ftsCount).toBe(1);
  }, 30000);

  test("existing onsite text-marker shape remains rejected before AI", async () => {
    const result = await nativeScrape({ types: ["onsite"], textMarker: true });
    expect(result.status).toBe(200);
    expect(result.aiCalls).toBe(0);
    expect(result.rows[0]).toMatchObject({ active: 0, reason: "policy-rejected" });
    expect(result.ledger).toEqual([]);
  }, 30000);

  test("synthetic existing Breezy PH (onsite) parser-output shape remains rejected without ATS admission", async () => {
    // Actual parser proof remains packages/scraper/breezy-feed.test.ts. This
    // fixture supplies that output shape at the permitted adapter boundary.
    const result = await nativeScrape({ types: ["onsite"], breezyTextMarker: true });
    expect(result.status).toBe(200);
    expect(result.aiCalls).toBe(0);
    expect(result.rows[0]).toMatchObject({ active: 0, reason: "policy-rejected", type: "onsite" });
    expect(result.ledger).toEqual([]);
    expect(result.ownershipReads).toBe(0);
  }, 30000);

  test("mixed structured metadata preserves only exact actual public IDs", async () => {
    const result = await nativeScrape({ types: ["remote", "onsite", "hybrid"] });
    expect(result.status).toBe(200);
    expect(result.rows.map(row => [row.active, row.type])).toEqual([[1, "remote"], [0, "onsite"], [0, "hybrid"]]);
    expect(result.ledger).toEqual([{ source: "remotive", n: 1, ids: "[1]" }]);
    expect(result.aiCalls).toBe(1);
    expect(result.body).toMatchObject({ inserted: 1, actualChanges: 1, geoGateRejected: 2, rejectedInsertFailedBatches: 0 });
    expect(result.ftsCount).toBe(3);
  }, 30000);

  test("dedup zero retains existing physical rows without a new public receipt", async () => {
    const result = await nativeScrape({ types: ["remote"], dedup: true });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ inserted: 0 });
    expect(result.aiCalls).toBe(0);
    expect(result.ledger).toEqual([]);
    expect(result.ownershipReads).toBe(0);
    expect(result.rows).toHaveLength(1);
  }, 30000);

  test("empty adapter outputs produce exact zero without public writes or observations", async () => {
    const result = await nativeScrape({ types: [] });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ inserted: 0 });
    expect(result.aiCalls).toBe(0);
    expect(result.rows).toEqual([]);
    expect(result.ledger).toEqual([]);
    expect(result.ownershipReads).toBe(0);
  }, 30000);

  test("post-write metadata drift retains physical rows/FTS with UNKNOWN and no fresh ledger", async () => {
    const result = await nativeScrape({ types: ["remote"], postWriteDrift: true });
    expect(result.status).toBe(500);
    expect(result.body).toMatchObject({ publicationOutcome: "UNKNOWN", inserted: null, actualChanges: null, confirmedPublishedLowerBound: 0 });
    expect(result.rows[0]).toMatchObject({ active: 1, type: "onsite" });
    expect(result.ledger).toEqual([]);
    expect(result.ftsCount).toBe(1);
    expect(result.deleteQueries).toBe(0);
  }, 30000);

  test("second committed source drift retains a confirmed prefix and stops a third source writer", async () => {
    const result = await nativeScrape({ types: ["remote", "remote", "remote"], prefixDrift: true });
    expect(result.status).toBe(500);
    expect(result.body).toMatchObject({ publicationOutcome: "UNKNOWN", inserted: null,
      actualChanges: null, confirmedPublishedLowerBound: 1 });
    expect(result.rows).toEqual([
      { id: 1, active: 1, reason: null, type: "remote", source: "remotive" },
      { id: 2, active: 1, reason: null, type: "onsite", source: "real-work-from-anywhere" },
    ]);
    expect(result.ledger).toEqual([{ source: "remotive", n: 1, ids: "[1]" }]);
    expect(result.ftsCount).toBe(2);
    expect(result.opportunityInserts).toBe(2);
    expect(result.deleteQueries).toBe(0);
  }, 30000);
});
