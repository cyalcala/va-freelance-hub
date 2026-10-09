import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

const REFERENCE = "2026-10-10T12:00:00.000Z";
const FRESH = "2026-10-09T12:00:00.000Z";
const BOUNDARY = "2026-09-10T12:00:00.000Z";
type Scenario = { source: "remotive" | "remote-ok"; dates: Array<string | null>;
  dedup?: boolean; postWriteDrift?: boolean; prefixDrift?: boolean };
type NativeResult = {
  scope: { reference: string; clock: string; replacementCount: number;
    clockProjection: Array<{ name: string; replacements: number; originalSha256: string; projectedSha256: string }> };
  rawInputs: Array<{ source: string; dates: Array<string | null>; body: string }>;
  parsed: Array<{ source: string; items: Array<{ title: string; postedAt: string | null; locationType: string; locationRaw: string | null }> }>;
  status: number; body: Record<string, any>; aiCalls: number;
  rows: Array<{ id: number; title: string; active: number; reason: string | null; eligibility: string;
    type: string; source: string; postedAt: string | null; scrapedAt: string; updatedAt: string }>;
  visible: Array<{ id: number }>; ftsCount: number;
  ledger: Array<{ source: string; n: number; ids: string }>;
  ownershipReads: number; actualReturnedIds: number[][];
  transports: Array<{ phase: string; source: string | null; url: string }>;
  opportunityInserts: number; deleteQueries: number;
};
async function nativeScrape(scenario: Scenario): Promise<NativeResult> {
  // The child replaces raw transport and AI only. It invokes actual provider
  // parsers and the actual route, so no adapter/core/bookkeeping mock can grant
  // the desired freshness outcome. Clock projection is explicitly disclosed.
  const child = Bun.spawn([process.execPath, "run", "--no-env-file", "--preload",
    "./scripts/ci/test-environment.ts", "./apps/web/tests/fixtures/native-fresh-scrape-posting-date.ts", JSON.stringify(scenario)],
  { cwd: fileURLToPath(new URL("../../..", import.meta.url)), stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exit] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  if (exit !== 0) throw new Error(`native posting fixture setup/runner failed (${exit}): ${stderr.slice(-4000)}`);
  const markers = stdout.split(/\r?\n/).filter(line => line.startsWith("NATIVE_POSTING_DATE_RESULT "));
  if (markers.length !== 1) throw new Error("native posting fixture did not emit exactly one result");
  const result = JSON.parse(markers[0]!.slice("NATIVE_POSTING_DATE_RESULT ".length)) as NativeResult;
  // Preserve raw→parsed and physical/receipt evidence in focused RED/GREEN logs.
  console.log(`NATIVE_POSTING_DATE_EVIDENCE ${JSON.stringify(result)}`);
  return result;
}
function expectClock(result: NativeResult) {
  expect(result.scope.reference).toBe(REFERENCE);
  expect(result.scope.clock).toBe("CLOCK_PROJECTED_NATIVE_TRIGGERS_NOT_BYTE_IDENTICAL_RUNTIME_PROOF");
  expect(result.scope.replacementCount).toBe(1);
  const projected = result.scope.clockProjection.filter(trigger => trigger.replacements > 0);
  expect(projected).toHaveLength(1);
  expect(projected[0]!.originalSha256).not.toBe(projected[0]!.projectedSha256);
}
function expectNoPublication(result: NativeResult, count: number) {
  expectClock(result);
  expect(result.status).toBe(200);
  expect(result.rows).toHaveLength(count);
  expect(result.rows.every(row => row.active === 0 && row.reason !== null
    && /^posting-freshness-/.test(row.reason))).toBe(true);
  expect(result.visible).toEqual([]);
  expect(result.ledger).toEqual([]);
  expect(result.ownershipReads).toBe(0);
  expect(result.aiCalls).toBe(0);
  expect(result.ftsCount).toBe(count);
  expect(result.body).toMatchObject({ inserted: 0, actualChanges: 0 });
}

describe("actual raw RSS/JSON fresh scrape posting-date prefence", () => {
  const badDates = [
    { label: "missing", date: null },
    { label: "unparseable", date: "not-a-date" },
    { label: "impossible September 31", date: "2026-09-31T12:00:00.000Z" },
    { label: "invalid non-leap February 29", date: "2026-02-29T12:00:00.000Z" },
    { label: "future by 1ms", date: "2026-10-10T12:00:00.001Z" },
    { label: "future by 1ns before Date can erase precision", date: "2026-10-10T12:00:00.000000001Z" },
    { label: "31 days stale", date: "2026-09-09T12:00:00.000Z" },
    { label: "30 days plus 1ms", date: "2026-09-10T11:59:59.999Z" },
    { label: "30 days plus 1ns before Date can erase precision", date: "2026-09-10T11:59:59.999999999Z" },
  ];
  for (const source of ["remotive", "remote-ok"] as const) for (const sample of badDates) {
    test(`${source}: ${sample.label} stays physically hidden before AI and public staging`, async () => {
      const result = await nativeScrape({ source, dates: [sample.date] });
      expect(result.rawInputs[0]!.dates).toEqual([sample.date]);
      expect(result.parsed[0]!.items).toHaveLength(1);
      expect(result.parsed[0]!.items[0]).toMatchObject({ locationType: "remote", locationRaw: "Philippines" });
      expectNoPublication(result, 1);
      expect(result.rows[0]!.scrapedAt).toBe(REFERENCE);
      expect(result.rows[0]!.updatedAt).toBe(REFERENCE);
    }, 30000);
  }
  for (const sample of [
    { source: "remotive", label: "invalid hour", date: "2026-10-09T24:01:00.000Z" },
    { source: "remote-ok", label: "ambiguous date-only", date: "2026-10-09" },
  ] as const) test(`${sample.source}: ${sample.label} receives a nonrecoverable freshness hold`, async () => {
    const result = await nativeScrape({ source: sample.source, dates: [sample.date] });
    expectNoPublication(result, 1);
  }, 30000);

  for (const sample of [
    { source: "remotive", label: "fresh ISO", date: FRESH, normalized: FRESH },
    { source: "remote-ok", label: "fresh ISO", date: FRESH, normalized: FRESH },
    { source: "remotive", label: "RSS RFC GMT", date: "Fri, 09 Oct 2026 12:00:00 GMT", normalized: FRESH },
    { source: "remotive", label: "RSS RFC +0000", date: "Fri, 09 Oct 2026 12:00:00 +0000", normalized: FRESH },
    { source: "remotive", label: "RSS RFC +0200", date: "Fri, 09 Oct 2026 14:00:00 +0200", normalized: FRESH },
    { source: "remotive", label: "ISO timezone", date: "2026-10-09T20:00:00+08:00", normalized: FRESH },
    { source: "remote-ok", label: "ISO timezone", date: "2026-10-09T20:00:00+08:00", normalized: FRESH },
    { source: "remotive", label: "inclusive exact 30 days", date: BOUNDARY, normalized: BOUNDARY },
    { source: "remote-ok", label: "inclusive exact 30 days", date: BOUNDARY, normalized: BOUNDARY },
    { source: "remote-ok", label: "30-day boundary plus 1ns", date: "2026-09-10T12:00:00.000000001Z", normalized: BOUNDARY },
  ] as const) test(`${sample.source}: ${sample.label} preserves actual public ID and original timestamp meaning`, async () => {
    const result = await nativeScrape({ source: sample.source, dates: [sample.date] });
    expectClock(result);
    expect(result.status).toBe(200);
    expect(result.parsed[0]!.items[0]!.postedAt).toBe(sample.label === "30-day boundary plus 1ns" ? sample.date : sample.normalized);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ id: 1, active: 1, reason: null, source: sample.source,
      postedAt: sample.normalized, type: "remote" });
    expect(result.visible).toEqual([{ id: 1 }]);
    expect(result.ledger).toEqual([{ source: sample.source, n: 1, ids: "[1]" }]);
    expect(result.actualReturnedIds).toEqual([[1]]);
    expect(result.body).toMatchObject({ inserted: 1, actualChanges: 1 });
    expect(result.ftsCount).toBe(1);
  }, 30000);

  for (const source of ["remotive", "remote-ok"] as const) {
    test(`${source}: mixed raw dates publish only the actual fresh row and retain hidden candidates`, async () => {
      const result = await nativeScrape({ source, dates: [null, FRESH, "2026-09-31T12:00:00.000Z"] });
      expectClock(result);
      expect(result.status).toBe(200);
      expect(result.rows).toHaveLength(3);
      const fresh = result.rows.find(row => row.title.endsWith(" 1"))!;
      expect(fresh).toMatchObject({ active: 1, postedAt: FRESH });
      expect(result.rows.filter(row => row.id !== fresh.id).every(row => row.active === 0
        && row.reason !== null && /^posting-freshness-/.test(row.reason))).toBe(true);
      expect(result.visible).toEqual([{ id: fresh.id }]);
      expect(result.ledger).toEqual([{ source, n: 1, ids: JSON.stringify([fresh.id]) }]);
      expect(result.actualReturnedIds).toEqual([[fresh.id]]);
      expect(result.aiCalls).toBe(1);
      expect(result.body).toMatchObject({ inserted: 1, actualChanges: 1 });
      expect(result.ftsCount).toBe(3);
    }, 30000);
    test(`${source}: empty raw feed retains exact zero and skips publication reads`, async () => {
      const result = await nativeScrape({ source, dates: [] });
      expect(result.status).toBe(200);
      expect(result.rows).toEqual([]);
      expect(result.visible).toEqual([]);
      expect(result.ledger).toEqual([]);
      expect(result.actualReturnedIds).toEqual([]);
      expect(result.ownershipReads).toBe(0);
      expect(result.aiCalls).toBe(0);
      expect(result.body).toMatchObject({ inserted: 0 });
    }, 30000);
    test(`${source}: actual parsed identity dedup creates no fresh receipt`, async () => {
      const result = await nativeScrape({ source, dates: [FRESH], dedup: true });
      expect(result.status).toBe(200);
      expect(result.rows).toHaveLength(1);
      expect(result.visible).toEqual([{ id: 1 }]);
      expect(result.ledger).toEqual([]);
      expect(result.actualReturnedIds).toEqual([]);
      expect(result.ownershipReads).toBe(0);
      expect(result.aiCalls).toBe(0);
      expect(result.body).toMatchObject({ inserted: 0 });
    }, 30000);
  }
  test("current posting-date drift after actual persistence stays UNKNOWN without compensation", async () => {
    const result = await nativeScrape({ source: "remotive", dates: [FRESH], postWriteDrift: true });
    expect(result.status).toBe(500);
    expect(result.body).toMatchObject({ publicationOutcome: "UNKNOWN", inserted: null,
      actualChanges: null, confirmedPublishedLowerBound: 0 });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ active: 1, postedAt: "2026-09-09T12:00:00.000Z" });
    // The current public predicate still selects physical rows after ambiguity;
    // this control discloses the retained atomicity/withdrawal limitation.
    expect(result.visible).toEqual([{ id: 1 }]);
    expect(result.actualReturnedIds).toEqual([[1]]);
    expect(result.ledger).toEqual([]);
    expect(result.ftsCount).toBe(1);
    expect(result.deleteQueries).toBe(0);
  }, 30000);
  test("second actual source drift retains the confirmed prefix and stops a later source writer", async () => {
    const result = await nativeScrape({ source: "remotive", dates: [FRESH, FRESH, FRESH], prefixDrift: true });
    expect(result.status).toBe(500);
    expect(result.body).toMatchObject({ publicationOutcome: "UNKNOWN", inserted: null,
      actualChanges: null, confirmedPublishedLowerBound: 1 });
    expect(result.rows.map(row => [row.source, row.active, row.postedAt])).toEqual([
      ["remotive", 1, FRESH], ["real-work-from-anywhere", 1, "2026-09-09T12:00:00.000Z"],
    ]);
    expect(result.ledger).toEqual([{ source: "remotive", n: 1, ids: "[1]" }]);
    expect(result.actualReturnedIds).toEqual([[1], [2]]);
    expect(result.visible).toEqual([{ id: 1 }, { id: 2 }]);
    expect(result.opportunityInserts).toBe(2);
    expect(result.ftsCount).toBe(2);
    expect(result.deleteQueries).toBe(0);
  }, 30000);
});
