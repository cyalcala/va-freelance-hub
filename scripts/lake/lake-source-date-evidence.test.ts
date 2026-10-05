/**
 * INCIDENT-0410(ar) — one malformed source date threw out of the lake adapter and
 * silently truncated the rest of that tenant's batch.
 *
 * Measured before the fix with real `bun`, over the exact expressions at
 * `scripts/lake/ingest-to-lake.ts:236` (Breezy) and `:456` (Remote OK):
 *
 * | bound value              | pre-fix behaviour                              |
 * |--------------------------|------------------------------------------------|
 * | `"2026-10-01T00:00:00Z"` | `2026-10-01T00:00:00.000Z`                     |
 * | absent / `null` / `""`   | `null` (no throw)                              |
 * | `"not-a-date"`           | **throws `RangeError: Invalid time value`**   |
 *
 * `new Date(x).toISOString()` throws on an unparseable value. Both expressions sit
 * inside the per-item `for` loop, which sits inside the per-source `try`, so one
 * malformed `updated_at` / `date` field:
 *
 * 1. aborted every remaining posting of that tenant's batch, and
 * 2. skipped `markRawProcessed`, leaving the raw observation permanently unprocessed.
 *
 * That is a silent whole-batch supply loss with no error count anywhere — the P0
 * INCIDENT-0410 failure mode in miniature. It is also a date-honesty hazard: the
 * only ways to avoid the throw were to drop the posting or substitute `now()`, and
 * `now` is exactly what CONSTITUTION §1.3 #2 and
 * `unknown_date_policy: retain-unknown-do-not-publish` forbid.
 *
 * These cases drive the real exports and the real `processAndRefineCandidate` with
 * a recording client, so they assert the value the lake actually binds and the
 * arguments it actually sends — not a restatement of the rule.
 */
import { describe, expect, it } from "bun:test";
import {
  breezyAgencyCandidateDraft,
  processAndRefineCandidate,
  remoteOkCandidateDraft,
  sourcePostedAtOrNull,
} from "./ingest-to-lake";

const AGENCY = { id: "breezy:20four7va", name: "20Four7VA" };
const BREEZY_URL = "https://20four7va.breezy.hr/job/1000000000000000";
const REMOTE_OK_URL = "https://remoteok.com/remote-jobs/annotator-1";

/** A Breezy posting whose `updated_at` carries whatever the API actually sent. */
function breezyPosting(updatedAt: unknown) {
  return { name: "Virtual Assistant", url: BREEZY_URL, updated_at: updatedAt };
}

describe("a malformed source date binds unknown instead of throwing (INCIDENT-0410(ar))", () => {
  it("returns null for an unparseable value rather than propagating the RangeError", () => {
    expect(sourcePostedAtOrNull("not-a-date")).toBeNull();
    expect(sourcePostedAtOrNull("2026-13-45T99:99:99Z")).toBeNull();
  });

  it("returns null for absent, empty and non-date values", () => {
    for (const absent of [undefined, null, "", "   ", {}, [], true, 0, Number.NaN]) {
      expect(sourcePostedAtOrNull(absent as never)).toBeNull();
    }
  });

  it("normalises a real source date to ISO, exactly as before", () => {
    expect(sourcePostedAtOrNull("2026-10-01T00:00:00Z")).toBe("2026-10-01T00:00:00.000Z");
    expect(sourcePostedAtOrNull("2026-10-01T00:00:00+08:00")).toBe("2026-09-30T16:00:00.000Z");
  });

  it("never substitutes the current time for an unusable value", () => {
    // The forbidden alternative: `postedAt ?? new Date().toISOString()`.
    const before = Date.now();
    const bound = sourcePostedAtOrNull("not-a-date");
    const after = Date.now();
    expect(bound).toBeNull();
    // A `now` substitution would land inside this window as an ISO string.
    expect(bound === null || Date.parse(bound as string) > before).toBe(true);
    expect(bound === null || Date.parse(bound as string) <= after).toBe(true);
  });

  it("does not let one malformed posting abort the rest of its tenant's batch", () => {
    // The behavioural consequence: the pre-fix loop threw on posting 2 and postings
    // 3-5 were never mapped at all. Drive the real mapper over the real batch.
    const batch = [
      breezyPosting("2026-10-01T00:00:00Z"),
      breezyPosting("not-a-date"),
      breezyPosting("2026-10-02T00:00:00Z"),
      breezyPosting(""),
      breezyPosting("2026-10-03T00:00:00Z"),
    ];

    let mapped = 0;
    let threw: unknown = null;
    try {
      for (const posting of batch) {
        if (!breezyAgencyCandidateDraft(posting, AGENCY)) continue;
        mapped++;
      }
    } catch (error) {
      threw = error;
    }

    expect(threw).toBeNull();
    // Pre-fix this was 2: the throw on posting 2 ended the loop.
    expect(mapped).toBe(5);
  });

  it("keeps the malformed posting itself, with an unknown date, rather than dropping it", () => {
    const draft = breezyAgencyCandidateDraft(breezyPosting("not-a-date"), AGENCY)!;
    expect(draft).not.toBeNull();
    expect(draft.postedAt).toBeNull();
    // Everything else the source said is still carried.
    expect(draft.sourceUrl).toBe(BREEZY_URL);
    expect(draft.title).toBe("Virtual Assistant");
  });

  it("falls back to created_at when updated_at is the unusable one", () => {
    const draft = breezyAgencyCandidateDraft(
      {
        name: "Virtual Assistant",
        url: BREEZY_URL,
        updated_at: "not-a-date",
        created_at: "2026-09-01T00:00:00Z",
      },
      AGENCY,
    )!;
    expect(draft.postedAt).toBe("2026-09-01T00:00:00.000Z");
  });

  it("prefers a usable updated_at over created_at, as before", () => {
    const draft = breezyAgencyCandidateDraft(
      {
        name: "Virtual Assistant",
        url: BREEZY_URL,
        updated_at: "2026-10-01T00:00:00Z",
        created_at: "2026-09-01T00:00:00Z",
      },
      AGENCY,
    )!;
    expect(draft.postedAt).toBe("2026-10-01T00:00:00.000Z");
  });

  it("carries the malformed posting into the lake with SQL NULL, never a fabricated date", async () => {
    const statements: Array<{ sql: string; args: unknown[] }> = [];
    const client = {
      execute: async (statement: { sql: string; args?: unknown[] }) => {
        statements.push({ sql: statement.sql, args: statement.args ?? [] });
        return { rows: [] };
      },
    };
    const stats = { totalExtracted: 0, duplicates: 0, excluded: 0, qualifiedReady: 0, ambiguous: 0 };

    const draft = breezyAgencyCandidateDraft(breezyPosting("not-a-date"), AGENCY)!;
    await processAndRefineCandidate(client as never, 1, draft, stats);

    const insert = statements.find((s) =>
      new RegExp(["INSERT", "INTO", "lake_candidate_jobs"].join("\\s+"), "i").test(s.sql)
    );
    expect(insert).toBeDefined();
    // `posted_at` is bind index 10 in the shared lake_candidate_jobs INSERT.
    expect(insert!.args[10]).toBeNull();
    expect(stats.totalExtracted).toBe(1);
  });

  it("stores the Remote OK posting whose date is malformed, keeping the rest of its batch", async () => {
    // Same defect, second copy: `ingest-to-lake.ts:456` bound
    // `item.date ? new Date(item.date).toISOString() : null` inline. The Remote OK
    // adapter shares the same helper, so the rule cannot fork per adapter.
    const statements: Array<{ sql: string; args: unknown[] }> = [];
    const client = {
      execute: async (statement: { sql: string; args?: unknown[] }) => {
        statements.push({ sql: statement.sql, args: statement.args ?? [] });
        return { rows: [] };
      },
    };
    const stats = { totalExtracted: 0, duplicates: 0, excluded: 0, qualifiedReady: 0, ambiguous: 0 };

    const batch = ["2026-10-01T00:00:00Z", "not-a-date", "2026-10-03T00:00:00Z"];
    let mapped = 0;
    let threw: unknown = null;
    try {
      for (const [index, date] of batch.entries()) {
        const draft = remoteOkCandidateDraft({
          position: `Annotator ${index}`,
          url: `${REMOTE_OK_URL}-${index}`,
          location: "Worldwide",
          date,
        });
        if (!draft) continue;
        mapped++;
        await processAndRefineCandidate(client as never, 1, draft, stats);
      }
    } catch (error) {
      threw = error;
    }

    expect(threw).toBeNull();
    // Pre-fix the loop threw on the second posting and the third was never mapped.
    expect(mapped).toBe(3);
    expect(stats.totalExtracted).toBe(3);
    const inserts = statements.filter((s) =>
      new RegExp(["INSERT", "INTO", "lake_candidate_jobs"].join("\\s+"), "i").test(s.sql)
    );
    expect(inserts).toHaveLength(3);
    expect(inserts.map((s) => s.args[10])).toEqual([
      "2026-10-01T00:00:00.000Z",
      null,
      "2026-10-03T00:00:00.000Z",
    ]);
  });

  it("skips a Remote OK posting the source did not identify, rather than inventing one", () => {
expect(remoteOkCandidateDraft({ url: REMOTE_OK_URL })).toBeNull();
expect(remoteOkCandidateDraft({ position: "Annotator" })).toBeNull();
    expect(remoteOkCandidateDraft(null as never)).toBeNull();
    // Whitespace is not an identification: the pre-fix guard was a bare truthiness
    // check, so a blank `position`/`url` produced a draft that the shared intake
    // then counted as an excluded candidate.
    expect(remoteOkCandidateDraft({ position: "   ", url: REMOTE_OK_URL })).toBeNull();
    expect(remoteOkCandidateDraft({ position: "Annotator", url: "   " })).toBeNull();
    expect(remoteOkCandidateDraft({ position: 42, url: REMOTE_OK_URL })).toBeNull();
  });

  it("still carries the Remote OK posting's own fields verbatim", () => {
    const draft = remoteOkCandidateDraft({
      position: "Video Data Annotator",
      url: REMOTE_OK_URL,
      company: "iMerit Technology",
      tags: ["machine learning"],
      location: "Worldwide",
      apply_url: "https://remoteok.com/apply/1",
      date: "2026-10-01T00:00:00Z",
    })!;
    expect(draft.sourceId).toBe("remote-ok");
    expect(draft.title).toBe("Video Data Annotator");
    expect(draft.company).toBe("iMerit Technology");
    expect(draft.category).toBe("machine learning");
    expect(draft.locationRaw).toBe("Worldwide");
    expect(draft.applicationUrl).toBe("https://remoteok.com/apply/1");
    expect(draft.postedAt).toBe("2026-10-01T00:00:00.000Z");
  });
});