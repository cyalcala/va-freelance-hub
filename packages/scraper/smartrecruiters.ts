/**
 * SP-13 — SmartRecruiters public Posting API adapter (pure parsing, plus a
 * thin fetch wrapper). This is a genuinely NEW adapter — SmartRecruiters is
 * not one of the five platforms in `AtsPlatform` (packages/scraper/ats.ts)
 * and this file intentionally does not extend that shared union or touch
 * scrape.ts's existing ATS fetch loop, keeping this unit self-contained and
 * non-invasive to the live cron path.
 *
 * Verified live against real accounts this session (not fabricated): the
 * public list endpoint requires no authentication and returns
 * `{ offset, limit, totalFound, content: [...] }`. Each item in `content`
 * already carries `visibility: "PUBLIC" | ...` — the active/public signal —
 * and NO full description (`jobAd`) at all, so the list response is
 * genuinely minimal by API design; nothing needs to be actively stripped.
 *
 * The list response does NOT include a canonical apply/posting URL — only
 * the per-posting detail endpoint does. Fetching detail per item would be
 * an N+1 pattern this project avoids for bounded-request reasons, so
 * `derivePostingUrl` reconstructs it deterministically from `id` + a
 * slugified `name`. This was verified against two real live postings
 * (including one with a trailing space in the name, which SmartRecruiters
 * renders as a trailing hyphen — `deriveSmartRecruitersSlug` reproduces
 * this exactly) but is not an officially documented guarantee from
 * SmartRecruiters; treat it as a verified-against-samples heuristic, not a
 * contractual API behavior.
 *
 * Official docs: https://developers.smartrecruiters.com/docs/posting-api
 */

export const SMARTRECRUITERS_JOBS_HOST = "jobs.smartrecruiters.com";
export const SMARTRECRUITERS_API_HOST = "api.smartrecruiters.com";

export function smartRecruitersListUrl(companyIdentifier: string, offset = 0, limit = 100): string {
  return `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(companyIdentifier)}/postings?offset=${offset}&limit=${limit}`;
}

/** Verified against real samples: lowercase, each run of non-alphanumeric
 * characters becomes one hyphen, no trimming (SmartRecruiters keeps a
 * trailing hyphen from a trailing space, observed live). */
export function deriveSmartRecruitersSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function deriveSmartRecruitersPostingUrl(companyIdentifier: string, id: string, name: string): string {
  return `https://${SMARTRECRUITERS_JOBS_HOST}/${encodeURIComponent(companyIdentifier)}/${id}-${deriveSmartRecruitersSlug(name)}`;
}

export interface SmartRecruitersRawPosting {
  id: string;
  name: string;
  visibility?: string;
  releasedDate?: string;
  location?: {
    city?: string;
    region?: string;
    country?: string;
    remote?: boolean;
    hybrid?: boolean;
    fullLocation?: string;
  };
  department?: { label?: string };
  typeOfEmployment?: { label?: string };
  company?: { identifier?: string; name?: string };
}

export interface SmartRecruitersListResponse {
  offset: number;
  limit: number;
  totalFound: number;
  content: SmartRecruitersRawPosting[];
}

export interface NormalizedSmartRecruitersPosting {
  id: string;
  title: string;
  companyIdentifier: string;
  postingUrl: string;
  locationSummary: string | null;
  department: string | null;
  typeOfEmployment: string | null;
  postedAt: string | null;
}

/** Pure. Filters to visibility === "PUBLIC" (SP-13's active/public
 * visibility criterion) and normalizes to minimal content only — no
 * description/jobAd, matching the plan's minimal-content requirement. */
export function parseSmartRecruitersListResponse(
  raw: SmartRecruitersListResponse,
  companyIdentifier: string,
): NormalizedSmartRecruitersPosting[] {
  if (!raw || !Array.isArray(raw.content)) return [];
  return raw.content
    .filter((p) => p && p.id && p.name && p.visibility === "PUBLIC")
    .map((p) => {
      const loc = p.location;
      const locationSummary = loc?.fullLocation
        ? loc.fullLocation
        : [loc?.city, loc?.region, loc?.country].filter(Boolean).join(", ") || null;
      return {
        id: p.id,
        title: p.name.trim(),
        companyIdentifier: p.company?.identifier ?? companyIdentifier,
        postingUrl: deriveSmartRecruitersPostingUrl(p.company?.identifier ?? companyIdentifier, p.id, p.name),
        locationSummary,
        department: p.department?.label ?? null,
        typeOfEmployment: p.typeOfEmployment?.label ?? null,
        postedAt: p.releasedDate ?? null,
      };
    });
}

/** Pure. offset/limit/totalFound pagination — deterministic and testable
 * without a network call. */
export function hasMoreSmartRecruitersPages(totalFound: number, offset: number, limit: number): boolean {
  return offset + limit < totalFound;
}

export async function fetchSmartRecruitersPostings(
  companyIdentifier: string,
  opts: { offset?: number; limit?: number; fetchImpl?: typeof fetch } = {},
): Promise<{ postings: NormalizedSmartRecruitersPosting[]; totalFound: number; hasMore: boolean }> {
  const offset = opts.offset ?? 0;
  const limit = opts.limit ?? 100;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const res = await fetchImpl(smartRecruitersListUrl(companyIdentifier, offset, limit));
  if (!res.ok) throw new Error(`SmartRecruiters HTTP ${res.status}`);
  const raw = (await res.json()) as SmartRecruitersListResponse;
  return {
    postings: parseSmartRecruitersListResponse(raw, companyIdentifier),
    totalFound: raw.totalFound,
    hasMore: hasMoreSmartRecruitersPages(raw.totalFound, offset, limit),
  };
}
