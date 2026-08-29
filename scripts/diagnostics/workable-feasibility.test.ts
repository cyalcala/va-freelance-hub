import { describe, test, expect } from "bun:test";
import {
  extractJobBlocks,
  extractCdataField,
  extractPublisher,
  isSourceRoot,
  analyzeFeed,
  classifyRuntime,
  renderReport,
  DOCUMENTED_FIELDS,
  WORKER_INLINE_MAX_BYTES,
  WORKER_INLINE_MAX_ITEMS,
  WORKABLE_FEED_URL,
} from "./workable-feasibility";

// Small fixture reproducing the real, documented shape observed from a live
// bounded probe of https://www.workable.com/boards/workable.xml on
// 2026-08-29 (this fixture is a synthetic reconstruction of that structure —
// not a stored copy of the actual feed body, per the evidence-as-hash-only
// policy). Includes: one PH remote job, one non-PH non-remote job, and one
// exact within-feed duplicate (same <url>/<referencenumber>, matching the
// real "same posting emitted twice in one pull" behavior observed live).
function job(opts: {
  title: string; refnum: string; url: string; company: string; city: string;
  state: string; country: string; remote: string; description: string;
}): string {
  return `  <job>
    <title>
      <![CDATA[${opts.title}]]>
    </title>
    <date>
      <![CDATA[Wed, 28 Jul 2021 10:24:17 UTC]]>
    </date>
    <referencenumber>
      <![CDATA[${opts.refnum}]]>
    </referencenumber>
    <url>
      <![CDATA[${opts.url}]]>
    </url>
    <company>
      <![CDATA[${opts.company}]]>
    </company>
    <city>
      <![CDATA[${opts.city}]]>
    </city>
    <state>
      <![CDATA[${opts.state}]]>
    </state>
    <country>
      <![CDATA[${opts.country}]]>
    </country>
    <remote>
      <![CDATA[${opts.remote}]]>
    </remote>
    <postalcode>
      <![CDATA[]]>
    </postalcode>
    <description>
      <![CDATA[${opts.description}]]>
    </description>
    <education>
      <![CDATA[Bachelor's Degree]]>
    </education>
    <jobtype>
      <![CDATA[Full-time]]>
    </jobtype>
    <category>
      <![CDATA[Information Technology]]>
    </category>
    <experience>
      <![CDATA[Mid-Senior level]]>
    </experience>
    <website>
      <![CDATA[https://example-employer.com]]>
    </website>
  </job>`;
}

const JOB_PH_REMOTE = job({
  title: "Remote Virtual Assistant", refnum: "AAA111", url: "https://apply.workable.com/j/AAA111",
  company: "Acme Remote Co", city: "Manila", state: "NCR", country: "PH", remote: "true",
  description: "<p>Looking for a remote VA to support our ops team.</p>",
});
const JOB_US_ONSITE = job({
  title: "Onsite Systems Engineer", refnum: "BBB222", url: "https://apply.workable.com/j/BBB222",
  company: "Acme US Co", city: "Austin", state: "TX", country: "US", remote: "false",
  description: "<p>Onsite systems engineer role.</p>",
});
// Exact duplicate of JOB_PH_REMOTE's <url>/<referencenumber> — reproduces the
// real "same posting appears twice in one feed pull" behavior.
const JOB_PH_REMOTE_DUP = job({
  title: "Remote Virtual Assistant", refnum: "AAA111", url: "https://apply.workable.com/j/AAA111",
  company: "Acme Remote Co", city: "Manila", state: "NCR", country: "PH", remote: "true",
  description: "<p>Looking for a remote VA to support our ops team.</p>",
});

const FIXTURE_XML = `<?xml version="1.0" encoding="utf-8"?>
<source>
  <publisher>Workable</publisher>
  <publisherurl>https://www.workable.com</publisherurl>
${JOB_PH_REMOTE}
${JOB_US_ONSITE}
${JOB_PH_REMOTE_DUP}
</source>`;

describe("workable-feasibility — parsing", () => {
  test("extractJobBlocks finds every <job> element", () => {
    const jobs = extractJobBlocks(FIXTURE_XML);
    expect(jobs).toHaveLength(3);
  });

  test("extractCdataField reads a CDATA-wrapped field", () => {
    const jobs = extractJobBlocks(FIXTURE_XML);
    expect(extractCdataField(jobs[0], "title")).toBe("Remote Virtual Assistant");
    expect(extractCdataField(jobs[0], "country")).toBe("PH");
    expect(extractCdataField(jobs[0], "remote")).toBe("true");
  });

  test("extractPublisher and isSourceRoot read the feed header", () => {
    expect(extractPublisher(FIXTURE_XML)).toBe("Workable");
    expect(isSourceRoot(FIXTURE_XML)).toBe(true);
    expect(isSourceRoot("<rss><channel></channel></rss>")).toBe(false);
  });

  test("DOCUMENTED_FIELDS matches every field this fixture and the real feed carry", () => {
    expect(DOCUMENTED_FIELDS).toContain("referencenumber");
    expect(DOCUMENTED_FIELDS).toContain("remote");
    expect(DOCUMENTED_FIELDS).toContain("description");
  });
});

describe("workable-feasibility — analysis (SP-09 criterion: measure size/schema/yield/duplicates)", () => {
  const analysis = analyzeFeed(FIXTURE_XML, WORKABLE_FEED_URL, "2026-08-29T12:00:00.000Z");

  test("counts raw entries and distinct-by-url — reproduces the real 'duplicate within one pull' finding", () => {
    expect(analysis.jobCountRaw).toBe(3);
    expect(analysis.distinctByUrl).toBe(2); // AAA111 appears twice, BBB222 once
    expect(analysis.duplicatedUrlValues).toBe(1);
  });

  test("counts remote true/false and PH-country yield", () => {
    expect(analysis.remoteTrue).toBe(2); // both AAA111 entries are remote=true
    expect(analysis.remoteFalse).toBe(1);
    expect(analysis.phCount).toBe(2);
  });

  test("top countries are sorted by count descending", () => {
    expect(analysis.topCountries[0]).toEqual({ country: "PH", count: 2 });
    expect(analysis.topCountries[1]).toEqual({ country: "US", count: 1 });
  });

  test("no documented field is missing from the sampled job", () => {
    expect(analysis.missingDocumentedFields).toEqual([]);
    expect(analysis.sampleFieldsPresent.length).toBe(DOCUMENTED_FIELDS.length);
  });

  test("root element and publisher are captured", () => {
    expect(analysis.rootIsSource).toBe(true);
    expect(analysis.publisher).toBe("Workable");
  });

  test("byte length and per-job averages are computed from real byte counts, not estimates", () => {
    expect(analysis.byteLength).toBe(Buffer.byteLength(FIXTURE_XML, "utf-8"));
    expect(analysis.avgJobBytes).toBeGreaterThan(0);
    expect(analysis.avgDescriptionBytes).toBeGreaterThan(0);
  });

  test("analyzeFeed is pure — identical input yields identical output", () => {
    const again = analyzeFeed(FIXTURE_XML, WORKABLE_FEED_URL, "2026-08-29T12:00:00.000Z");
    expect(again).toEqual(analysis);
  });
});

describe("workable-feasibility — runtime decision (SP-09 criterion: Worker streaming | GitHub Action | PAUSED)", () => {
  test("a small feed (under both thresholds) is classified worker_streaming", () => {
    const small = analyzeFeed(FIXTURE_XML, WORKABLE_FEED_URL, "2026-08-29T12:00:00.000Z");
    expect(small.byteLength).toBeLessThan(WORKER_INLINE_MAX_BYTES);
    expect(small.jobCountRaw).toBeLessThan(WORKER_INLINE_MAX_ITEMS);
    const decision = classifyRuntime(small);
    expect(decision.decision).toBe("worker_streaming");
  });

  test("a feed over the byte threshold is classified github_action_preprocessing (reproduces the real ~44 MiB measurement)", () => {
    // Synthesize an analysis matching the real live-probe measurement shape
    // without holding a 44 MiB string in memory for the test.
    const large = analyzeFeed(FIXTURE_XML, WORKABLE_FEED_URL, "2026-08-29T12:00:00.000Z");
    const overBudget = { ...large, byteLength: 46_571_520, jobCountRaw: 11603 };
    const decision = classifyRuntime(overBudget);
    expect(decision.decision).toBe("github_action_preprocessing");
    expect(decision.reasons.join(" ")).toContain("MiB");
    expect(decision.reasons.join(" ")).toContain("GitHub Actions");
  });

  test("a feed over the item threshold alone is also classified github_action_preprocessing", () => {
    const base = analyzeFeed(FIXTURE_XML, WORKABLE_FEED_URL, "2026-08-29T12:00:00.000Z");
    const overItems = { ...base, byteLength: 1024, jobCountRaw: WORKER_INLINE_MAX_ITEMS + 1 };
    const decision = classifyRuntime(overItems);
    expect(decision.decision).toBe("github_action_preprocessing");
  });

  test("a feed with a missing documented field is classified paused, not silently accepted", () => {
    const base = analyzeFeed(FIXTURE_XML, WORKABLE_FEED_URL, "2026-08-29T12:00:00.000Z");
    const broken = { ...base, missingDocumentedFields: ["referencenumber", "description"] };
    const decision = classifyRuntime(broken);
    expect(decision.decision).toBe("paused");
    expect(decision.reasons[0]).toContain("missing documented field");
  });

  test("a feed with zero jobs or a non-<source> root is classified paused", () => {
    const base = analyzeFeed(FIXTURE_XML, WORKABLE_FEED_URL, "2026-08-29T12:00:00.000Z");
    expect(classifyRuntime({ ...base, jobCountRaw: 0 }).decision).toBe("paused");
    expect(classifyRuntime({ ...base, rootIsSource: false }).decision).toBe("paused");
  });
});

describe("workable-feasibility — report generation", () => {
  test("report includes measurements, decision, top countries, and provenance", () => {
    const analysis = analyzeFeed(FIXTURE_XML, WORKABLE_FEED_URL, "2026-08-29T12:00:00.000Z");
    const decision = classifyRuntime(analysis);
    const report = renderReport(analysis, decision);
    expect(report).toContain("# Workable global XML feed feasibility (SP-09)");
    expect(report).toContain(WORKABLE_FEED_URL);
    expect(report).toContain(decision.decision.toUpperCase());
    expect(report).toContain("PH");
    expect(report).toContain("## Decision reasoning");
    expect(report).toContain("zero D1 writes");
  });

  test("report never contains raw fetched job content — only computed measurements", () => {
    const analysis = analyzeFeed(FIXTURE_XML, WORKABLE_FEED_URL, "2026-08-29T12:00:00.000Z");
    const decision = classifyRuntime(analysis);
    const report = renderReport(analysis, decision);
    expect(report).not.toContain("<![CDATA[");
    expect(report).not.toContain("Looking for a remote VA"); // raw description text
    expect(report).not.toContain("Acme Remote Co"); // raw company field
  });
});
