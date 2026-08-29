#!/usr/bin/env bun
/**
 * SP-09: Workable global XML feed feasibility decision.
 *
 * This is a MEASUREMENT tool, not an adapter. It fetches (or analyzes an
 * already-fetched copy of) Workable's official global job feed —
 * https://www.workable.com/boards/workable.xml, documented at
 * https://help.workable.com/hc/en-us/articles/4420464031767-Utilizing-the-XML-Job-Feed
 * as a public, unauthenticated, hourly-updated feed intended for job boards
 * and partners without an existing integration — and answers exactly one
 * question: should the runtime that eventually consumes it (SP-10, a
 * separate unit) be inline Worker streaming inside the existing 10-minute
 * scrape cron tick, a scheduled GitHub Action doing the heavy lifting outside
 * that shared budget, or should activation stay PAUSED.
 *
 * It performs zero D1 writes, zero opportunity publication, and does not
 * enable any per-token Workable adapter — this unit is a decision, not an
 * implementation.
 *
 * External content (the fetched XML) is evidence only: this module never
 * evals it, and the CLI never persists the raw feed body — only the
 * computed FeedAnalysis (byte counts, item counts, field presence, a short
 * text sample) is small enough to be legitimate evidence to keep.
 *
 * CLI:
 *   bun scripts/diagnostics/workable-feasibility.ts probe [--url URL] [--out file.json]
 *       single bounded live fetch + analysis; prints (and optionally saves)
 *       the FeedAnalysis JSON — never the raw feed body.
 *   bun scripts/diagnostics/workable-feasibility.ts analyze <xmlFile>
 *       analyze an already-downloaded local XML file (for reproducing a
 *       measurement without a new network request).
 *   bun scripts/diagnostics/workable-feasibility.ts report <analysisJson>
 *       render the markdown feasibility decision from a saved FeedAnalysis.
 */

export const WORKABLE_FEED_URL = "https://www.workable.com/boards/workable.xml";
export const WORKABLE_FEED_DOC_URL =
  "https://help.workable.com/hc/en-us/articles/4420464031767-Utilizing-the-XML-Job-Feed";

// Documented schema fields (https://help.workable.com/.../Utilizing-the-XML-Job-Feed).
export const DOCUMENTED_FIELDS = [
  "title", "date", "referencenumber", "url", "company", "city", "state",
  "country", "remote", "postalcode", "description", "education", "jobtype",
  "category", "experience", "website",
] as const;

// ─── Pure parsing (regex-based; this is a one-off manual diagnostic, not the
// production hot path, so a full XML parser dependency is not required to
// answer a feasibility question) ────────────────────────────────────────────

export function extractJobBlocks(xml: string): string[] {
  const out: string[] = [];
  const re = /<job>([\s\S]*?)<\/job>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

export function extractCdataField(jobBlock: string, field: string): string | null {
  const re = new RegExp(`<${field}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${field}>`);
  const m = re.exec(jobBlock);
  return m ? m[1] : null;
}

export function extractPublisher(xml: string): string | null {
  const m = /<publisher>\s*(?:<!\[CDATA\[)?([^<\]]*)/.exec(xml);
  return m ? m[1].trim() : null;
}

export function isSourceRoot(xml: string): boolean {
  return /<source>/i.test(xml.slice(0, 500));
}

// ─── Analysis ───────────────────────────────────────────────────────────────

export interface CountryCount {
  country: string;
  count: number;
}

export interface FeedAnalysis {
  fetchedAt: string;
  url: string;
  byteLength: number;
  rootIsSource: boolean;
  publisher: string | null;
  jobCountRaw: number;
  distinctByUrl: number;
  duplicatedUrlValues: number;
  remoteTrue: number;
  remoteFalse: number;
  topCountries: CountryCount[];
  phCount: number;
  avgJobBytes: number;
  avgDescriptionBytes: number;
  missingDocumentedFields: string[];
  sampleFieldsPresent: string[];
}

/** Pure: same xml string always produces the same analysis. */
export function analyzeFeed(xml: string, url: string, fetchedAt: string): FeedAnalysis {
  const jobs = extractJobBlocks(xml);
  const urlCounts = new Map<string, number>();
  let remoteTrue = 0;
  let remoteFalse = 0;
  let phCount = 0;
  let descBytesTotal = 0;
  let descCount = 0;
  const countryCounts = new Map<string, number>();

  for (const job of jobs) {
    const jobUrl = extractCdataField(job, "url");
    if (jobUrl) urlCounts.set(jobUrl, (urlCounts.get(jobUrl) ?? 0) + 1);

    const remote = extractCdataField(job, "remote");
    if (remote?.trim().toLowerCase() === "true") remoteTrue++;
    else if (remote?.trim().toLowerCase() === "false") remoteFalse++;

    const country = extractCdataField(job, "country");
    if (country) {
      const c = country.trim().toUpperCase();
      countryCounts.set(c, (countryCounts.get(c) ?? 0) + 1);
      if (c === "PH") phCount++;
    }

    const desc = extractCdataField(job, "description");
    if (desc !== null) {
      descBytesTotal += Buffer.byteLength(desc, "utf-8");
      descCount++;
    }
  }

  const duplicatedUrlValues = [...urlCounts.values()].filter((n) => n > 1).length;
  const topCountries = [...countryCounts.entries()]
    .map(([country, count]): CountryCount => ({ country, count }))
    .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country))
    .slice(0, 15);

  const sample = jobs[0] ?? "";
  const missingDocumentedFields = DOCUMENTED_FIELDS.filter((f) => extractCdataField(sample, f) === null && !new RegExp(`<${f}>`).test(sample));
  const sampleFieldsPresent = DOCUMENTED_FIELDS.filter((f) => !missingDocumentedFields.includes(f));

  const byteLength = Buffer.byteLength(xml, "utf-8");

  return {
    fetchedAt,
    url,
    byteLength,
    rootIsSource: isSourceRoot(xml),
    publisher: extractPublisher(xml),
    jobCountRaw: jobs.length,
    distinctByUrl: urlCounts.size,
    duplicatedUrlValues,
    remoteTrue,
    remoteFalse,
    topCountries,
    phCount,
    avgJobBytes: jobs.length > 0 ? Math.round(byteLength / jobs.length) : 0,
    avgDescriptionBytes: descCount > 0 ? Math.round(descBytesTotal / descCount) : 0,
    missingDocumentedFields,
    sampleFieldsPresent,
  };
}

// ─── Runtime decision ───────────────────────────────────────────────────────
// Thresholds are about the SHARED per-tick budget: the existing 10-minute
// scrape cron tick already fetches ~6 other sources and runs AI triage in one
// Cloudflare Workers/Pages Functions invocation. A single additional source
// that would need to buffer and DOM-parse tens of MB (with parsed-JS-object
// overhead typically 2-4x raw bytes) risks that invocation's shared CPU-time
// and memory budget, independent of the existing 50-subrequest/invocation
// ceiling (this is one subrequest, but a very large, slow one). These
// thresholds are a single-source share of that shared budget, not a
// Cloudflare platform hard limit.

export const WORKER_INLINE_MAX_BYTES = 5 * 1024 * 1024; // 5 MiB
export const WORKER_INLINE_MAX_ITEMS = 2000;

export type RuntimeDecision = "worker_streaming" | "github_action_preprocessing" | "paused";

export interface FeasibilityDecision {
  decision: RuntimeDecision;
  reasons: string[];
}

export function classifyRuntime(a: FeedAnalysis): FeasibilityDecision {
  const reasons: string[] = [];

  if (a.missingDocumentedFields.length > 0) {
    return {
      decision: "paused",
      reasons: [`Sampled job is missing documented field(s): ${a.missingDocumentedFields.join(", ")} — schema does not match the provider's own documentation; do not build against an unverified schema.`],
    };
  }
  if (!a.rootIsSource || a.jobCountRaw === 0) {
    return {
      decision: "paused",
      reasons: ["Feed root is not the documented <source> element or contains zero <job> entries — cannot verify feed structure."],
    };
  }

  const overByteBudget = a.byteLength > WORKER_INLINE_MAX_BYTES;
  const overItemBudget = a.jobCountRaw > WORKER_INLINE_MAX_ITEMS;

  if (overByteBudget) {
    reasons.push(`${(a.byteLength / (1024 * 1024)).toFixed(1)} MiB exceeds the ${(WORKER_INLINE_MAX_BYTES / (1024 * 1024)).toFixed(0)} MiB single-source inline-Worker share of the shared 10-minute-tick budget (which also fetches ~6 other sources and runs AI triage in the same invocation).`);
  }
  if (overItemBudget) {
    reasons.push(`${a.jobCountRaw} raw entries exceeds the ${WORKER_INLINE_MAX_ITEMS}-item single-source inline-Worker share (normalize + geo-gate + dedupe + triage on this many records in one shared invocation risks CPU-time/memory pressure on the other sources in the same tick).`);
  }

  if (overByteBudget || overItemBudget) {
    reasons.push("A dedicated hourly GitHub Actions job (matching the feed's own hourly update cadence) has no such shared-tick budget: ample RAM/CPU/time to fetch, filter to remote/PH-relevant candidates, normalize, and hand off to D1 independently of the Worker's per-tick budget — the same pattern this repo already uses for Prospector/directory maintenance.");
    return { decision: "github_action_preprocessing", reasons };
  }

  reasons.push(`${(a.byteLength / 1024).toFixed(0)} KiB and ${a.jobCountRaw} entries fit comfortably within a single source's share of the shared Worker tick budget.`);
  return { decision: "worker_streaming", reasons };
}

// ─── Report ─────────────────────────────────────────────────────────────────

export function renderReport(a: FeedAnalysis, d: FeasibilityDecision): string {
  const lines: string[] = [];
  lines.push(`# Workable global XML feed feasibility (SP-09)`);
  lines.push("");
  lines.push(`- **Feed:** \`${a.url}\``);
  lines.push(`- **Documented at:** <${WORKABLE_FEED_DOC_URL}> (no auth; updated hourly; "more frequent consumption is unnecessary"; job URLs must not be altered — attribution requirement)`);
  lines.push(`- **Fetched at:** ${a.fetchedAt}`);
  lines.push(`- **Decision:** **${d.decision.toUpperCase()}**`);
  lines.push("");
  lines.push(`## Measurements`);
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`| --- | ---: |`);
  lines.push(`| Byte size | ${a.byteLength.toLocaleString()} (${(a.byteLength / (1024 * 1024)).toFixed(2)} MiB) |`);
  lines.push(`| Root element is \`<source>\` | ${a.rootIsSource} |`);
  lines.push(`| Publisher | ${a.publisher ?? "(none)"} |`);
  lines.push(`| Raw \`<job>\` entries | ${a.jobCountRaw.toLocaleString()} |`);
  lines.push(`| Distinct by \`<url>\` | ${a.distinctByUrl.toLocaleString()} |`);
  lines.push(`| \`<url>\` values appearing more than once (within one fetch) | ${a.duplicatedUrlValues.toLocaleString()} |`);
  lines.push(`| \`remote=true\` | ${a.remoteTrue.toLocaleString()} |`);
  lines.push(`| \`remote=false\` | ${a.remoteFalse.toLocaleString()} |`);
  lines.push(`| \`country=PH\` | ${a.phCount.toLocaleString()} |`);
  lines.push(`| Avg bytes / job (whole feed ÷ entries) | ${a.avgJobBytes.toLocaleString()} |`);
  lines.push(`| Avg \`<description>\` bytes | ${a.avgDescriptionBytes.toLocaleString()} |`);
  lines.push(`| Missing documented fields (sampled job) | ${a.missingDocumentedFields.length === 0 ? "none" : a.missingDocumentedFields.join(", ")} |`);
  lines.push("");
  lines.push(`## Top countries`);
  lines.push("");
  lines.push(`| country | count |`);
  lines.push(`| --- | ---: |`);
  for (const c of a.topCountries) lines.push(`| ${c.country} | ${c.count} |`);
  lines.push("");
  lines.push(`## Decision reasoning`);
  lines.push("");
  for (const r of d.reasons) lines.push(`- ${r}`);
  lines.push("");
  lines.push(`## Notes`);
  lines.push("");
  lines.push(`- Within-fetch duplicate \`<job>\` blocks sharing the same \`<url>\`/\`<referencenumber>\` were observed (same posting emitted more than once in one feed pull) — a future adapter must dedupe by \`url\` *within* a single fetch, not only across fetches. This is handled generically by this project's existing URL-based dedup stage, not a special case.`);
  lines.push(`- \`<date>\` values in the sample span multiple years (evergreen/long-running postings), not just recently-posted jobs — a future adapter's "first seen" must use this project's own \`scraped_at\` insert instant (as SP-01/SP-02 already established), never the feed's \`<date>\` field.`);
  lines.push(`- This unit performs zero D1 writes and enables no per-token Workable adapter. It only decides the runtime shape for a future SP-10 implementation unit.`);
  lines.push("");
  return lines.join("\n");
}

// ─── CLI ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const [, , cmd, ...rest] = process.argv;

  switch (cmd) {
    case "probe": {
      const urlIdx = rest.indexOf("--url");
      const url = urlIdx >= 0 ? rest[urlIdx + 1] : WORKABLE_FEED_URL;
      const outIdx = rest.indexOf("--out");
      const outPath = outIdx >= 0 ? rest[outIdx + 1] : undefined;

      const fetchedAt = new Date().toISOString();
      const res = await fetch(url, {
        headers: { "User-Agent": "va-freelance-hub-feasibility-probe/1.0 (+https://github.com/cyalcala/va-freelance-hub)" },
      });
      if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`);
      const xml = await res.text();
      const analysis = analyzeFeed(xml, url, fetchedAt);
      const decision = classifyRuntime(analysis);
      const out = JSON.stringify({ analysis, decision }, null, 2) + "\n";
      if (outPath) {
        const { writeFileSync } = await import("fs");
        writeFileSync(outPath, out);
      }
      process.stdout.write(out);
      return;
    }
    case "analyze": {
      const xmlFile = rest[0];
      if (!xmlFile) throw new Error("analyze requires <xmlFile>");
      const { readFileSync, statSync } = await import("fs");
      const xml = readFileSync(xmlFile, "utf-8");
      const fetchedAt = statSync(xmlFile).mtime.toISOString();
      const analysis = analyzeFeed(xml, WORKABLE_FEED_URL, fetchedAt);
      const decision = classifyRuntime(analysis);
      process.stdout.write(JSON.stringify({ analysis, decision }, null, 2) + "\n");
      return;
    }
    case "report": {
      const analysisPath = rest[0];
      if (!analysisPath) throw new Error("report requires <analysisJson>");
      const { readFileSync } = await import("fs");
      const parsed = JSON.parse(readFileSync(analysisPath, "utf-8")) as { analysis: FeedAnalysis; decision: FeasibilityDecision };
      process.stdout.write(renderReport(parsed.analysis, parsed.decision).replace(/\s*$/, "") + "\n");
      return;
    }
    default:
      process.stderr.write("Usage: workable-feasibility.ts <probe [--url URL] [--out file.json]|analyze <xmlFile>|report <analysisJson>>\n");
      process.exit(2);
  }
}

if (import.meta.main) {
  main().catch((err) => {
    process.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
    process.exit(1);
  });
}
