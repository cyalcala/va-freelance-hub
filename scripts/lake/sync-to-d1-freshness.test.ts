import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  classifyCandidateFreshness,
  formatStaleSupplyNotice,
  isSyncableCandidate,
  MAX_DAYS_SINCE_POST,
  type StaleWithheldRow,
} from "./sync-to-d1";

/**
 * INCIDENT-0410(x) — the lake→D1 publisher had no freshness ceiling at all.
 *
 * VERIFIED_CODE: `CANDIDATE_SELECT` filtered on `status`, `ph_eligibility` and
 * `source_id` only, and the candidate loop asked `isSyncableCandidate` (title +
 * source_url) and `buildSyncSql` (eligibility + honest NULL date) but never once
 * consulted `posted_at`. `freshness.max_days_since_post` had no consumer on the
 * publisher path at all — CONSTITUTION §8.4 C19 `UNENFORCED — PAPER RISK`, and
 * CONSTITUTION §3.2 condition 5 (Freshness Compliance) unenforced at the exact
 * point that writes `is_active = 1`.
 *
 * VERIFIED_QUERY (read-only, 2026-10-04 ~08:45Z): 60 QUALIFIED_READY rows are
 * live in the lake, all `eligible_verified`/`eligible_likely`, across 17 source_ids.
 * Their `posted_at` values below are the real ones, so a permissive default would
 * have published a 2022 posting as active supply.
 */

const NOW = new Date("2026-10-04T09:00:00.000Z");

/** The real `posted_at` values read from the live lake, plus the window edge cases. */
const REAL = {
  decilegroup: "2022-02-16T19:45:10.612Z",
  supabase: "2025-03-20T18:51:09.252Z",
  deliverect: "2026-03-09T09:44:36.785Z",
  lwolf: "2025-01-07T08:36:33.206Z",
  ninetySeconds: "2026-09-29T08:53:07.598Z",
  trainingTheStreet: "2026-09-18T09:30:58.000Z",
} as const;

describe("classifyCandidateFreshness", () => {
  it("marks a real four-year-old lake posting stale against the accepted 30-day window", () => {
    const verdict = classifyCandidateFreshness(REAL.decilegroup, NOW);
    expect(verdict.kind).toBe("stale");
    expect(verdict.kind === "stale" && verdict.ageDays).toBeGreaterThan(MAX_DAYS_SINCE_POST);
  });

  it("marks every measured stale posting stale, not just the oldest one", () => {
    for (const postedAt of [REAL.supabase, REAL.deliverect, REAL.lwolf]) {
      expect(classifyCandidateFreshness(postedAt, NOW).kind).toBe("stale");
    }
  });

  it("keeps a posting from two weeks ago inside the window", () => {
    const verdict = classifyCandidateFreshness(REAL.ninetySeconds, NOW);
    expect(verdict.kind).toBe("within_window");
    expect(verdict.kind === "within_window" && verdict.ageDays).toBeGreaterThan(0);
  });

  it("keeps a posting from just inside the window inside it", () => {
    // 2026-09-18 -> 2026-10-04 is 15.98 days: inside 30, and a boundary-sensitive
    // implementation that rounds to whole days must not flip it either way.
    expect(classifyCandidateFreshness(REAL.trainingTheStreet, NOW).kind).toBe("within_window");
  });

  it("treats exactly the window boundary as inside, and one millisecond past it as stale", () => {
    const boundary = new Date(NOW.getTime() - MAX_DAYS_SINCE_POST * 24 * 60 * 60 * 1000);
    expect(classifyCandidateFreshness(boundary.toISOString(), NOW).kind).toBe("within_window");
    expect(classifyCandidateFreshness(new Date(boundary.getTime() - 1).toISOString(), NOW).kind).toBe("stale");
  });

  it("reports a missing date as unknown rather than defaulting it to fresh or to now", () => {
    for (const missing of [null, undefined, "", "   "]) {
      const verdict = classifyCandidateFreshness(missing, NOW);
      expect(verdict.kind).toBe("unknown_date");
    }
  });

  it("reports an unparseable date as unknown, keeping the raw value for the operator", () => {
    const verdict = classifyCandidateFreshness("not-a-date", NOW);
    expect(verdict.kind).toBe("unknown_date");
    expect(verdict.kind === "unknown_date" && verdict.raw).toBe("not-a-date");
  });

  it("does not invent an age for an unknown date", () => {
    const verdict = classifyCandidateFreshness(null, NOW);
    expect(verdict).toEqual({ kind: "unknown_date", raw: null });
  });

  it("never reports a negative age for a future-dated posting", () => {
    const verdict = classifyCandidateFreshness("2026-11-01T00:00:00.000Z", NOW);
    expect(verdict.kind).toBe("within_window");
    expect(verdict.kind === "within_window" && verdict.ageDays).toBe(0);
  });

  it("refuses a negative or fractional maxAgeDays instead of silently widening the window", () => {
    expect(() => classifyCandidateFreshness(REAL.ninetySeconds, NOW, -1)).toThrow(RangeError);
    expect(() => classifyCandidateFreshness(REAL.ninetySeconds, NOW, 1.5)).toThrow(RangeError);
  });

  it("mirrors the accepted parameter instead of inventing a window", () => {
    expect(MAX_DAYS_SINCE_POST).toBe(30);
    const yaml = readFileSync(join(import.meta.dir, "..", "..", "docs", "ACCEPTED_PARAMETERS.yaml"), "utf-8");
    const accepted = yaml.match(/max_days_since_post:\s*(\d+)/)?.[1];
    expect(accepted).toBe(String(MAX_DAYS_SINCE_POST));
  });
});

describe("formatStaleSupplyNotice", () => {
  const WITHHELD: StaleWithheldRow[] = [
    { source_id: "lever:decilegroup", posted_at: REAL.decilegroup, age_days: 1696 },
    { source_id: "ashby:supabase", posted_at: REAL.supabase, age_days: 562 },
    { source_id: "lever:decilegroup", posted_at: REAL.supabase, age_days: 562 },
  ];

  it("says the cohort was withheld instead of silently dropping it", () => {
    const joined = formatStaleSupplyNotice(WITHHELD).join("\n");
    expect(joined).toContain("3");
    expect(joined).toContain("lever:decilegroup");
    expect(joined.toLowerCase()).toContain("freshness");
  });

  it("names the accepted window so the reason is not a mystery number", () => {
    expect(formatStaleSupplyNotice(WITHHELD).join("\n")).toContain(String(MAX_DAYS_SINCE_POST));
  });

  it("aggregates repeated rows per source and orders the most-withheld first", () => {
    const lines = formatStaleSupplyNotice(WITHHELD);
    expect(lines[0]).toContain("lever:decilegroup");
    expect(lines[0]).toContain("2");
    expect(lines.filter((line) => line.includes("ashby:supabase")).length).toBe(1);
  });

  it("reports the true total even when the per-source detail is capped", () => {
    const lines = formatStaleSupplyNotice(WITHHELD, 1);
    expect(lines[0]).toContain("lever:decilegroup");
    expect(lines.some((line) => line.includes("more source"))).toBe(true);
    expect(lines.join("\n")).toContain("3");
  });

  it("prints nothing when no candidate was withheld", () => {
    expect(formatStaleSupplyNotice([])).toEqual([]);
  });

  it("never emits a line for a source with no withheld rows", () => {
    expect(formatStaleSupplyNotice([{ source_id: "lever:x", posted_at: REAL.supabase, age_days: 0 }]).join("\n"))
      .not.toContain("lever:x");
  });
});

describe("publisher wiring: a stale row cannot reach the public write", () => {
  const source = readFileSync(join(import.meta.dir, "sync-to-d1.ts"), "utf-8");

  it("classifies freshness inside the candidate loop that builds the sync statements", () => {
    const loopStart = source.indexOf("for (const job of candidates) {");
    expect(loopStart).toBeGreaterThan(-1);
    const loopBody = source.slice(loopStart, loopStart + 1200);
    expect(loopBody).toContain("classifyCandidateFreshness");
    expect(loopBody).toContain('verdict.kind === "stale"');
  });

  it("continues past a stale row, so one stale candidate cannot abort the batch", () => {
    const loopStart = source.indexOf("for (const job of candidates) {");
    const loopBody = source.slice(loopStart, loopStart + 1200);
    const staleBranch = loopBody.indexOf('verdict.kind === "stale"');
    expect(staleBranch).toBeGreaterThan(-1);
    expect(loopBody.slice(staleBranch, staleBranch + 400)).toContain("continue;");
  });

  it("records every withheld row, so the per-source notice cannot report an empty cohort", () => {
    // The notice is only as honest as what the loop feeds it. Dropping the record while
    // keeping the `continue` would still block the stale row but report nothing.
    const loopStart = source.indexOf("for (const job of candidates) {");
    const loopBody = source.slice(loopStart, loopStart + 1200);
    expect(loopBody).toContain(
      "staleWithheld.push({ source_id: job.source_id, posted_at: verdict.postedAt, age_days: verdict.ageDays })",
    );
  });

  it("keeps the freshness check ahead of the statement builder, not after it", () => {
    const loopStart = source.indexOf("for (const job of candidates) {");
    const loopBody = source.slice(loopStart, loopStart + 1200);
    expect(loopBody.indexOf("classifyCandidateFreshness")).toBeLessThan(loopBody.indexOf("buildSyncSql"));
  });

  it("reports the withheld cohort at the end of the run", () => {
    // Slice the runner itself: a bare `toContain("formatStaleSupplyNotice")` on the whole
    // file is satisfied by the function's own declaration, so it would not notice the call
    // being deleted from the tick. Verified: mutating the call site fails this test.
    const runnerStart = source.indexOf("export async function syncQualifiedJobsToD1");
    expect(runnerStart).toBeGreaterThan(-1);
    const runner = source.slice(runnerStart, source.indexOf("if (import.meta.main)"));
    expect(runner).toContain("formatStaleSupplyNotice(staleWithheld)");
  });

  it("still refuses an incomplete candidate on the pre-existing minimum-field guard", () => {
    expect(isSyncableCandidate({ title: "  ", source_url: "https://example.test/x" })).toBe(false);
    expect(isSyncableCandidate({ title: "Role", source_url: "https://example.test/x" })).toBe(true);
  });
});