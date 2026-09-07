import { describe, expect, test } from "bun:test";
import {
  generatePreprocessorResult,
  renderMarkdownReport,
  runPreprocessor,
} from "./workable-preprocessor";

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
      outputPath: "node_modules/.cache_test_workable.md",
    });

    expect(res.stats.totalParsed).toBe(3);
    expect(res.stats.plausibleCandidates).toBe(2);
  });
});