import { afterEach, describe, expect, test } from "bun:test";
import {
  generatePreprocessorResult,
  renderMarkdownReport,
  runPreprocessor,
  WORKABLE_USER_AGENT_TOKEN,
} from "./workable-preprocessor";

import { mkdtempSync, readFileSync, rmSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
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
function allowedRobotsThenFeed(body: string, headers?: Headers): typeof fetch {
  return (async (input: RequestInfo | URL) => new Response(String(input).endsWith("/robots.txt")
    ? "User-agent: *\nAllow: /" : body, String(input).endsWith("/robots.txt") ? {} : { headers })) as typeof fetch;
}
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
    expect(report).toContain("No new paid service; billing has not been independently measured.");
  });

  test("runPreprocessor executes with mock fetch without D1 writes", async () => {
    const mockFetch = allowedRobotsThenFeed(SAMPLE_XML);
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
      await expect(runPreprocessor({ outputPath, fetchImpl: allowedRobotsThenFeed(body) })).rejects.toThrow();
      expect(readFileSync(outputPath, "utf8")).toBe("last healthy digest");
    }
  }, 30_000);

  test("missing explicit fixtures never fall back to a network fetch", async () => {
    let fetched = false;
    await expect(runPreprocessor({ xmlSource: temporaryOutput(), fetchImpl: (async () => { fetched = true; return new Response(SAMPLE_XML); }) as unknown as typeof fetch })).rejects.toThrow();
    expect(fetched).toBe(false);
  });

  test("enforces declared and streamed byte budgets without replacing healthy evidence", async () => {
    const outputPath = temporaryOutput();
    writeFileSync(outputPath, "last healthy digest");
    for (const headers of [new Headers({ "content-length": "999999" }), new Headers()]) {
      await expect(runPreprocessor({ outputPath, maxBytes: 32, fetchImpl: allowedRobotsThenFeed(SAMPLE_XML, headers) })).rejects.toThrow("byte budget");
      expect(readFileSync(outputPath, "utf8")).toBe("last healthy digest");
    }
  });

  test("times out a stalled body and aborts the request", async () => {
    let signal: AbortSignal | undefined;
    const outputPath = temporaryOutput();
    writeFileSync(outputPath, "last healthy digest");
    await expect(runPreprocessor({ outputPath, timeoutMs: 10, fetchImpl: (async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (String(_url).endsWith("/robots.txt")) return new Response("User-agent: *\nAllow: /");
      signal = init?.signal as AbortSignal;
      return new Response(new ReadableStream({ start() {} }));
    }) as unknown as typeof fetch })).rejects.toThrow("timed out");
    expect(signal?.aborted).toBe(true);
    expect(readFileSync(outputPath, "utf8")).toBe("last healthy digest");
  });

  test("checks matching bot robots rules before the feed and refuses redirects", async () => {
    const calls: string[] = [];
    await runPreprocessor({ outputPath: temporaryOutput(), fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(String(input));
      expect(init?.redirect).toBe("error");
      expect(new Headers(init?.headers).get("User-Agent")).toContain(WORKABLE_USER_AGENT_TOKEN);
      return new Response(String(input).endsWith("/robots.txt")
        ? `User-agent: *\nDisallow: /\n\nUser-agent: ${WORKABLE_USER_AGENT_TOKEN}\nAllow: /boards/` : SAMPLE_XML);
    }) as typeof fetch });
    expect(calls).toEqual(["https://www.workable.com/robots.txt", "https://www.workable.com/boards/workable.xml"]);
  });

  test("blocked and unknown robots decisions prevent any feed request or digest overwrite", async () => {
    for (const response of [() => new Response(`User-agent: ${WORKABLE_USER_AGENT_TOKEN}\nDisallow: /boards/`), () => new Response("Unavailable", { status: 503 })]) {
      const calls: string[] = [];
      const outputPath = temporaryOutput();
      writeFileSync(outputPath, "last healthy digest");
      await expect(runPreprocessor({ outputPath, fetchImpl: (async (input: RequestInfo | URL) => { calls.push(String(input)); return response(); }) as typeof fetch })).rejects.toThrow("robots");
      expect(calls).toEqual(["https://www.workable.com/robots.txt"]);
      expect(readFileSync(outputPath, "utf8")).toBe("last healthy digest");
    }
  });

  test("honors a short crawl delay and rejects delays beyond the bounded wait", async () => {
    let robotsReturnedAt = 0;
    let elapsed = 0;
    await runPreprocessor({ outputPath: temporaryOutput(), fetchImpl: (async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/robots.txt")) {
        robotsReturnedAt = performance.now();
        return new Response("User-agent: *\nAllow: /\nCrawl-delay: 0.02");
      }
      elapsed = performance.now() - robotsReturnedAt;
      return new Response(SAMPLE_XML);
    }) as typeof fetch });
    expect(elapsed).toBeGreaterThanOrEqual(18);
    let requests = 0;
    await expect(runPreprocessor({ outputPath: temporaryOutput(), fetchImpl: (async () => { requests++; return new Response("User-agent: *\nAllow: /\nCrawl-delay: 61"); }) as unknown as typeof fetch })).rejects.toThrow("crawl-delay");
    expect(requests).toBe(1);
  });

  test("valid fixture runs remain completely offline", async () => {
    const xmlSource = temporaryOutput();
    writeFileSync(xmlSource, SAMPLE_XML);
    let requests = 0;
    const result = await runPreprocessor({ xmlSource, outputPath: temporaryOutput(), fetchImpl: (async () => { requests++; throw new Error("Unexpected network access"); }) as unknown as typeof fetch });
    expect(requests).toBe(0);
    expect(result.stats.totalParsed).toBe(3);
  });

  test("streams beyond the old 128 MiB ceiling and discards descriptions before loading metadata", async () => {
    const outputPath = temporaryOutput();
    const tempRoot = dirname(outputPath);
    const [first, ...rest] = SAMPLE_XML.split("</job>");
    const encoder = new TextEncoder();
    const prefix = encoder.encode(`${first}<description><![CDATA[`);
    const suffix = encoder.encode(`]]></description></job>${rest.join("</job>")}`);
    const chunk = new Uint8Array(1024 * 1024).fill(120);
    let part = 0;
    const result = await runPreprocessor({ outputPath, tempRoot, timeoutMs: 60_000,
      fetchImpl: (async (input: RequestInfo | URL) => {
        if (String(input).endsWith("/robots.txt")) return new Response("User-agent: *\nAllow: /");
        const response = new Response(new ReadableStream<Uint8Array>({ pull(controller) {
          if (part === 0) controller.enqueue(prefix);
          else if (part <= 132) controller.enqueue(chunk);
          else { controller.enqueue(suffix); controller.close(); }
          part++;
        } }));
        response.text = async () => { throw new Error("Must not buffer the raw XML with Response.text"); };
        return response;
      }) as typeof fetch,
    });
    expect(result.stats.totalParsed).toBe(3);
    expect(result.stats.plausibleCandidates).toBe(2);
    expect(readFileSync(outputPath, "utf8")).not.toContain("xxxxxxxxxx");
    expect(readdirSync(tempRoot)).toEqual(["digest.md"]);
  }, 30_000);

  test("streaming schema failures, size failures, and timeouts remove temporary downloads", async () => {
    const outputPath = temporaryOutput();
    const tempRoot = dirname(outputPath);
    writeFileSync(outputPath, "previous healthy digest");
    for (const options of [
      { fetchImpl: allowedRobotsThenFeed(SAMPLE_XML.replace("</source>", "")) },
      { maxBytes: 32, fetchImpl: allowedRobotsThenFeed(SAMPLE_XML) },
      { timeoutMs: 10, fetchImpl: (async (input: RequestInfo | URL) => String(input).endsWith("/robots.txt")
        ? new Response("User-agent: *\nAllow: /") : new Response(new ReadableStream({ start() {} }))) as typeof fetch },
    ]) {
      await expect(runPreprocessor({ outputPath, tempRoot, ...options })).rejects.toThrow();
      expect(readdirSync(tempRoot)).toEqual(["digest.md"]);
      expect(readFileSync(outputPath, "utf8")).toBe("previous healthy digest");
    }
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
