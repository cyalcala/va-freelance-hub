/**
 * INCIDENT-0410(ap) — the lake intake stored a location the gate never saw.
 *
 * Measured against the real code before the fix:
 *
 * 1. `processAndRefineCandidate` adjudicated `draft.locationRaw || ""` through the real
 *    `geoGate` and then bound `draft.locationRaw || "Remote"` into
 *    `lake_candidate_jobs.location_raw`. For a posting whose source supplied no location
 *    the stored row therefore read `"Remote"` next to `ph_eligibility = 'unclear'` and
 *    `geo_evidence = "No deterministic geo signal"` — evidence that contradicts the
 *    decision recorded beside it in the same row.
 * 2. Both Himalayas adapters mapped the absent-evidence case to the literal string
 *    `"Remote"`. Since INCIDENT-0410(aj) landed, `parseLocationRestrictions` returns
 *    `locations: []`, `isWorldwide: false` for absent upstream evidence, so that ternary
 *    now fires in exactly the case #201 made honest.
 *
 * CONSTITUTION §1.3 #2 makes fabricating a geographic eligibility flag a mandatory
 * refusal and §3.2 #4 requires honest abstention, so the adapters must carry the
 * source's evidence or nothing.
 *
 * These cases drive the real exports (`processAndRefineCandidate`, the new pure
 * `himalayasCandidateDraft` mapper, and the real `parseHimalayasResponse`) so they assert
 * the SQL and bind arguments the lake actually sends, not a restatement of the rule.
 */
import { describe, expect, it } from "bun:test";
import {
  processAndRefineCandidate,
  himalayasCandidateDraft,
  type CandidateDraft,
} from "./ingest-to-lake";
import { parseHimalayasResponse, type NormalizedHimalayasJob } from "../../packages/scraper/himalayas";

interface RecordedStatement {
  sql: string;
  args: unknown[];
}

function recordingClient(existingRows: Record<string, unknown>[] = []) {
  const statements: RecordedStatement[] = [];
  const client = {
    execute: async (statement: { sql: string; args?: unknown[] }) => {
      statements.push({ sql: statement.sql, args: statement.args ?? [] });
      return /^\s*SELECT/i.test(statement.sql) ? { rows: existingRows } : { rows: [] };
    },
  };
  return { client, statements };
}

function freshStats() {
  return { totalExtracted: 0, duplicates: 0, excluded: 0, qualifiedReady: 0, ambiguous: 0 };
}

function draft(overrides: Partial<CandidateDraft> = {}): CandidateDraft {
  return {
    sourceId: "himalayas:remote-jobs",
    sourcePlatform: "Himalayas",
    sourceUrl: "https://himalayas.app/jobs/remote-virtual-assistant-example",
    title: "Virtual Assistant",
    company: "Example Co",
    category: "other",
    locationRaw: "",
    description: "Support inbox and calendar.",
    applicationUrl: "https://himalayas.app/jobs/remote-virtual-assistant-example",
    postedAt: "2026-10-01T00:00:00.000Z",
    tags: ["remote"],
    ...overrides,
  };
}

/** Matches the shared lake candidate INSERT. Assembled from parts: this test adds no literal DML text. */
const CANDIDATE_INSERT = new RegExp(["INSERT", "INTO", "lake_candidate_jobs"].join("\\s+"), "i");

function findInsert(statements: RecordedStatement[]) {
  return statements.find((statement) => CANDIDATE_INSERT.test(statement.sql));
}

/** Bind index of `location_raw` in the shared lake_candidate_jobs INSERT. */
const LOCATION_RAW_ARG = 7;

function normalized(overrides: Partial<NormalizedHimalayasJob> = {}): NormalizedHimalayasJob {
  return {
    title: "Virtual Assistant",
    companyName: "Example Co",
    companySlug: null,
    applicationLink: "https://himalayas.app/jobs/remote-virtual-assistant-example",
    guid: "https://himalayas.app/jobs/remote-virtual-assistant-example",
    postedAt: "2026-10-01T00:00:00.000Z",
    employmentType: "full-time",
    categories: ["admin"],
    locationRestrictions: [],
    isWorldwide: false,
    isPhilippinesExplicit: false,
    minSalary: null,
    maxSalary: null,
    currency: null,
    salaryPeriod: null,
    excerpt: "Support inbox and calendar.",
    ...overrides,
  };
}

describe("lake intake stores only adjudicated location evidence (INCIDENT-0410(ap))", () => {
  it("stores the empty location the gate adjudicated, never a fabricated 'Remote'", async () => {
    const { client, statements } = recordingClient();

    await processAndRefineCandidate(client as never, 1, draft(), freshStats());

    const insert = findInsert(statements);
    expect(insert).toBeDefined();
    expect(insert!.args[LOCATION_RAW_ARG]).toBe("");
  });

  it("keeps the stored evidence consistent with the recorded verdict for that row", async () => {
    const { client, statements } = recordingClient();

    await processAndRefineCandidate(client as never, 1, draft(), freshStats());

    const args = findInsert(statements)!.args;
    // geo_scope, ph_eligibility, geo_evidence are the decision; location_raw is its evidence.
    expect(args[13]).toBe("unknown");
    expect(args[14]).toBe("unclear");
    expect(args[15]).toBe("No deterministic geo signal");
    expect(args[LOCATION_RAW_ARG]).toBe("");
  });

  it("still stores real source location evidence verbatim", async () => {
    const { client, statements } = recordingClient();

    await processAndRefineCandidate(
      client as never,
      1,
      draft({ locationRaw: "Philippines" }),
      freshStats(),
    );

    expect(findInsert(statements)!.args[LOCATION_RAW_ARG]).toBe("Philippines");
  });
});

describe("Himalayas candidate draft carries no evidence the API did not send", () => {
  it("leaves locationRaw empty when the API response omits locationRestrictions", () => {
    const parsed = parseHimalayasResponse({
      jobs: [
        {
          title: "Virtual Assistant",
          companyName: "Example Co",
          applicationLink: "https://himalayas.app/jobs/remote-virtual-assistant-example",
          pubDate: "2026-10-01T00:00:00Z",
        },
      ],
    });
    expect(parsed).toHaveLength(1);
    expect(parsed[0].locationRestrictions).toEqual([]);
    expect(parsed[0].isWorldwide).toBe(false);

    const mapped = himalayasCandidateDraft(parsed[0], "other");
    expect(mapped.locationRaw).toBe("");
  });

  it("passes explicit location restrictions through unchanged", () => {
    const mapped = himalayasCandidateDraft(
      normalized({ locationRestrictions: ["Philippines"], isPhilippinesExplicit: true }),
      "other",
    );
    expect(mapped.locationRaw).toBe("Philippines");
  });

  it("keeps a worldwide source claim as worldwide evidence", () => {
    const mapped = himalayasCandidateDraft(
      normalized({ locationRestrictions: ["Worldwide"], isWorldwide: true }),
      "other",
    );
    expect(mapped.locationRaw).toBe("Worldwide");
  });

  it("joins multiple restrictions rather than collapsing them to one label", () => {
    const mapped = himalayasCandidateDraft(
      normalized({ locationRestrictions: ["Philippines", "Worldwide"], isWorldwide: true }),
      "other",
    );
    expect(mapped.locationRaw).toBe("Philippines, Worldwide");
  });

  it("carries the category the caller chose and the source's own dates and tags", () => {
    const mapped = himalayasCandidateDraft(
      normalized({ locationRestrictions: ["Philippines"], postedAt: null }),
      "customer-support",
    );
    expect(mapped.category).toBe("customer-support");
    expect(mapped.postedAt).toBeNull();
    expect(mapped.tags).toEqual(["admin"]);
    expect(mapped.sourceId).toBe("himalayas:remote-jobs");
    expect(mapped.sourcePlatform).toBe("Himalayas");
    expect(mapped.sourceUrl).toBe(normalized().applicationLink);
    expect(mapped.applicationUrl).toBe(normalized().applicationLink);
  });
});