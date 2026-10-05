/**
 * INCIDENT-0410(aq) — the Breezy VA-agency adapter answered an absent location
 * with the country it wanted to hear.
 *
 * Measured against the real `geoGate` before the fix, for the exact expression
 * at `scripts/lake/ingest-to-lake.ts:519`
 * (`item.location?.name || item.location?.country?.name || (item.location?.is_remote ? "Remote" : "Philippines")`):
 *
 * | Breezy JSON `location`      | bound `location_raw` | real geoGate verdict              |
 * |----------------------------|----------------------|------------------------------------|
 * | absent entirely            | `"Philippines"`      | `eligible_verified` / `ph_only`    |
 * | `{}`                       | `"Philippines"`      | `eligible_verified` / `ph_only`    |
 * | `{ is_remote: false }`     | `"Philippines"`      | `eligible_verified` / `ph_only`    |
 * | `{ is_remote: true }`      | `"Remote"`           | `unclear` / `unknown`              |
 * | `{ name: "Manila" }`       | `"Manila"`           | `eligible_verified` / `ph_only`    |
 * | `{ country: { name: "Philippines" } }` | `"Philippines"` | `eligible_verified` / `ph_only` |
 * | `{ country: { name: "United Kingdom" } }` | `"United Kingdom"` | `ineligible` / `country_locked` |
 *
 * So this is not the verdict-neutral `"Remote"` fabrication fixed in
 * INCIDENT-0410(ap): the three absent-evidence branches manufacture the
 * **strongest** eligibility tier the gate can return. A posting the source
 * never located, or one the source explicitly marked `is_remote: false`, was
 * stored as `ph_only` / `eligible_verified` — a fabricated geographic
 * eligibility flag (CONSTITUTION §1.3 #2 mandatory refusal, §3.2 #2 true PH
 * remoteness, §3.2 #4 honest abstention). Every one of the five tenants in this
 * loop is on the D1 publisher's authorized-source list, so such a row reaches
 * its authorized publication path.
 *
 * These cases drive the real export and the real `geoGate`, so they assert the
 * value the lake actually binds and the verdict the gate actually returns.
 */
import { describe, expect, it } from "bun:test";
import {
  breezyAgencyCandidateDraft,
  breezyAgencyLocationRaw,
  processAndRefineCandidate,
} from "./ingest-to-lake";
import { geoGate } from "../../packages/scraper/geoGate";

/** The shape the Breezy adapter actually passes: a posting whose `location` may be absent. */
function agencyPosting(location: unknown) {
  return { location } as never;
}

/** The verdict a stored `location_raw` produces on a plain VA-agency posting. */
function verdictFor(locationRaw: string) {
  return geoGate({
    title: "Virtual Assistant",
    description: "Support inbox and calendar management.",
    locationRaw,
    tags: ["VA", "philippines"],
  });
}

describe("Breezy agency location evidence is the source's own, never an invented country (INCIDENT-0410(aq))", () => {
  it("binds nothing when the posting carries no location object at all", () => {
    expect(breezyAgencyLocationRaw(undefined)).toBe("");
    expect(breezyAgencyLocationRaw(null)).toBe("");
  });

  it("binds nothing when the location object carries no usable field", () => {
    expect(breezyAgencyLocationRaw(agencyPosting({}))).toBe("");
  });

  it("binds nothing when the source explicitly says the job is not remote", () => {
    // The pre-fix ternary answered `is_remote: false` with "Philippines", turning
    // the source's own non-remote statement into a PH-only eligible_verified row.
    expect(breezyAgencyLocationRaw(agencyPosting({ is_remote: false }))).toBe("");
  });

  it("keeps the source's own remote flag as remote evidence", () => {
    expect(breezyAgencyLocationRaw(agencyPosting({ is_remote: true }))).toBe("Remote");
  });

  it("accepts only a real boolean true as the remote flag, not a truthy string", () => {
    // `"false"` is truthy, so a truthiness check would read an explicit non-remote
    // statement as remote evidence.
    expect(breezyAgencyLocationRaw(agencyPosting({ is_remote: "false" }))).toBe("");
    expect(breezyAgencyLocationRaw(agencyPosting({ is_remote: 1 }))).toBe("");
    expect(breezyAgencyLocationRaw(agencyPosting({ is_remote: "yes" }))).toBe("");
  });

  it("passes the source's location name through verbatim", () => {
    expect(breezyAgencyLocationRaw(agencyPosting({ name: "Manila" }))).toBe("Manila");
    expect(breezyAgencyLocationRaw(agencyPosting({ name: "Davao City" }))).toBe("Davao City");
  });

  it("falls back to the source's country name when no location name is sent", () => {
    expect(breezyAgencyLocationRaw(agencyPosting({ country: { name: "Philippines" } }))).toBe("Philippines");
  });

  it("preserves a restricting country so the gate can still reject it", () => {
    expect(breezyAgencyLocationRaw(agencyPosting({ country: { name: "United Kingdom" } }))).toBe("United Kingdom");
  });

  it("prefers the more specific location name over the country name", () => {
    expect(breezyAgencyLocationRaw(agencyPosting({ name: "Cebu", country: { name: "Philippines" } }))).toBe("Cebu");
  });

  it("ignores a non-object location rather than stringifying it into evidence", () => {
    expect(breezyAgencyLocationRaw(agencyPosting("Philippines"))).toBe("");
    expect(breezyAgencyLocationRaw(agencyPosting(42))).toBe("");
    expect(breezyAgencyLocationRaw(agencyPosting({ name: 123 }))).toBe("");
  });

  it("never yields a positive eligibility verdict out of absent evidence", () => {
    // The behavioural consequence: this is what the pre-fix value returned.
    expect(verdictFor("Philippines").phEligibility).toBe("eligible_verified");

    for (const absent of [undefined, null, {}, { is_remote: false }]) {
      const bound = breezyAgencyLocationRaw(agencyPosting(absent));
      expect(bound).toBe("");
      expect(verdictFor(bound).phEligibility).toBe("unclear");
      expect(verdictFor(bound).geoScope).toBe("unknown");
    }
  });

  it("still reaches a positive verdict when the source really names the Philippines", () => {
    // The fix must narrow only the fabrication, never real source evidence.
    const bound = breezyAgencyLocationRaw(agencyPosting({ country: { name: "Philippines" } }));
    expect(bound).toBe("Philippines");
    expect(verdictFor(bound).phEligibility).toBe("eligible_verified");
    expect(verdictFor(bound).geoScope).toBe("ph_only");
  });
});

describe("the Breezy adapter sends the mapped evidence to the shared lake intake", () => {
  const AGENCY = { id: "breezy:20four7va", name: "20Four7VA" };
  const URL = "https://20four7va.breezy.hr/job/1000000000000000";

  function recordingClient() {
    const statements: Array<{ sql: string; args: unknown[] }> = [];
    const client = {
      execute: async (statement: { sql: string; args?: unknown[] }) => {
        statements.push({ sql: statement.sql, args: statement.args ?? [] });
        return /^\s*SELECT/i.test(statement.sql) ? { rows: [] } : { rows: [] };
      },
    };
    return { client, statements };
  }

  function freshStats() {
    return { totalExtracted: 0, duplicates: 0, excluded: 0, qualifiedReady: 0, ambiguous: 0 };
  }

  /** Bind index of `location_raw` in the shared lake_candidate_jobs INSERT. */
  const LOCATION_RAW_ARG = 7;
  const CANDIDATE_INSERT = new RegExp(["INSERT", "INTO", "lake_candidate_jobs"].join("\\s+"), "i");

  it("stores an unlocated posting as unknown evidence, not as Philippines", async () => {
    const draft = breezyAgencyCandidateDraft(
      { name: "Virtual Assistant", url: URL, updated_at: "2026-10-01T00:00:00.000Z" },
      AGENCY,
    );
    expect(draft).not.toBeNull();
    expect(draft!.locationRaw).toBe("");

    const { client, statements } = recordingClient();
    await processAndRefineCandidate(client as never, 1, draft!, freshStats());

    const insert = statements.find((s) => CANDIDATE_INSERT.test(s.sql));
    expect(insert).toBeDefined();
    expect(insert!.args[LOCATION_RAW_ARG]).toBe("");
    // geo_scope / ph_eligibility / geo_evidence, args 13-15.
    expect(insert!.args[13]).toBe("unknown");
    expect(insert!.args[14]).toBe("unclear");
  });

  it("still stores the source's own location evidence verbatim", async () => {
    const draft = breezyAgencyCandidateDraft(
      { name: "Virtual Assistant", url: URL, location: { country: { name: "Philippines" } } },
      AGENCY,
    );
    const { client, statements } = recordingClient();
    await processAndRefineCandidate(client as never, 1, draft!, freshStats());

    const insert = statements.find((s) => CANDIDATE_INSERT.test(s.sql))!;
    expect(insert.args[LOCATION_RAW_ARG]).toBe("Philippines");
    expect(insert.args[14]).toBe("eligible_verified");
  });

  it("skips a posting the source did not identify rather than inventing one", () => {
    expect(breezyAgencyCandidateDraft({ url: URL }, AGENCY)).toBeNull();
    expect(breezyAgencyCandidateDraft({ name: "Virtual Assistant" }, AGENCY)).toBeNull();
    expect(breezyAgencyCandidateDraft(null as never, AGENCY)).toBeNull();
  });

  it("carries the agency identity, category and the source's own date", () => {
    const draft = breezyAgencyCandidateDraft(
      { name: "Virtual Assistant", url: URL, updated_at: "2026-10-01T00:00:00.000Z", location: { is_remote: true } },
      AGENCY,
    )!;
    expect(draft.sourceId).toBe(AGENCY.id);
    expect(draft.sourcePlatform).toBe(AGENCY.name);
    expect(draft.company).toBe(AGENCY.name);
    expect(draft.category).toBe("admin");
    expect(draft.applicationUrl).toBe(URL);
    expect(draft.locationRaw).toBe("Remote");
    expect(draft.postedAt).toBe("2026-10-01T00:00:00.000Z");
  });

  it("keeps an unparseable source date unknown rather than substituting now", () => {
    const draft = breezyAgencyCandidateDraft({ name: "Virtual Assistant", url: URL }, AGENCY)!;
    expect(draft.postedAt).toBeNull();
  });
});
