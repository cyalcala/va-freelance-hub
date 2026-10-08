import { expect, test } from "bun:test";
import { geoGate } from "../../../packages/scraper/geoGate";
import type { GreenhouseNativeFacts, NativeFact } from "../../../packages/scraper/greenhouse-item-evidence";
import { inspectLakeItemGeo, type LakeItemGeoInspection } from "../src/lib/lake-item-geo-inspection";

type Input = Pick<GreenhouseNativeFacts, "title" | "locationName">;
const value = (text: string): NativeFact<string> => ({ state: "value", value: text });
const input = (title = "Virtual Assistant", locationName: NativeFact<string> = { state: "missing" }): Input => ({ title: value(title), locationName });
const malformed = (facts: unknown) => inspectLakeItemGeo(facts as Input);
function noClearance(result: LakeItemGeoInspection) {
  expect(result.fullRemote).toBe("UNKNOWN");
  expect(result.phExclusions).toBe("UNKNOWN");
  expect(result.qualificationAuthorized).toBe(false);
  expect(result.publicationAuthorized).toBe(false);
  expect(result.coverage.description).toBe("NOT_RETAINED");
  expect(result.coverage.tags).toBe("NOT_RETAINED");
  expect(result.reasons).toHaveLength(1);
}
function canonicalResult(facts: Input) {
  const result = inspectLakeItemGeo(facts);
  const verdict = geoGate({ title: facts.title.state === "value" ? facts.title.value : "",
    locationRaw: facts.locationName.state === "value" ? facts.locationName.value : null, description: null, tags: [] });
  expect(result.geoScope).toBe(verdict.geoScope);
  expect(result.phEligibility).toBe(verdict.phEligibility);
  noClearance(result);
  return result;
}

test("native PH, APAC and worldwide location hints retain canonical diagnostics and stay held", () => {
  for (const [location, scope, eligibility] of [["Philippines", "ph_only", "eligible_verified"],
    ["APAC", "apac_incl_ph", "eligible_verified"], ["Anywhere in the World", "worldwide", "eligible_likely"],
    ["Worldwide", "worldwide", "eligible_likely"]] as const) {
    const result = canonicalResult(input("Virtual Assistant", value(location)));
    expect(result).toMatchObject({ version: "lake-item-geo-inspection-v1", state: "HELD", geoScope: scope,
      phEligibility: eligibility, reasons: ["NATIVE_GEO_PARTIAL_COVERAGE"], coverage: { title: "value", locationName: "value" } });
  }
});

test("native title PH and APAC signals do not require fabricated location or remote proof", () => {
  for (const title of ["Virtual Assistant for our Philippines team", "Customer Support (APAC)", "Fully remote Virtual Assistant"]) {
    const result = canonicalResult(input(title));
    expect(result.state).toBe("HELD");
    expect(result.phEligibility).not.toBe("unclear");
    expect(result.coverage.locationName).toBe("missing");
  }
});

test("canonical onsite and hybrid title/location markers reject even PH or worldwide hints", () => {
  for (const [title, location] of [["Support (Onsite)", "Philippines"], ["Support (Hybrid)", "Worldwide"],
    ["Support", "Manila, Philippines (onsite)"], ["Support", "Philippines - hybrid"]]) {
    const result = canonicalResult(input(title, value(location)));
    expect(result.state).toBe("REJECTED");
    expect(result.phEligibility).toBe("ineligible");
    expect(result.reasons).toEqual(["NATIVE_GEO_INELIGIBLE"]);
  }
});

test("canonical non-PH country and regional locations reject without source priors", () => {
  for (const location of ["US", "Remote, US", "Austin, TX", "EMEA", "Lugano"]) {
    const result = canonicalResult(input("Support Specialist", value(location)));
    expect(result.state).toBe("REJECTED");
    expect(result.phEligibility).toBe("ineligible");
  }
});

test("native title country pins and authorization locks reject despite worldwide location hints", () => {
  for (const title of ["Writer (US Remote)", "Writer - US Only", "Writer with US work authorization required",
    "Writer must be based in the US", "Writer must hold active security clearance"]) {
    const result = canonicalResult(input(title, value("Worldwide")));
    expect(result.state).toBe("REJECTED");
    expect(result.phEligibility).toBe("ineligible");
  }
});

test("canonical PH and APAC precedence is retained for conflicting and hidden title restrictions", () => {
  for (const [title, location] of [["Writer - US Only", "Philippines"], ["Writer (US Remote)", "APAC"],
    ["Writer <span hidden>US work authorization required</span>", "Philippines"]]) {
    const result = canonicalResult(input(title, value(location)));
    expect(result.phEligibility).toBe("eligible_verified");
    expect(result.state).toBe("HELD");
    expect(result.reasons).toEqual(["NATIVE_GEO_PARTIAL_COVERAGE"]);
  }
});

test("bare Remote remains canonical unknown geography with held partial coverage", () => {
  for (const location of ["Remote", "Remote,", "Remote (unspecified)"]) {
    const result = canonicalResult(input("Support Specialist", value(location)));
    expect(result).toMatchObject({ state: "HELD", geoScope: "unknown", phEligibility: "unclear" });
  }
});

test("missing, null and native invalid location states are preserved without absence clearance", () => {
  const locations: NativeFact<string>[] = [{ state: "missing" }, { state: "null" },
    ...(["string", "number", "boolean", "array", "object"] as const).map(valueType => ({ state: "invalid" as const, valueType }))];
  for (const location of locations) {
    const result = canonicalResult(input("Support Specialist", location));
    expect(result).toMatchObject({ state: "HELD", geoScope: "unknown", phEligibility: "unclear" });
    expect(result.coverage.locationName).toBe(location.state);
  }
});

test("empty and whitespace native location values remain value coverage with unknown geography", () => {
  for (const location of ["", " \t\n", "<i></i>"]) {
    const result = canonicalResult(input("Support Specialist", value(location)));
    expect(result).toMatchObject({ state: "HELD", geoScope: "unknown", phEligibility: "unclear" });
    expect(result.coverage.locationName).toBe("value");
  }
});

test("absent, native invalid and blank title facts are unknown even with PH location", () => {
  const titles: NativeFact<string>[] = [{ state: "missing" }, { state: "null" }, { state: "invalid", valueType: "number" },
    value(""), value(" \t\n")];
  for (const title of titles) {
    const result = inspectLakeItemGeo({ title, locationName: value("Philippines") });
    expect(result).toMatchObject({ state: "UNKNOWN", geoScope: "unknown", phEligibility: "unclear",
      reasons: ["NATIVE_GEO_INPUT_INVALID"], coverage: { title: title.state, locationName: "value" } });
    noClearance(result);
  }
});

const malformedFacts = [null, [], "Philippines", { state: "VALUE", value: "Philippines" }, { state: "value" },
  { state: "value", value: null }, { state: "value", value: 123 }, { state: "value", value: ["Philippines"] },
  { state: "value", value: "Philippines", extra: true }, { state: "missing", value: "Philippines" },
  { state: "null", value: null }, { state: "invalid" }, { state: "invalid", valueType: "undefined" },
  { state: "invalid", valueType: "string", value: "Philippines" }];

test("malformed title fact carriers fail closed without coercion", () => {
  for (const title of malformedFacts) {
    const result = malformed({ title, locationName: value("Philippines") });
    expect(result).toMatchObject({ state: "UNKNOWN", reasons: ["NATIVE_GEO_INPUT_INVALID"],
      coverage: { title: "MALFORMED", locationName: "value" } });
    noClearance(result);
  }
});

test("malformed location fact carriers cannot become absent or positive location evidence", () => {
  for (const locationName of malformedFacts) {
    const result = malformed({ title: value("Virtual Assistant"), locationName });
    expect(result).toMatchObject({ state: "UNKNOWN", reasons: ["NATIVE_GEO_INPUT_INVALID"],
      coverage: { title: "value", locationName: "MALFORMED" } });
    noClearance(result);
  }
});

test("malformed input containers and absent fact properties produce bounded unknown diagnostics", () => {
  for (const facts of [undefined, null, [], "Philippines", {}, { title: value("Virtual Assistant") },
    { locationName: value("Philippines") }]) {
    const result = malformed(facts);
    expect(result.state).toBe("UNKNOWN");
    expect(result.reasons).toEqual(["NATIVE_GEO_INPUT_INVALID"]);
    noClearance(result);
  }
});

test("producer title and location UTF-16 limits are inclusive without truncation", () => {
  for (const title of ["A".repeat(300), "😀".repeat(150)]) {
    const result = canonicalResult(input(title, value("Philippines ".padEnd(500, "x"))));
    expect(result.state).toBe("HELD");
    expect(result.coverage).toMatchObject({ title: "value", locationName: "value" });
  }
});

test("oversized and NUL-bearing title/location values fail instead of truncating or repairing", () => {
  for (const title of ["A".repeat(301), "😀".repeat(151), "Virtual\0 Assistant"]) {
    const result = inspectLakeItemGeo(input(title, value("Philippines")));
    expect(result).toMatchObject({ state: "UNKNOWN", reasons: ["NATIVE_GEO_INPUT_INVALID"], coverage: { title: "MALFORMED" } });
    noClearance(result);
  }
  for (const location of ["x".repeat(501), "😀".repeat(251), "Philippines\0"]) {
    const result = inspectLakeItemGeo(input("Virtual Assistant", value(location)));
    expect(result).toMatchObject({ state: "UNKNOWN", reasons: ["NATIVE_GEO_INPUT_INVALID"], coverage: { locationName: "MALFORMED" } });
    noClearance(result);
  }
});

test("diagnostics contain no raw native text or canonical human-readable evidence and do not mutate facts", () => {
  const facts = input("PRIVATE TITLE <script>alert('private')</script>", value("Philippines PRIVATE LOCATION"));
  const before = JSON.stringify(facts);
  const result = inspectLakeItemGeo(facts);
  expect(result.state).toBe("HELD");
  expect(JSON.stringify(facts)).toBe(before);
  expect(Object.keys(result).sort()).toEqual(["version", "state", "geoScope", "phEligibility", "reasons", "coverage",
    "fullRemote", "phExclusions", "qualificationAuthorized", "publicationAuthorized"].sort());
  expect(JSON.stringify(result)).not.toContain("PRIVATE");
  expect(JSON.stringify(result)).not.toContain("<script>");
  expect(JSON.stringify(result).length).toBeLessThanOrEqual(600);
  noClearance(result);
});

test("candidate description, tags and synthesized remote or PH fields cannot upgrade native diagnostics", () => {
  const facts = { ...input("Support Specialist"), description: "Worldwide fully remote PH hiring",
    tags: ["philippines", "remote"], location_type: "remote", company: "Philippines", phEligibility: "eligible_verified" };
  const result = inspectLakeItemGeo(facts);
  expect(result).toMatchObject({ state: "HELD", geoScope: "unknown", phEligibility: "unclear",
    coverage: { title: "value", locationName: "missing" } });
  noClearance(result);
});

test("HTML-bearing native values follow only canonical gate behavior without a new HTML scanner", () => {
  for (const [title, location] of [["<b>Support (Onsite)</b>", "<span>Philippines</span>"],
    ["Support <span hidden>US work authorization required</span>", "Worldwide"],
    ["Support &lt;Hybrid&gt;", "Philippines"]]) {
    const result = canonicalResult(input(title, value(location)));
    expect(result.state).toBe("REJECTED");
    expect(result.reasons).toEqual(["NATIVE_GEO_INELIGIBLE"]);
  }
});

test("native invalid location still permits a held canonical PH title hint with unknown exclusion proof", () => {
  const result = canonicalResult(input("Writer for our Philippines team", { state: "invalid", valueType: "object" }));
  expect(result).toMatchObject({ state: "HELD", phEligibility: "eligible_verified", coverage: { locationName: "invalid" } });
});
