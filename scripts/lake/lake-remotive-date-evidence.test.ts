/**
 * INCIDENT-0410(as) — the last reachable copy of the INCIDENT-0410(ar) date-throw
 * class, in the Remotive full-corpus adapter.
 *
 * Measured before the fix with real `bun`, over the exact expression at
 * `scripts/lake/remotive-full.ts:228-230` driven across a five-posting batch
 * (`.shift/probe-as-red.ts`):
 *
 * | `publication_date`     | pre-fix behaviour                            |
 * |------------------------|---------------------------------------------|
 * | `"2026-10-01T00:00:00Z"` | `2026-10-01T00:00:00.000Z`                 |
 * | `null` / `""`          | `null` (no throw)                            |
 * | `"not-a-date"`         | **throws `RangeError: Invalid Date`**       |
 * | `"2026-13-45T99:99:99Z"` | **throws `RangeError: Invalid Date`**       |
 *
 * Batch result before the fix: **1 of 5 postings reached the lake**, and the
 * `markRawProcessed(client, rawObsId)` at `remotive-full.ts:237` — which sits *after*
 * the loop — never ran, so the raw observation of that whole category page stayed
 * permanently unprocessed. The `catch` at `:238` logged the RangeError and moved on to
 * the next category, so nothing anywhere counted it as a loss.
 *
 * That is the P0 INCIDENT-0410 failure mode in miniature, and the same defect session 18
 * fixed for Breezy and Remote OK. The two ways to avoid the throw were to drop the
 * posting — discarding real evidence the source did supply — or to substitute `now()`,
 * which is exactly what CONSTITUTION §1.3 #2 and
 * `unknown_date_policy: retain-unknown-do-not-publish` forbid. The third option, which is
 * the one taken here, is to bind the honest `null`.
 *
 * These cases drive the real `remotiveCandidateDraft` and the real
 * `processAndRefineCandidate` against a recording client, so they assert the value the
 * lake actually binds and the arguments it actually sends.
 */
import { describe, expect, it } from "bun:test";
import { processAndRefineCandidate, remotiveCandidateDraft } from "./ingest-to-lake";

const JOBS_URL = "https://remotive.com/api/remote-jobs";

/** A Remotive posting carrying whatever the API actually put in each field. */
function remotivePosting(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    url: `${JOBS_URL}?j=1`,
    title: "Virtual Assistant",
    company_name: "Twenty Four Seven VA",
    category: "virtual-assistant",
    candidate_required_location: "Worldwide",
    description: "Support inbox coverage.",
    tags: ["va"],
    ...overrides,
  };
}

/** Records every statement the shared lake intake sends, with its bind arguments. */
function recordingClient() {
  const statements: Array<{ sql: string; args: unknown[] }> = [];
  return {
    statements,
    execute: async (statement: { sql: string; args?: unknown[] }) => {
      statements.push({ sql: statement.sql, args: statement.args ?? [] });
      return { rows: [] };
    },
  };
}

const INSERTS = (statements: Array<{ sql: string }>) =>
  statements.filter((s) =>
    new RegExp(["INSERT", "INTO", "lake_candidate_jobs"].join("\\s+"), "i").test(s.sql)
  );

describe("the Remotive adapter binds an unusable publication_date as unknown, not a throw (INCIDENT-0410(as))", () => {
  it("keeps a posting whose publication_date is unparseable, with an unknown date", () => {
    const draft = remotiveCandidateDraft(remotivePosting({ publication_date: "not-a-date" }), "remotive", "all")!;
    expect(draft).not.toBeNull();
    expect(draft.postedAt).toBeNull();
    // Everything else the source said is still carried.
    expect(draft.sourceUrl).toBe(`${JOBS_URL}?j=1`);
    expect(draft.title).toBe("Virtual Assistant");
  });

  it("binds null for absent, empty, blank and out-of-range dates", () => {
    for (const absent of [undefined, null, "", "   ", "2026-13-45T99:99:99Z", 0, {}]) {
      const draft = remotiveCandidateDraft(
        remotivePosting({ publication_date: absent as never }),
        "remotive",
        "all",
      )!;
      expect(draft.postedAt).toBeNull();
    }
  });

  it("normalises a real Remotive date to ISO, exactly as before", () => {
    const draft = remotiveCandidateDraft(
      remotivePosting({ publication_date: "2026-10-01T00:00:00Z" }),
      "remotive",
      "all",
    )!;
    expect(draft.postedAt).toBe("2026-10-01T00:00:00.000Z");
  });

  it("never substitutes the current time for an unusable date", () => {
    // The forbidden alternative: `postedAt ?? new Date().toISOString()`.
    const before = Date.now();
    const bound = remotiveCandidateDraft(
      remotivePosting({ publication_date: "not-a-date" }),
      "remotive",
      "all",
    )!.postedAt;
    const after = Date.now();
    expect(bound).toBeNull();
    expect(bound === null || Date.parse(bound) > before).toBe(true);
    expect(bound === null || Date.parse(bound) <= after).toBe(true);
  });

  it("does not let one malformed posting abort the rest of its category batch", async () => {
    // The behavioural consequence: pre-fix, posting 2 threw and postings 3-5 were never
    // mapped, and the loop never reached markRawProcessed.
    const client = recordingClient();
    const stats = { totalExtracted: 0, duplicates: 0, excluded: 0, qualifiedReady: 0, ambiguous: 0 };
    const batch = [
      "2026-10-01T00:00:00Z",
      "not-a-date",
      "",
      "2026-10-03T00:00:00Z",
      "2026-13-45T99:99:99Z",
    ];

    let mapped = 0;
    let threw: unknown = null;
    try {
      for (const [index, publicationDate] of batch.entries()) {
        const draft = remotiveCandidateDraft(
          remotivePosting({ id: index, url: `${JOBS_URL}?j=${index}`, publication_date: publicationDate }),
          "remotive",
          "all",
        );
        if (!draft) continue;
        mapped++;
        await processAndRefineCandidate(client as never, 1, draft, stats);
      }
    } catch (error) {
      threw = error;
    }

    expect(threw).toBeNull();
    // Pre-fix this was 1: the throw on posting 2 ended the loop.
    expect(mapped).toBe(5);
    expect(stats.totalExtracted).toBe(5);
    // `posted_at` is bind index 10 in the shared lake_candidate_jobs INSERT.
    expect(INSERTS(client.statements).map((s) => s.args[10])).toEqual([
      "2026-10-01T00:00:00.000Z",
      null,
      null,
      "2026-10-03T00:00:00.000Z",
      null,
    ]);
  });

  it("skips a posting the source did not identify, rather than inventing one", () => {
    // The pre-fix guard was a bare truthiness check, so a blank `url`/`title` produced a
    // draft the shared intake then counted as an excluded candidate.
    expect(remotiveCandidateDraft(remotivePosting({ url: undefined }), "remotive", "all")).toBeNull();
    expect(remotiveCandidateDraft(remotivePosting({ title: undefined }), "remotive", "all")).toBeNull();
    expect(remotiveCandidateDraft(remotivePosting({ url: "   " }), "remotive", "all")).toBeNull();
    expect(remotiveCandidateDraft(remotivePosting({ title: "  " }), "remotive", "all")).toBeNull();
    expect(remotiveCandidateDraft(remotivePosting({ title: 42 as never }), "remotive", "all")).toBeNull();
    expect(remotiveCandidateDraft(null as never, "remotive", "all")).toBeNull();
  });

  it("carries the source's own fields verbatim, including the category being fetched", () => {
    const draft = remotiveCandidateDraft(
      remotivePosting({ category: undefined, publication_date: "2026-10-01T00:00:00Z" }),
      "remotive",
      "customer-support",
    )!;
    expect(draft.sourceId).toBe("remotive");
    expect(draft.sourcePlatform).toBe("Remotive");
    expect(draft.title).toBe("Virtual Assistant");
    expect(draft.company).toBe("Twenty Four Seven VA");
    // The API omitted `category`, so the category being fetched is the honest label.
    expect(draft.category).toBe("customer-support");
    expect(draft.locationRaw).toBe("Worldwide");
    expect(draft.applicationUrl).toBe(`${JOBS_URL}?j=1`);
    expect(draft.tags).toEqual(["va"]);
  });

  it("prefers the API's own category over the fetched one, as before", () => {
    const draft = remotiveCandidateDraft(
      remotivePosting({ category: "design" }),
      "remotive",
      "all",
    )!;
    expect(draft.category).toBe("design");
  });

  it("keeps the pre-existing fallbacks unchanged", () => {
    // `locationRaw` falls back to "Remote" exactly as before: session 16 measured a bare
    // "Remote" as verdict-neutral against the real geoGate, so this unit does not touch it.
    const draft = remotiveCandidateDraft(
      remotivePosting({
        candidate_required_location: undefined,
        company_name: undefined,
        description: undefined,
        tags: undefined,
      }),
      "remotive",
      "all",
    )!;
    expect(draft.locationRaw).toBe("Remote");
    expect(draft.company).toBe("Unknown");
    expect(draft.description).toBe("");
    expect(draft.tags).toEqual([]);
  });

  it("binds an empty tag list when the API sends something that is not a list", () => {
    // A bare truthiness check would bind the string itself, and the lake would then
    // store a tag column that is not a list.
    for (const notAList of ["va", 7, { slug: "va" }]) {
      const draft = remotiveCandidateDraft(
        remotivePosting({ tags: notAList as never }),
        "remotive",
        "all",
      )!;
      expect(draft.tags).toEqual([]);
    }
  });
});
