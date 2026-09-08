import { afterEach, describe, expect, test } from "bun:test";
import {
  generatePreprocessorResult,
  renderMarkdownReport,
  runPreprocessor,
} from "./workable-preprocessor";

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
const tempDirectories: string[] = [];
function temporaryOutput(): string {
  const directory = mkdtempSync(join(tmpdir(), "va-workable-test-"));
  tempDirectories.push(directory);
  return join(directory, "digest.md");
}
afterEach(() => {
  for (const directory of tempDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});
const SAMPLE_XML = `<?xml version="1.0" encoding="utf-8"?>
<source>
  <publisher>Workable</publisher>
  <job>
    <referencenumber><![CDATA[W001]]></referencenumber>
    <title><![CDATA[Virtual Assistant / Operations Specialist]]></title>
    <url><![CDATA[https://apply.workable.com/acme/j/W001/]]></url>
    <company><![CDATA[Acme Global]]></company>
    <city><![CDATA[Manila]]></city>
    <country><![CDATA[PH]]></country>
    <remote><![CDATA[true]]></remote>
  </job>
  <job>
    <referencenumber><![CDATA[W002]]></referencenumber>
    <title><![CDATA[Senior AI Infrastructure Engineer]]></title>
    <url><![CDATA[https://apply.workable.com/beta/j/W002/]]></url>
    <company><![CDATA[Beta Labs]]></company>
    <city><![CDATA[Remote Worldwide]]></city>
    <country><![CDATA[US]]></country>
    <remote><![CDATA[true]]></remote>
  </job>
  <job>
    <referencenumber><![CDATA[W003]]></referencenumber>
    <title><![CDATA[Onsite Warehouse Associate]]></title>
    <url><![CDATA[https://apply.workable.com/delta/j/W003/]]></url>
    <company><![CDATA[Delta Logistics]]></company>
    <city><![CDATA[Chicago]]></city>
    <country><![CDATA[US]]></country>
    <remote><![CDATA[false]]></remote>
  </job>
</source>`;

describe("Workable Preprocessor (EX-09)", () => {
  test("generates expected stats and candidate filtering from XML", () => {
    const result = generatePreprocessorResult(SAMPLE_XML, "https://example.com/feed.xml", "2026-09-08T00:00:00Z");

    expect(result.stats.totalParsed).toBe(3);
    expect(result.stats.plausibleCandidates).toBe(2);
    expect(result.stats.reductionPercent).toBe(33.3);
    expect(result.topCompanies.length).toBe(2);
    expect(result.sampleCandidates.length).toBe(2);
    expect(result.sampleCandidates[0].title).toBe("Virtual Assistant / Operations Specialist");
    expect(result.sampleCandidates[1].title).toBe("Senior AI Infrastructure Engineer");
  });

  test("renders valid markdown report with safety disclaimers", () => {
    const result = generatePreprocessorResult(SAMPLE_XML, "https://example.com/feed.xml", "2026-09-08T00:00:00Z");
    const report = renderMarkdownReport(result);

    expect(report).toContain("# Workable Global Feed Candidates");
    expect(report).toContain("OFFLINE_PREPROCESSED");
    expect(report).toContain("Total Parsed Postings");
    expect(report).toContain("Virtual Assistant / Operations Specialist");
    expect(report).toContain("Preserves $0 infrastructure budget");
  });

  test("runPreprocessor executes with mock fetch without D1 writes", async () => {
    const mockFetch = async () => new Response(SAMPLE_XML, { status: 200 });
    const res = await runPreprocessor({
      fetchImpl: mockFetch as any,
      outputPath: temporaryOutput(),
    });

    expect(res.stats.totalParsed).toBe(3);
    expect(res.stats.plausibleCandidates).toBe(2);
  });

  test("malformed, empty and drifted HTTP 200 feeds preserve the previous digest", async () => {
    const outputPath = temporaryOutput();
    writeFileSync(outputPath, "last healthy digest");
    for (const body of ["<html>Maintenance</html>", "<source><publisher>Workable</publisher></source>", SAMPLE_XML.replaceAll("referencenumber", "newreference"), SAMPLE_XML.replace("</source>", "")]) {
      await expect(runPreprocessor({ outputPath, fetchImpl: (async () => new Response(body)) as unknown as typeof fetch })).rejects.toThrow();
      expect(readFileSync(outputPath, "utf8")).toBe("last healthy digest");
    }
  });

  test("missing explicit fixtures never fall back to a network fetch", async () => {
    let fetched = false;
    await expect(runPreprocessor({ xmlSource: temporaryOutput(), fetchImpl: (async () => { fetched = true; return new Response(SAMPLE_XML); }) as unknown as typeof fetch })).rejects.toThrow();
    expect(fetched).toBe(false);
  });

  test("enforces declared and streamed byte budgets without replacing healthy evidence", async () => {
    const outputPath = temporaryOutput();
    writeFileSync(outputPath, "last healthy digest");
    for (const headers of [new Headers({ "content-length": "999999" }), new Headers()]) {
      await expect(runPreprocessor({ outputPath, maxBytes: 32, fetchImpl: (async () => new Response(SAMPLE_XML, { headers })) as unknown as typeof fetch })).rejects.toThrow("byte budget");
      expect(readFileSync(outputPath, "utf8")).toBe("last healthy digest");
    }
  });

  test("times out a stalled body and aborts the request", async () => {
    let signal: AbortSignal | undefined;
    const outputPath = temporaryOutput();
    writeFileSync(outputPath, "last healthy digest");
    await expect(runPreprocessor({ outputPath, timeoutMs: 10, fetchImpl: (async (_url: RequestInfo | URL, init?: RequestInit) => {
      signal = init?.signal as AbortSignal;
      return new Response(new ReadableStream({ start() {} }));
    }) as unknown as typeof fetch })).rejects.toThrow("timed out");
    expect(signal?.aborted).toBe(true);
    expect(readFileSync(outputPath, "utf8")).toBe("last healthy digest");
  });

  test("deduplicates original URLs before candidate counts and samples", () => {
    const firstJob = SAMPLE_XML.match(/<job>[\s\S]*?<\/job>/)![0];
    const result = generatePreprocessorResult(SAMPLE_XML.replace("</source>", `${firstJob}</source>`));
    expect(result.rawParsedPostings).toBe(4);
    expect(result.duplicatePostings).toBe(1);
    expect(result.stats.totalParsed).toBe(3);
    expect(result.stats.plausibleCandidates).toBe(2);
    expect(result.sampleCandidates).toHaveLength(2);
    expect(result.topCompanies.find((company) => company.company === "Acme Global")?.count).toBe(1);
    expect(renderMarkdownReport(result)).toContain("Duplicate Postings Removed");
  });

  test("a later non-remote duplicate cannot erase a plausible location variant", () => {
    const firstJob = SAMPLE_XML.match(/<job>[\s\S]*?<\/job>/)![0];
    const domesticVariant = firstJob.replace("[true]", "[false]").replace("[PH]", "[US]");
    const result = generatePreprocessorResult(SAMPLE_XML.replace("</source>", `${domesticVariant}</source>`));
    expect(result.stats.plausibleCandidates).toBe(2);
    expect(result.sampleCandidates.find((job) => job.referenceNumber === "W001")?.country).toBe("PH");
  });

  test("escapes untrusted Markdown fields and suppresses unsafe URL schemes", () => {
    const result = generatePreprocessorResult(SAMPLE_XML);
    result.sampleCandidates[0] = { ...result.sampleCandidates[0], title: "[click](javascript:evil)\n<script>", company: "A|B", city: "<img>", referenceNumber: "`break`", url: "javascript:alert(1)" };
    result.topCompanies[0].company = "<script>|bad";
    result.sourceUrl = "javascript:alert(1)";
    const report = renderMarkdownReport(result);
    expect(report).not.toContain("](javascript:");
    expect(report).not.toContain("<script>");
    expect(report).not.toContain("<img>");
    expect(report).toContain("A&#124;B");
    expect(report).toContain("&#96;break&#96;");
    result.sampleCandidates[0].url = "https://apply.workable.com/acme/j/W001/";
    expect(renderMarkdownReport(result)).toContain("](https://apply.workable.com/acme/j/W001/)");
  });
});
