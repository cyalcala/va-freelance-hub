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

import { writeFileSync, existsSync } from "fs";
import { resolve } from "path";
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
}

export function generatePreprocessorResult(
  xml: string,
  url: string = WORKABLE_FEED_URL,
  generatedAt: string = new Date().toISOString()
): PreprocessorResult {
  const all = parseWorkableXml(xml);
  const plausible = filterPlausibleCandidates(all);
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
  };
}

export function renderMarkdownReport(result: PreprocessorResult): string {
  const { stats, topCompanies, sampleCandidates, generatedAt, sourceUrl } = result;

  const lines: string[] = [
    "# Workable Global Feed Candidates (Latest Preprocessor Digest)",
    "",
    `**Generated At**: \`${generatedAt}\``,
    `**Source URL**: [${sourceUrl}](${sourceUrl})`,
    "**Operational State**: `OFFLINE_PREPROCESSED` (Zero D1 mutations; exact-six production invariant preserved)",
    "",
    "## 1. Volume & Filter Efficiency",
    "",
    "| Metric | Value | Notes |",
    "| :--- | :--- | :--- |",
    `| **Total Parsed Postings** | \`${stats.totalParsed.toLocaleString()}\` | Raw valid postings in global XML feed |`,
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
      lines.push(`| **${c.company}** | ${c.count} |`);
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
      lines.push(`| [${s.title}](${s.url}) | ${s.company} | ${loc} | \`${s.referenceNumber}\` |`);
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
} = {}): Promise<PreprocessorResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  let xml: string;

  if (opts.xmlSource && existsSync(opts.xmlSource)) {
    const { readFileSync } = await import("fs");
    xml = readFileSync(opts.xmlSource, "utf-8");
  } else {
    const res = await fetchImpl(WORKABLE_FEED_URL, {
      headers: {
        "User-Agent": "va-freelance-hub-workable-preprocessor/1.0 (+https://github.com/cyalcala/va-freelance-hub)",
      },
    });
    if (!res.ok) throw new Error(`Workable feed HTTP ${res.status}`);
    xml = await res.text();
  }

  const result = generatePreprocessorResult(xml);
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