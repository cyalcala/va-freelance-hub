#!/usr/bin/env bun
/**
 * EX-09: Workable Global XML Feed Preprocessor (Pillar A / H).
 *
 * Runs as a standalone scheduled GitHub Action outside the 10-minute
 * Cloudflare Worker scrape tick to prevent memory and subrequest exhaustion.
 *
 * 1. Fetches official Workable global job feed (or local XML fixture).
 * 2. Parses and coarses-filters for plausible candidates (remote=true OR country=PH).
 * 3. Aggregates hiring companies and candidate metrics.
 * 4. Writes docs/workable-candidates-latest.md operational evidence.
 * 5. Performs ZERO Cloudflare D1 writes and ZERO live board publishing.
 */

import { writeFileSync, readFileSync, statSync } from "fs";
import { resolve } from "path";
import { XMLValidator } from "fast-xml-parser";
import {
  parseWorkableXml,
  filterPlausibleCandidates,
  summarizeFilterStats,
  WORKABLE_FEED_URL,
  type NormalizedWorkablePosting,
  type WorkableFilterStats,
} from "../../packages/scraper/workable";

export interface PreprocessorResult {
  generatedAt: string;
  sourceUrl: string;
  stats: WorkableFilterStats;
  topCompanies: Array<{ company: string; count: number }>;
  sampleCandidates: NormalizedWorkablePosting[];
  rawParsedPostings: number;
  duplicatePostings: number;
}

export const MAX_FEED_BYTES = 128 * 1024 * 1024;
export const FEED_TIMEOUT_MS = 120_000;

function markdownText(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").replace(/&/g, "&amp;")
    .replace(/[<>|`*_[\]\\]/g, (char) => `&#${char.charCodeAt(0)};`);
}

function markdownLink(label: string, value: string): string {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return markdownText(label);
    // Preserve the provider URL itself; only escape Markdown delimiters.
    const target = value.replace(/[\s<>|()[\]\\]/g, (char) => encodeURIComponent(char).replace(/[()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`));
    return `[${markdownText(label)}](${target})`;
  } catch { return markdownText(label); }
}

export function generatePreprocessorResult(
  xml: string,
  url: string = WORKABLE_FEED_URL,
  generatedAt: string = new Date().toISOString()
): PreprocessorResult {
  if (Buffer.byteLength(xml, "utf8") > MAX_FEED_BYTES) throw new Error("Workable feed exceeds byte budget");
  if (XMLValidator.validate(xml) !== true
    || !/^\s*(?:<\?xml[^?]*\?>\s*)?<source>/.test(xml)
    || !/<\/source>\s*$/.test(xml)
    || !/<publisher>\s*(?:<!\[CDATA\[)?Workable(?:\]\]>)?\s*<\/publisher>/.test(xml)) {
    throw new Error("Workable feed is malformed or has an unexpected source/publisher schema");
  }
  const raw = parseWorkableXml(xml);
  const rawJobCount = (xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "").match(/<job(?:\s[^>]*)?>/g) ?? []).length;
  if (!rawJobCount || raw.length !== rawJobCount) {
    throw new Error("Workable feed is empty or contains unsupported job schema; preserving the previous digest");
  }
  const all = [...new Map(raw.map((job) => [job.url, job])).values()];
  // A multi-location posting may repeat a URL with different location flags;
  // retain a plausible variant regardless of which duplicate appears last.
  const plausible = [...new Map(filterPlausibleCandidates(raw).map((job) => [job.url, job])).values()];
  const stats = summarizeFilterStats(all, plausible);

  // Group by company
  const companyCounts = new Map<string, number>();
  for (const job of plausible) {
    companyCounts.set(job.company, (companyCounts.get(job.company) ?? 0) + 1);
  }

  const topCompanies = Array.from(companyCounts.entries())
    .map(([company, count]) => ({ company, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const sampleCandidates = plausible.slice(0, 10);

  return {
    generatedAt,
    sourceUrl: url,
    stats,
    topCompanies,
    sampleCandidates,
    rawParsedPostings: raw.length,
    duplicatePostings: raw.length - all.length,
  };
}

export function renderMarkdownReport(result: PreprocessorResult): string {
  const { stats, topCompanies, sampleCandidates, generatedAt, sourceUrl } = result;

  const lines: string[] = [
    "# Workable Global Feed Candidates (Latest Preprocessor Digest)",
    "",
    `**Generated At**: \`${generatedAt}\``,
    `**Source URL**: ${markdownLink(sourceUrl, sourceUrl)}`,
    "**Operational State**: `OFFLINE_PREPROCESSED` (Zero D1 mutations; exact-six production invariant preserved)",
    "",
    "## 1. Volume & Filter Efficiency",
    "",
    "| Metric | Value | Notes |",
    "| :--- | :--- | :--- |",
    `| **Raw Parsed Postings** | \`${result.rawParsedPostings.toLocaleString()}\` | Valid entries before within-feed deduplication |`,
    `| **Duplicate Postings Removed** | \`${result.duplicatePostings.toLocaleString()}\` | Same original posting URL |`,
    `| **Total Parsed Postings** | \`${stats.totalParsed.toLocaleString()}\` | Unique posting URLs before filtering |`,
    `| **Plausible Candidates** | \`${stats.plausibleCandidates.toLocaleString()}\` | \`remote=true\` OR \`country=PH\` |`,
    `| **Coarse Reduction Rate** | \`${stats.reductionPercent}%\` | Payload reduction before downstream triage |`,
    "",
    "## 2. Top Hiring Companies in Candidate Set",
    "",
    "| Company | Plausible Remote/PH Roles |",
    "| :--- | :--- |",
  ];

  if (topCompanies.length === 0) {
    lines.push("| *(None)* | 0 |");
  } else {
    for (const c of topCompanies) {
      lines.push(`| **${markdownText(c.company)}** | ${c.count} |`);
    }
  }

  lines.push(
    "",
    "## 3. Sample Candidate Postings",
    "",
    "| Role Title | Company | Location | Ref # |",
    "| :--- | :--- | :--- | :--- |"
  );

  if (sampleCandidates.length === 0) {
    lines.push("| *(None)* | — | — | — |");
  } else {
    for (const s of sampleCandidates) {
      const loc = [s.city, s.state, s.country].filter(Boolean).join(", ") || (s.remote ? "Remote" : "Unspecified");
      lines.push(`| ${markdownLink(s.title, s.url)} | ${markdownText(s.company)} | ${markdownText(loc)} | ${markdownText(s.referenceNumber)} |`);
    }
  }

  lines.push(
    "",
    "---",
    "*Preserves $0 infrastructure budget and zero live board pollution. Ingestion subject to ADR-008 risk-tiered admission.*",
    ""
  );

  return lines.join("\n");
}

export async function runPreprocessor(opts: {
  xmlSource?: string;
  outputPath?: string;
  fetchImpl?: typeof fetch;
  maxBytes?: number;
  timeoutMs?: number;
} = {}): Promise<PreprocessorResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const maxBytes = Math.min(opts.maxBytes ?? MAX_FEED_BYTES, MAX_FEED_BYTES);
  const timeoutMs = Math.min(opts.timeoutMs ?? FEED_TIMEOUT_MS, FEED_TIMEOUT_MS);
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || !Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error("Workable feed budgets must be positive integers");
  }
  let xml: string;

  if (opts.xmlSource !== undefined) {
    if (statSync(opts.xmlSource).size > maxBytes) throw new Error("Workable fixture exceeds byte budget");
    xml = readFileSync(opts.xmlSource, "utf-8");
  } else {
    const controller = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error("Workable feed timed out")); }, timeoutMs);
    });
    try {
      xml = await Promise.race([timeout, (async () => {
        const res = await fetchImpl(WORKABLE_FEED_URL, {
          signal: controller.signal,
          headers: { "User-Agent": "va-freelance-hub-workable-preprocessor/1.0 (+https://github.com/cyalcala/va-freelance-hub)" },
        });
        if (!res.ok) throw new Error(`Workable feed HTTP ${res.status}`);
        if (!res.body) throw new Error("Workable feed body is missing");
        reader = res.body.getReader();
        if (Number(res.headers.get("content-length")) > maxBytes) throw new Error("Workable feed exceeds byte budget");
        const decoder = new TextDecoder("utf-8", { fatal: true });
        const chunks: string[] = [];
        let bytes = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > maxBytes) throw new Error("Workable feed exceeds byte budget");
          chunks.push(decoder.decode(value, { stream: true }));
        }
        chunks.push(decoder.decode());
        return chunks.join("");
      })()]);
    } finally {
      clearTimeout(timer);
      controller.abort();
      void reader?.cancel().catch(() => {});
    }
  }

  if (Buffer.byteLength(xml, "utf8") > maxBytes) throw new Error("Workable feed exceeds byte budget");

  const result = generatePreprocessorResult(xml, opts.xmlSource ? `Local fixture: ${opts.xmlSource}` : WORKABLE_FEED_URL);
  const markdown = renderMarkdownReport(result);

  const targetPath = opts.outputPath ?? resolve(process.cwd(), "docs/workable-candidates-latest.md");
  writeFileSync(targetPath, markdown, "utf-8");

  // Step summary in GHA
  if (process.env.GITHUB_STEP_SUMMARY) {
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, markdown, { flag: "a" });
  }

  return result;
}

if (import.meta.main) {
  runPreprocessor()
    .then((res) => {
      console.log(`[EX-09] Preprocessor complete: ${res.stats.totalParsed} parsed, ${res.stats.plausibleCandidates} plausible candidates (${res.stats.reductionPercent}% reduction).`);
    })
    .catch((err) => {
      console.error("[EX-09] Preprocessor failed:", err);
      process.exit(1);
    });
}
