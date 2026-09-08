#!/usr/bin/env bun
/**
 * EX-09: Workable Global XML Feed Preprocessor (Pillar A / H).
 *
 * Runs as a standalone scheduled GitHub Action outside the 10-minute
 * Cloudflare Worker scrape tick to prevent memory and subrequest exhaustion.
 *
 * 1. Fetches official Workable global job feed (or local XML fixture).
 * 2. Streams XML to bounded temporary storage and uses Python SAX to discard
 *    descriptions before loading at most 32 MiB of projected metadata.
 * 3. Coarsely filters plausible candidates (remote=true OR country=PH).
 * 4. Aggregates hiring companies and candidate metrics.
 * 5. Writes docs/workable-candidates-latest.md operational evidence.
 * 6. Performs ZERO Cloudflare D1 writes and ZERO live board publishing.
 */

import { writeFileSync, readFileSync, statSync, mkdtempSync, rmSync, openSync, closeSync, writeSync } from "fs";
import { resolve, join } from "path";
import { tmpdir } from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { checkRobots, type RobotsCacheEntry } from "../../packages/scraper/robotsGate";
import {
  parseWorkableXml,
  isWellFormedWorkableXml,
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

export const MAX_FEED_BYTES = 512 * 1024 * 1024;
export const MAX_PROJECTION_BYTES = 32 * 1024 * 1024;
export const FEED_TIMEOUT_MS = 120_000;
export const WORKABLE_USER_AGENT_TOKEN = "va-freelance-hub-workable-preprocessor";
const WORKABLE_USER_AGENT = `${WORKABLE_USER_AGENT_TOKEN}/1.0 (+https://github.com/cyalcala/va-freelance-hub)`;

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
  if (Buffer.byteLength(xml, "utf8") > MAX_PROJECTION_BYTES) throw new Error("Inline XML exceeds byte budget; use the streaming preprocessor");
  if (!isWellFormedWorkableXml(xml)
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
  return analyzePostings(raw, url, generatedAt);
}

function analyzePostings(raw: NormalizedWorkablePosting[], url: string, generatedAt: string): PreprocessorResult {
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

const execFileAsync = promisify(execFile);
let pythonRuntime: Promise<string[]> | undefined;

async function findPythonRuntime(): Promise<string[]> {
  // A failed discovery is retryable after Python is installed; successful
  // discovery is shared by fixture tests and repeated runs in this process.
  pythonRuntime ??= (async () => {
    const candidates = process.platform === "win32" ? [["py", "-3"], ["python3"], ["python"]] : [["python3"], ["python"]];
    for (const [command, ...args] of candidates) {
      try {
        await execFileAsync(command, [...args, "-c", "import sys, xml.sax; assert sys.version_info >= (3, 9)"],
          { timeout: 5000, maxBuffer: 4096, windowsHide: true });
        return [command, ...args];
      } catch { /* Try the documented platform fallback; never download Python. */ }
    }
    throw new Error("Python 3.9+ with the standard library is required for bounded Workable XML projection (py -3 on Windows, python3 on Unix)");
  })().catch((error) => { pythonRuntime = undefined; throw error; });
  return pythonRuntime;
}

async function projectDownloadedFeed(sourcePath: string, projectionPath: string, maxBytes: number, timeoutMs: number): Promise<NormalizedWorkablePosting[]> {
  const startedAt = Date.now();
  const [command, ...prefix] = await findPythonRuntime();
  const remaining = timeoutMs - (Date.now() - startedAt);
  if (remaining <= 0) throw new Error("Workable projection timed out during Python availability check");
  await execFileAsync(command, [...prefix, resolve(import.meta.dir, "../analytics/workable_xml_project.py"),
    "--input", sourcePath, "--output", projectionPath,
    "--max-input-bytes", String(maxBytes), "--max-output-bytes", String(MAX_PROJECTION_BYTES),
    "--timeout-seconds", String(remaining / 1000)],
  { timeout: remaining, maxBuffer: 16 * 1024, windowsHide: true });
  if (statSync(projectionPath).size > MAX_PROJECTION_BYTES) throw new Error("Workable projection exceeds byte budget");
  const projected = readFileSync(projectionPath, "utf8");
  const rows = projected.trim().split("\n").map((line) => JSON.parse(line) as NormalizedWorkablePosting);
  if (!rows.length || rows.length > 100_000) throw new Error("Workable projection is empty or exceeds the posting budget");
  return rows;
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
    "*No new paid service; billing has not been independently measured. No D1 writes or publication. Admission requires current evidence under ADR-007 and the full cutover predicate; ADR-008 tier summaries are advisory.*",
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
  tempRoot?: string;
} = {}): Promise<PreprocessorResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const maxBytes = Math.min(opts.maxBytes ?? MAX_FEED_BYTES, MAX_FEED_BYTES);
  const timeoutMs = Math.min(opts.timeoutMs ?? FEED_TIMEOUT_MS, FEED_TIMEOUT_MS);
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || !Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error("Workable feed budgets must be positive integers");
  }
  const startedAt = Date.now();
  const temporaryDirectory = mkdtempSync(join(opts.tempRoot ?? tmpdir(), "va-workable-stream-"));
  const downloadPath = join(temporaryDirectory, "feed.xml");
  const projectionPath = join(temporaryDirectory, "metadata.jsonl");
  let xml: string | undefined;
  try {
    if (opts.xmlSource !== undefined) {
      if (statSync(opts.xmlSource).size > maxBytes) throw new Error("Workable fixture exceeds byte budget");
      // Small offline fixtures keep the existing pure TypeScript behavior.
      if (statSync(opts.xmlSource).size <= 1024 * 1024) xml = readFileSync(opts.xmlSource, "utf-8");
    } else {
      const descriptor = openSync(downloadPath, "wx");
      const controller = new AbortController();
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error("Workable feed timed out")); }, timeoutMs);
      });
      try {
        await Promise.race([timeout, (async () => {
          const cache = new Map<string, RobotsCacheEntry>();
          const robots = await checkRobots(WORKABLE_FEED_URL, {
            mode: "enforce",
            userAgentToken: WORKABLE_USER_AGENT_TOKEN,
            userAgent: WORKABLE_USER_AGENT,
            timeoutMs: Math.min(timeoutMs, 10_000),
            store: {
              get: async (origin) => cache.get(origin) ?? null,
              put: async (entry) => { cache.set(entry.origin, entry); },
            },
            fetchImpl: ((input: RequestInfo | URL, init?: RequestInit) => fetchImpl(input, {
              ...init,
              redirect: "error",
              signal: init?.signal ? AbortSignal.any([controller.signal, init.signal]) : controller.signal,
            })) as typeof fetch,
          });
          if (!robots.allowed || robots.verdict !== "allowed") throw new Error(`Workable robots ${robots.verdict}: ${robots.evidence}`);
          const delayMs = (robots.crawlDelay ?? 0) * 1000;
          if (!Number.isFinite(delayMs) || delayMs < 0 || delayMs > 60_000) throw new Error("Workable robots crawl-delay exceeds the 60-second wait budget");
          if (delayMs > 0) {
            await new Promise<void>((resolveDelay, rejectDelay) => {
              if (controller.signal.aborted) { rejectDelay(new Error("Workable feed timed out")); return; }
              const onAbort = () => { clearTimeout(delayTimer); rejectDelay(new Error("Workable feed timed out")); };
              const delayTimer = setTimeout(() => { controller.signal.removeEventListener("abort", onAbort); resolveDelay(); }, delayMs);
              controller.signal.addEventListener("abort", onAbort, { once: true });
            });
          }
          await findPythonRuntime();
          controller.signal.throwIfAborted();
          const res = await fetchImpl(WORKABLE_FEED_URL, {
            signal: controller.signal,
            redirect: "error",
            headers: { "User-Agent": WORKABLE_USER_AGENT },
          });
          controller.signal.throwIfAborted();
          if (!res.ok) throw new Error(`Workable feed HTTP ${res.status}`);
          if (!res.body) throw new Error("Workable feed body is missing");
          reader = res.body.getReader();
          if (Number(res.headers.get("content-length")) > maxBytes) throw new Error("Workable feed exceeds byte budget");
          let bytes = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.signal.throwIfAborted();
            if (Date.now() - startedAt >= timeoutMs) throw new Error("Workable feed timed out");
            bytes += value.byteLength;
            if (bytes > maxBytes) throw new Error("Workable feed exceeds byte budget");
            let offset = 0;
            while (offset < value.byteLength) {
              const written = writeSync(descriptor, value, offset, value.byteLength - offset);
              if (written <= 0) throw new Error("Workable temporary-file write made no progress");
              offset += written;
            }
          }

        })()]);
      } finally {
        clearTimeout(timer);
        controller.abort();
        void reader?.cancel().catch(() => {});
        closeSync(descriptor);
      }
    }

    const sourceUrl = opts.xmlSource ? `Local fixture: ${opts.xmlSource}` : WORKABLE_FEED_URL;
    let result: PreprocessorResult;
    if (xml !== undefined) {
      if (Buffer.byteLength(xml, "utf8") > maxBytes) throw new Error("Workable feed exceeds byte budget");
      result = generatePreprocessorResult(xml, sourceUrl);
    } else {
      const remaining = timeoutMs - (Date.now() - startedAt);
      if (remaining <= 0) throw new Error("Workable feed timed out before projection");
      const rows = await projectDownloadedFeed(opts.xmlSource ?? downloadPath, projectionPath, maxBytes, remaining);
      result = analyzePostings(rows, sourceUrl, new Date().toISOString());
    }
    const markdown = renderMarkdownReport(result);
    if (Date.now() - startedAt >= timeoutMs) throw new Error("Workable processing exceeded its time budget");

    const targetPath = opts.outputPath ?? resolve(process.cwd(), "docs/workable-candidates-latest.md");
    writeFileSync(targetPath, markdown, "utf-8");

    // Step summary in GHA
    if (process.env.GITHUB_STEP_SUMMARY) {
      writeFileSync(process.env.GITHUB_STEP_SUMMARY, markdown, { flag: "a" });
    }

    return result;
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
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

