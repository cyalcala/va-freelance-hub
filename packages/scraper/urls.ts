// Apply-URL sanitization (2026-07 audit).
//
// triage.ts asks the LLM to extract an apply link/email from third-party
// description text and previously the raw model string won precedence over
// verified URLs with only a typeof check — so a hallucinated fragment,
// javascript: URL, or bare email could become the stored application_url.
// Every writer should pass candidates through sanitizeApplyUrl and fall back
// to the verified source URL when the candidate does not survive.

const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
const SOURCE_PROTOCOLS = new Set(["http:", "https:"]);

// Pragmatic address shape check for mailto: targets — not RFC-complete.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isLocalOrIpHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return normalized === "localhost"
    || normalized.endsWith(".localhost")
    || normalized.startsWith("[")
    || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized);
}

/**
 * Return a normalized public web URL suitable for storage as a source and
 * later fetching. Source URLs never need mailto: and must not carry embedded
 * credentials, local hosts, or IP addresses.
 */
export function sanitizeSourceUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const candidate = raw.trim();
  if (candidate === "" || candidate.length > 2048) return null;

  try {
    const url = new URL(candidate);
    if (!SOURCE_PROTOCOLS.has(url.protocol) || !url.hostname || !url.hostname.includes(".")) return null;
    if (url.username || url.password || isLocalOrIpHost(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Return a normalized, safe apply URL or null when the candidate is not a
 * usable http(s)/mailto link. Bare email addresses are upgraded to mailto:.
 */
export function sanitizeApplyUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const candidate = raw.trim();
  if (candidate === "" || candidate.length > 2048) return null;

  let url: URL | null = null;
  try {
    url = new URL(candidate);
  } catch {
    url = null;
  }

  if (url) {
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) return null;
    if (url.protocol === "mailto:") {
      return EMAIL_RE.test(url.pathname) ? `mailto:${url.pathname}` : null;
    }
    if (!url.hostname || !url.hostname.includes(".")) return null;
    return url.toString();
  }

  // Not a parseable URL: accept a bare email extracted from a description.
  if (EMAIL_RE.test(candidate)) return `mailto:${candidate}`;
  return null;
}

function normalizedHost(url: URL): string {
  return url.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
}

function atsTenantIdentity(url: URL): string | null {
  const host = normalizedHost(url);
  const path = url.pathname.split("/").filter(Boolean).map((part) => part.toLowerCase());

  if (host === "boards.greenhouse.io" && path[0]) return `greenhouse:${path[0]}`;
  if (host === "boards-api.greenhouse.io" && path[0] === "v1" && path[1] === "boards" && path[2]) {
    return `greenhouse:${path[2]}`;
  }
  if (host === "jobs.lever.co" && path[0]) return `lever:${path[0]}`;
  if (host === "api.lever.co" && path[0] === "v0" && path[1] === "postings" && path[2]) {
    return `lever:${path[2]}`;
  }
  if (host === "jobs.ashbyhq.com" && path[0]) return `ashby:${path[0]}`;
  if (host === "api.ashbyhq.com" && path[0] === "posting-api" && path[1] === "job-board" && path[2]) {
    return `ashby:${path[2]}`;
  }
  return null;
}

function urlsShareApprovedAttribution(candidateUrl: URL, sourceUrl: URL): boolean {
  if (normalizedHost(candidateUrl) === normalizedHost(sourceUrl)) return true;

  const candidateTenant = atsTenantIdentity(candidateUrl);
  const sourceTenant = atsTenantIdentity(sourceUrl);
  return candidateTenant !== null && candidateTenant === sourceTenant;
}

/**
 * Validate an apply URL against its attributable source URL.
 *
 * Protocol validation alone is insufficient: an upstream feed or model can
 * provide a syntactically valid but unrelated hostname. Cross-host links fail
 * closed unless both hosts are known aliases of the same ATS family. Callers
 * should fall back to the sanitized source URL when this returns null.
 */
export function sanitizeApplyUrlForSource(raw: unknown, rawSourceUrl: unknown): string | null {
  const candidate = sanitizeApplyUrl(raw);
  const source = sanitizeSourceUrl(rawSourceUrl);
  if (!candidate || !source || candidate.startsWith("mailto:")) return null;

  try {
    const candidateUrl = new URL(candidate);
    const sourceUrl = new URL(source);
    return urlsShareApprovedAttribution(candidateUrl, sourceUrl)
      ? candidate
      : null;
  } catch {
    return null;
  }
}

export interface ApplicationUrlAnomalyInput {
  company?: string | null;
  sourceUrl: unknown;
  applicationUrl?: unknown;
}

/**
 * Report untrusted application hosts repeated across unrelated companies.
 * Shared ATS families and same-host links are excluded because they are valid
 * multi-tenant infrastructure or attributable source links.
 */
export function findRepeatedCrossCompanyApplyHosts(
  rows: ApplicationUrlAnomalyInput[],
  threshold = 3,
): string[] {
  const companiesByHost = new Map<string, Set<string>>();

  for (const row of rows) {
    const candidate = sanitizeApplyUrl(row.applicationUrl);
    const source = sanitizeSourceUrl(row.sourceUrl);
    const company = row.company?.trim().toLowerCase();
    if (!candidate || !source || !company || candidate.startsWith("mailto:")) continue;

    const candidateUrl = new URL(candidate);
    const sourceUrl = new URL(source);
    const candidateHost = normalizedHost(candidateUrl);
    if (urlsShareApprovedAttribution(candidateUrl, sourceUrl)) continue;

    const companies = companiesByHost.get(candidateHost) ?? new Set<string>();
    companies.add(company);
    companiesByHost.set(candidateHost, companies);
  }

  const minimum = Math.max(2, Math.floor(threshold));
  return [...companiesByHost.entries()]
    .filter(([, companies]) => companies.size >= minimum)
    .map(([host]) => host)
    .sort();
}
