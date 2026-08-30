/**
 * SP-10 — Workable global XML feed adapter (pure parsing + coarse pre-filter).
 *
 * SP-09 (TERMINAL — KEEP) measured the real feed
 * (https://www.workable.com/boards/workable.xml) at tens of MiB / thousands
 * of `<job>` entries — far past `candidate-shadow.ts`'s 512 KiB / 200-item
 * shadow-probe budget and this project's shared 10-minute scrape-tick
 * budget — and decided `GITHUB_ACTION_PREPROCESSING`: a dedicated job with
 * its own time/memory budget must fetch, parse, and coarsely filter this
 * feed down to a manageable candidate set before anything downstream
 * (geoGate, AI triage, D1) ever sees it.
 *
 * This module is that preprocessing step's pure core: `parseWorkableXml`
 * normalizes every documented field (github: help.workable.com feed docs)
 * to a minimal shape, and `filterPlausibleCandidates` applies the coarse
 * remote-OR-Philippines pre-filter that does the actual size reduction
 * (verified live 2026-08-30: 3,741 raw jobs -> 654 after this filter, an
 * 82.5% reduction) — cheap, generic (city/state/country + remote flag
 * only), and never a replacement for this project's own downstream
 * `geoGate` eligibility decision, which still runs on every surviving
 * candidate exactly as it does for every other source.
 *
 * Deliberately excludes `<description>` (full HTML) from the normalized
 * output, matching the minimal-content-scope precedent set by every other
 * adapter this session (fetchGreenhouse, recruitee.ts, teamtailor.ts).
 *
 * This module performs no I/O of its own (see `fetchWorkableFeed` for the
 * thin wrapper) and is never wired into `scrape.ts`'s existing per-tick
 * ATS loop — SP-09's own decision is that this feed must never share that
 * budget.
 */

export const WORKABLE_FEED_URL = "https://www.workable.com/boards/workable.xml";

function extractJobBlocks(xml: string): string[] {
  const out: string[] = [];
  const re = /<job>([\s\S]*?)<\/job>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

function extractCdataField(jobBlock: string, field: string): string | null {
  const re = new RegExp(`<${field}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${field}>`);
  const m = re.exec(jobBlock);
  return m ? m[1].trim() : null;
}

function nonEmpty(v: string | null): string | null {
  return v && v.trim() !== "" ? v.trim() : null;
}

export interface NormalizedWorkablePosting {
  referenceNumber: string;
  title: string;
  url: string;
  company: string;
  city: string | null;
  state: string | null;
  country: string | null;
  remote: boolean;
  jobType: string | null;
  category: string | null;
  postedAt: string | null;
}

function summarizeLocation(city: string | null, state: string | null): string | null {
  const parts = [city, state].filter((s): s is string => s !== null);
  return parts.length > 0 ? parts.join(", ") : null;
}

/** Pure. Never includes `<description>` (full HTML) — actively excluded. */
export function parseWorkableXml(xml: string): NormalizedWorkablePosting[] {
  const jobs = extractJobBlocks(xml);
  const out: NormalizedWorkablePosting[] = [];
  for (const job of jobs) {
    const referenceNumber = nonEmpty(extractCdataField(job, "referencenumber"));
    const title = nonEmpty(extractCdataField(job, "title"));
    const url = nonEmpty(extractCdataField(job, "url"));
    const company = nonEmpty(extractCdataField(job, "company"));
    if (!referenceNumber || !title || !url || !company) continue;
    out.push({
      referenceNumber,
      title,
      url,
      company,
      city: nonEmpty(extractCdataField(job, "city")),
      state: nonEmpty(extractCdataField(job, "state")),
      country: nonEmpty(extractCdataField(job, "country")),
      remote: extractCdataField(job, "remote")?.toLowerCase() === "true",
      jobType: nonEmpty(extractCdataField(job, "jobtype")),
      category: nonEmpty(extractCdataField(job, "category")),
      postedAt: nonEmpty(extractCdataField(job, "date")),
    });
  }
  return out;
}

export interface WorkableFilterStats {
  totalParsed: number;
  plausibleCandidates: number;
  reductionPercent: number;
}

/**
 * Coarse, cheap pre-filter: remote=true OR country=PH. This exists purely
 * to shrink the feed to a manageable size before the shared per-tick
 * budget or the real `geoGate` eligibility decision (packages/scraper/
 * geoGate.ts) ever sees it — it is deliberately looser than geoGate and
 * must never be treated as the actual eligibility decision.
 */
export function filterPlausibleCandidates(postings: NormalizedWorkablePosting[]): NormalizedWorkablePosting[] {
  return postings.filter((p) => p.remote || p.country === "PH");
}

export function summarizeFilterStats(all: NormalizedWorkablePosting[], plausible: NormalizedWorkablePosting[]): WorkableFilterStats {
  return {
    totalParsed: all.length,
    plausibleCandidates: plausible.length,
    reductionPercent: all.length > 0 ? Math.round((1 - plausible.length / all.length) * 1000) / 10 : 0,
  };
}

export { summarizeLocation };

export async function fetchWorkableFeed(opts: { fetchImpl?: typeof fetch } = {}): Promise<{ all: NormalizedWorkablePosting[]; plausible: NormalizedWorkablePosting[]; stats: WorkableFilterStats }> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const res = await fetchImpl(WORKABLE_FEED_URL, {
    headers: { "User-Agent": "va-freelance-hub-workable-preprocessor/1.0 (+https://github.com/cyalcala/va-freelance-hub)" },
  });
  if (!res.ok) throw new Error(`Workable HTTP ${res.status}`);
  const xml = await res.text();
  const all = parseWorkableXml(xml);
  const plausible = filterPlausibleCandidates(all);
  return { all, plausible, stats: summarizeFilterStats(all, plausible) };
}
