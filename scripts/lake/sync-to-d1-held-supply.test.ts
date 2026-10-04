import { describe, expect, it } from "bun:test";
import {
  formatHeldSupplyNotice,
  formatPublishOutcomeNotice,
  type HeldSourceRow,
} from "./sync-to-d1";

/**
 * INCIDENT-0410(v) — the publisher must not report a plain success for a run that synced
 * zero rows because qualified supply is held by the source gate.
 *
 * Measured 2026-10-04 (read-only): Turso holds 60 QUALIFIED_READY rows across 17 source_ids
 * that are not in the authorized set, while `lake-publish-job` returns success every tick.
 * The held count was logged with console.log as one aggregate number, so the only durable
 * distinction between "nothing to publish" and "supply is held" was an overwritten line.
 *
 * These tests exercise the real exported formatter; nothing here is a constant compared
 * with itself.
 */

const HELD: HeldSourceRow[] = [
  { source_id: "ashby:supabase", held_count: 13 },
  { source_id: "lever:deliverect", held_count: 9 },
  { source_id: "lever:decilegroup", held_count: 5 },
  { source_id: "lever:brafton", held_count: 5 },
  { source_id: "lever:lwolf", held_count: 4 },
  { source_id: "lever:hso", held_count: 1 },
];

describe("formatHeldSupplyNotice", () => {
  it("reports a positive held total instead of nothing, naming the source gate", () => {
    const lines = formatHeldSupplyNotice(HELD);
    expect(lines.length).toBeGreaterThan(0);
    const joined = lines.join("\n");
    expect(joined).toContain("37");
    expect(joined).toContain("ashby:supabase");
    expect(joined).toContain("source gate");
  });

  it("sums every held row, not only the ones shown", () => {
    const lines = formatHeldSupplyNotice(HELD);
    const totalLine = lines[lines.length - 1]!;
    const shown = HELD.reduce((sum, row) => sum + row.held_count, 0);
    expect(shown).toBe(37);
    expect(totalLine).toContain("37");
  });

  it("orders the most-held source first so the cause is the first thing read", () => {
    const lines = formatHeldSupplyNotice(HELD);
    expect(lines[0]).toContain("ashby:supabase");
    expect(lines[0]).toContain("13");
  });

  it("caps the per-source detail and says how many sources it hid", () => {
    const lines = formatHeldSupplyNotice(HELD, 2);
    expect(lines.filter((line) => line.includes("lever:decilegroup"))).toEqual([]);
    expect(lines.some((line) => line.includes("more source"))).toBe(true);
  });

  it("counts every hidden source, not just the surplus rows", () => {
    const lines = formatHeldSupplyNotice(HELD, 2);
    const hidden = lines.find((line) => line.includes("more source"))!;
    expect(hidden).toContain("4");
  });

  it("is silent for an empty cohort, so a healthy run is not warned about", () => {
    expect(formatHeldSupplyNotice([])).toEqual([]);
  });

  it("is silent when every reported row is zero", () => {
    expect(formatHeldSupplyNotice([{ source_id: "lever:hso", held_count: 0 }])).toEqual([]);
  });

  it("does not report a negative or non-finite count as supply", () => {
    expect(formatHeldSupplyNotice([{ source_id: "lever:hso", held_count: -3 }])).toEqual([]);
    expect(formatHeldSupplyNotice([{ source_id: "lever:hso", held_count: Number.NaN }])).toEqual([]);
  });

  it("breaks a count tie deterministically by source_id", () => {
    const tied: HeldSourceRow[] = [
      { source_id: "lever:brafton", held_count: 5 },
      { source_id: "lever:decilegroup", held_count: 5 },
    ];
    const forwards = formatHeldSupplyNotice(tied);
    const reversed = formatHeldSupplyNotice([...tied].reverse());
    expect(forwards).toEqual(reversed);
    expect(forwards[0]).toContain("lever:brafton");
  });
});
describe("formatPublishOutcomeNotice", () => {
  it("warns, not logs, when the tick published nothing and supply is held", () => {
    const notice = formatPublishOutcomeNotice(0, HELD);
    expect(notice.level).toBe("warn");
    expect(notice.line).toContain("supply-starved");
  });

  it("names the held row total and the number of held sources", () => {
    const notice = formatPublishOutcomeNotice(0, HELD);
    expect(notice.line).toContain("37");
    expect(notice.line).toContain(`${HELD.length} source(s)`);
  });

  it("does not claim a source gate is involved when nothing is held", () => {
    const notice = formatPublishOutcomeNotice(0, []);
    expect(notice.level).toBe("log");
    expect(notice.line).not.toContain("source gate");
    expect(notice.line).not.toContain("supply-starved");
  });

  it("keeps the ordinary success line when the tick actually published", () => {
    const notice = formatPublishOutcomeNotice(12, HELD);
    expect(notice.level).toBe("log");
    expect(notice.line).toContain("Successfully synced 12");
  });

  it("never reports a negative publication count as a success", () => {
    expect(formatPublishOutcomeNotice(-1, []).level).toBe("warn");
  });

  it("ignores a non-finite held count instead of printing NaN", () => {
    const notice = formatPublishOutcomeNotice(0, [{ source_id: "lever:hso", held_count: Number.NaN }]);
    expect(notice.line).not.toContain("NaN");
  });
});

// The pure formatters are worthless if the publisher never calls them, and a reviewer
// cannot see that from a green unit test. These assertions read the real module source.
const SOURCE = await Bun.file(new URL("./sync-to-d1.ts", import.meta.url)).text();

/** The one held-cohort query, sliced out so an unrelated GROUP BY cannot satisfy a test. */
function heldCohortSql(): string {
  const start = SOURCE.indexOf("SELECT source_id, COUNT(*) AS held_count");
  expect(start).toBeGreaterThan(-1);
  const end = SOURCE.indexOf("heldRows = held.rows", start);
  expect(end).toBeGreaterThan(start);
  return SOURCE.slice(start, end);
}

describe("sync-to-d1 wiring", () => {
  it("reports the held cohort at warn level, not log", () => {
    expect(SOURCE).toContain("for (const line of formatHeldSupplyNotice(heldRows)) console.warn(line);");
  });

  it("routes both result sites through the outcome notice", () => {
    expect(SOURCE).toContain("const notice = formatPublishOutcomeNotice(0, heldRows);");
    // INCIDENT-0410(w): the second site reports the *confirmed* count, not the count of
    // statements the tick sent, so a batch D1 did not fully apply cannot read as published.
    expect(SOURCE).toContain("const notice = formatPublishOutcomeNotice(confirmedIds.length, heldRows);");
    expect(SOURCE).toContain("if (notice.level === \"warn\") console.warn(notice.line);");
  });

  it("no longer prints the unconditional zero-candidate success line", () => {
    expect(SOURCE).not.toContain("No authorized candidates with status = 'QUALIFIED_READY' found to sync.");
  });

  it("no longer prints an unconditional success line for a zero-row run", () => {
    expect(SOURCE).not.toContain(
      "console.log(`Successfully synced ${syncedIds.length} qualified opportunities from Turso Lake into Production D1!`);",
    );
  });

  it("reads the held cohort per source rather than as one aggregate count", () => {
    const heldQuery = heldCohortSql();
    expect(heldQuery).toContain("COUNT(*) AS held_count");
    expect(heldQuery).toContain("GROUP BY source_id");
  });

  it("keeps the held-cohort query read-only", () => {
    const heldQuery = heldCohortSql();
    expect(heldQuery).not.toMatch(/insert\s+into/i);
    expect(heldQuery).not.toMatch(/update\s+\w+\s+set/i);
    expect(heldQuery).not.toMatch(/delete\s+from/i);
    expect(heldQuery).not.toMatch(/drop\s+/i);
  });
});
