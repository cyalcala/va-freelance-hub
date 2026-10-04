/**
 * INCIDENT-0410(aa-47) — the lake intake plane stored a posting URL verbatim
 * while the scraper plane lowercased its host, and D1's UNIQUE(source_url) plus
 * the content_hash index are both case-sensitive. Measured against prod D1 on
 * 2026-10-04: 9 duplicate groups / 18 active rows, every pair the same
 * canonical opening with `remoteok.com` on one side and `remoteOK.com` on the
 * other, each with its own D1 id and its own content_hash.
 *
 * These cases drive the real `processAndRefineCandidate` intake function
 * against a recording client, so they assert the SQL and the bind arguments the
 * lake actually sends — not a restatement of the rule.
 */
import { describe, expect, it } from "bun:test";
import { processAndRefineCandidate, type CandidateDraft } from "./ingest-to-lake";

interface RecordedStatement {
  sql: string;
  args: unknown[];
}

function recordingClient(existingRows: Record<string, unknown>[] = []) {
  const statements: RecordedStatement[] = [];
  const client = {
    execute: async (statement: { sql: string; args?: unknown[] }) => {
      statements.push({ sql: statement.sql, args: statement.args ?? [] });
      const sql = statement.sql;
      if (/^\s*SELECT/i.test(sql)) return { rows: existingRows };
      return { rows: [] };
    },
  };
  return { client, statements };
}

const MIXED_CASE_PATH =
  "/remote-jobs/remote-video-data-annotator-imerit-technology-1137428";
const MIXED_CASE_URL = `https://remoteOK.com${MIXED_CASE_PATH}`;

function draft(overrides: Partial<CandidateDraft> = {}): CandidateDraft {
  return {
    sourceId: "remote-ok",
    sourcePlatform: "RemoteOK",
    sourceUrl: MIXED_CASE_URL,
    title: "Video Data Annotator",
    company: "iMerit Technology",
    category: "other",
    locationRaw: "Worldwide",
    description: "Annotate video data.",
    applicationUrl: MIXED_CASE_URL,
    postedAt: "2026-09-23T21:40:19.000Z",
    tags: ["remote"],
    ...overrides,
  };
}

function freshStats() {
  return { totalExtracted: 0, duplicates: 0, excluded: 0, qualifiedReady: 0, ambiguous: 0 };
}

function findStatement(statements: RecordedStatement[], pattern: RegExp) {
  return statements.find((statement) => pattern.test(statement.sql));
}

describe("lake intake canonical identity (INCIDENT-0410(aa-47))", () => {
  it("stores the canonical lowercased source_url, never the mixed-case host", async () => {
    const { client, statements } = recordingClient();
    const stats = freshStats();

    await processAndRefineCandidate(client as never, 1, draft(), stats);

    const insert = findStatement(statements, /INSERT INTO lake_candidate_jobs/);
    expect(insert).toBeDefined();
    const args = insert!.args;
    expect(args[3]).toBe(`https://remoteok.com${MIXED_CASE_PATH}`);
    expect(args.some((value) => typeof value === "string" && value.includes("remoteOK.com"))).toBe(
      false,
    );
  });

  it("records the sighting with the canonical URL too, so provenance cannot fork", async () => {
    const { client, statements } = recordingClient([{ id: 141, status: "QUALIFIED_READY", sighting_count: 1 }]);
    const stats = freshStats();

    await processAndRefineCandidate(client as never, 1, draft(), stats);

    const sighting = findStatement(statements, /INSERT INTO lake_sightings/);
    expect(sighting).toBeDefined();
    expect(sighting!.args[sighting!.args.length - 1]).toBe(`https://remoteok.com${MIXED_CASE_PATH}`);
  });

  it("matches an ALREADY-STORED mixed-case row instead of forking a new candidate", async () => {
    // 146 live lake_candidate_jobs rows carry the mixed-case host today, so the
    // dedup lookup has to recognize them or the fix would create a fresh pair on
    // the next ingest of the same posting.
    const { client, statements } = recordingClient([
      { id: 141, status: "QUALIFIED_READY", sighting_count: 1 },
    ]);
    const stats = freshStats();

    await processAndRefineCandidate(client as never, 1, draft(), stats);

    const select = findStatement(statements, /^\s*SELECT id, status, sighting_count/);
    expect(select).toBeDefined();
    expect(select!.sql).toMatch(/lower\(source_url\)/);
    expect(stats.duplicates).toBe(1);
    expect(findStatement(statements, /INSERT INTO lake_candidate_jobs/)).toBeUndefined();
  });

  it("two host casings of one posting reach the lake as one candidate", async () => {
    const { client, statements } = recordingClient();
    const stats = freshStats();

    await processAndRefineCandidate(client as never, 1, draft(), stats);
    await processAndRefineCandidate(
      client as never,
      1,
      draft({
        sourceUrl: `https://remoteok.com${MIXED_CASE_PATH}`,
        applicationUrl: `https://remoteok.com${MIXED_CASE_PATH}`,
      }),
      stats,
    );

    const inserts = statements.filter((statement) => /INSERT INTO lake_candidate_jobs/.test(statement.sql));
    expect(inserts).toHaveLength(2);
    const SOURCE_URL_INDEX = 3;
    const FINGERPRINT_INDEX = 11;
    // Same canonical identity -> same source_url and same fingerprint, so a
    // re-ingest of the mixed-case twin is recognizable instead of a new row.
    expect(inserts[0]!.args[SOURCE_URL_INDEX]).toBe(inserts[1]!.args[SOURCE_URL_INDEX]);
    expect(inserts[0]!.args[FINGERPRINT_INDEX]).toBe(inserts[1]!.args[FINGERPRINT_INDEX]);
  });

  it("never rewrites a URL that is not an absolute http(s) URL, so no candidate is dropped", async () => {
    const { client, statements } = recordingClient();
    const stats = freshStats();
    const relative = "jobs/12345";

    await processAndRefineCandidate(
      client as never,
      1,
      draft({ sourceUrl: relative, applicationUrl: relative }),
      stats,
    );

    const insert = findStatement(statements, /INSERT INTO lake_candidate_jobs/);
    expect(insert!.args).toContain(relative);
  });
});