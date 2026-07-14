// Autonomous company discovery ("Prospector") - 2026-07-14.
//
// Mines the jobs the Hunter already ingested for companies not yet in
// va_directory. Every candidate is drawn from an already-eligible remote job,
// so it inherits the Filipino-eligibility filter for free. These pure helpers
// decide which candidates are safe to auto-add; the /api/cron/prospect route
// does the D1 read/write and the workflow orchestrates cadence + proposals.
//
// Two quality gates, both grounded in real production data (2026-07-14 probe):
//  1. Name quality  — reject placeholders/garbage ("Unknown", "Digital", ...).
//  2. Source trust  — only auto-add companies seen in curated high-trust feeds
//     (WeWorkRemotely, RealWorkFromAnywhere, Jobicy, Remotive, ATS). RemoteOK's
//     feed carries recruiter-repost spam ("Recruitlytixs Hirings", ...), so
//     RemoteOK-only candidates are reported for review, never auto-added.

export type AtsPlatform = "lever" | "greenhouse" | "workable" | "breezy" | "ashby";

export interface AtsRef {
  platform: AtsPlatform;
  token: string;
}

/** Canonical key for de-duplicating company names case/space-insensitively. */
export function normalizeCompanyName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

// Names that are placeholders or too generic to be a real company.
const NAME_BLOCKLIST = new Set([
  "unknown", "n/a", "na", "none", "null", "confidential", "undisclosed",
  "private", "various", "multiple", "remote", "digital", "hiring", "hirings",
  "careers", "career", "jobs", "job", "company", "stealth", "stealth startup",
  "recruitment", "recruiter", "staffing", "agency", "client", "employer",
]);

// A single generic word on its own is not a usable company name.
const GENERIC_SINGLE_WORDS = new Set([
  "tech", "technologies", "solutions", "services", "group", "labs", "studio",
  "consulting", "global", "international", "worldwide", "online", "media",
]);

/**
 * True when a scraped company name is specific enough to add to the directory.
 * Conservative: rejects placeholders, too-short names, and bare generic words.
 */
export function isQualityCompanyName(rawName: string | null | undefined): boolean {
  if (typeof rawName !== "string") return false;
  const name = rawName.trim();
  const norm = normalizeCompanyName(name);
  if (norm.length < 3) return false;
  if (NAME_BLOCKLIST.has(norm)) return false;
  // Must contain at least one letter (reject "123", "-", etc.).
  if (!/[a-z]/i.test(norm)) return false;
  const words = norm.split(" ").filter(Boolean);
  // A single bare generic word ("Digital", "Solutions") is not a company.
  if (words.length === 1 && GENERIC_SINGLE_WORDS.has(words[0])) return false;
  return true;
}

// Hosts whose feeds are curated/high-trust enough to auto-add companies from.
// RemoteOK is deliberately excluded (recruiter-repost spam) -> report-only.
const TRUSTED_HOSTS = [
  "weworkremotely.com",
  "realworkfromanywhere.com",
  "jobicy.com",
  "remotive.com",
  "boards.greenhouse.io",
  "boards-api.greenhouse.io",
  "jobs.ashbyhq.com",
  "api.ashbyhq.com",
  "jobs.lever.co",
  "api.lever.co",
  "breezy.hr",
  "apply.workable.com",
];

/** Extract a lowercased hostname from a URL, or null. */
export function hostOf(url: string | null | undefined): string | null {
  if (typeof url !== "string" || !url.trim()) return null;
  try {
    return new URL(url.trim()).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** True when a sample source URL comes from a trusted, auto-add-eligible feed. */
export function isTrustedSourceUrl(url: string | null | undefined): boolean {
  const host = hostOf(url);
  if (!host) return false;
  return TRUSTED_HOSTS.some((t) => host === t || host.endsWith(`.${t}`) || host.endsWith(t));
}

/**
 * Extract an ATS platform + org token from a job's source URL, if the URL is
 * a recognizable ATS posting link. Enables auto-discovery of ATS feeds without
 * manual probing. Returns null for aggregator/unknown URLs.
 */
export function extractAtsToken(url: string | null | undefined): AtsRef | null {
  const host = hostOf(url);
  if (!host || typeof url !== "string") return null;
  let path = "";
  try {
    path = new URL(url).pathname;
  } catch {
    return null;
  }
  const clean = (t: string | undefined) =>
    (t || "").trim().replace(/\/+$/, "").toLowerCase();

  if (host.endsWith("greenhouse.io")) {
    // boards.greenhouse.io/{token}/... or /v1/boards/{token}/...
    const m = path.match(/(?:\/v\d+\/boards)?\/([^/]+)/);
    const token = clean(m?.[1] === "boards" ? undefined : m?.[1]);
    return token ? { platform: "greenhouse", token } : null;
  }
  if (host.endsWith("ashbyhq.com")) {
    // jobs.ashbyhq.com/{token}/... or /posting-api/job-board/{token}
    const m = path.match(/(?:\/posting-api\/job-board)?\/([^/]+)/);
    const token = clean(m?.[1] === "posting-api" ? undefined : m?.[1]);
    return token ? { platform: "ashby", token } : null;
  }
  if (host.endsWith("lever.co")) {
    const m = path.match(/(?:\/v\d+\/postings)?\/([^/]+)/);
    const token = clean(m?.[1] === "postings" ? undefined : m?.[1]);
    return token ? { platform: "lever", token } : null;
  }
  if (host.endsWith("breezy.hr")) {
    // {token}.breezy.hr
    const sub = host.replace(/\.breezy\.hr$/, "");
    return sub && sub !== "breezy" ? { platform: "breezy", token: sub } : null;
  }
  if (host.endsWith("workable.com")) {
    // apply.workable.com/{token}/...
    const m = path.match(/\/([^/]+)/);
    const token = clean(m?.[1]);
    return token ? { platform: "workable", token } : null;
  }
  return null;
}

export interface RawCandidate {
  company: string;
  jobs: number;
  sampleUrl: string | null;
  category?: string | null;
}

export interface ClassifiedCandidate {
  companyName: string;
  normalized: string;
  jobs: number;
  sampleUrl: string | null;
  atsRef: AtsRef | null;
  niche: string;
}

// Map the dominant job category of a candidate to a va_directory niche.
export function inferNiche(category: string | null | undefined): string {
  switch (category) {
    case "tech": return "tech";
    case "customer-service":
    case "admin":
    case "marketing":
    case "design":
    case "finance": return "global-va";
    default: return "global-va";
  }
}

export interface ClassifyResult {
  autoAdd: ClassifiedCandidate[];   // trusted source + quality name -> auto-add
  review: ClassifiedCandidate[];    // quality name but untrusted source -> report only
  rejected: number;                 // failed the name-quality gate
}

/**
 * Split raw candidates into auto-add / review / rejected, applying both gates
 * and skipping any already present in the directory (by normalized name).
 * `existingNormalized` is the set of normalizeCompanyName(...) already in
 * va_directory. Pure: no I/O.
 */
export function classifyCandidates(
  raw: RawCandidate[],
  existingNormalized: Set<string>,
): ClassifyResult {
  const autoAdd: ClassifiedCandidate[] = [];
  const review: ClassifiedCandidate[] = [];
  let rejected = 0;
  const seen = new Set<string>();

  for (const c of raw) {
    const normalized = normalizeCompanyName(c.company || "");
    if (!isQualityCompanyName(c.company)) { rejected++; continue; }
    if (existingNormalized.has(normalized) || seen.has(normalized)) continue;
    seen.add(normalized);

    const classified: ClassifiedCandidate = {
      companyName: c.company.trim(),
      normalized,
      jobs: c.jobs,
      sampleUrl: c.sampleUrl ?? null,
      atsRef: extractAtsToken(c.sampleUrl),
      niche: inferNiche(c.category),
    };

    if (isTrustedSourceUrl(c.sampleUrl)) autoAdd.push(classified);
    else review.push(classified);
  }

  return { autoAdd, review, rejected };
}
