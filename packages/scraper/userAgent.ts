/**
 * Crawler identity — the single source of truth for every outbound User-Agent.
 *
 * Why this module exists: the identity had drifted into five different strings
 * across the fetchers. `json.ts` declared an honest bot with a contact URL,
 * `rss.ts` declared an honest bot without one, `html.ts` used the conventional
 * `Mozilla/5.0 (compatible; …; +url)` bot form, and `ats.ts`, `linkHealth.ts`
 * and `verify-links.ts` impersonated Chrome outright. That was drift, not
 * policy — nobody decided it, it accumulated.
 *
 * The project's differentiation is its compliance posture (AGENTS.md), and a
 * transparency claim is only true if the crawler is actually identifiable. One
 * constant, used everywhere, makes the claim auditable.
 *
 * Two identities are defined deliberately, because collection and verification
 * are genuinely different acts:
 *
 *   COLLECTION — we are the crawler. Declare it. A source that refuses a
 *   declared bot has told us something useful, and the compliant response is to
 *   pause and seek permission rather than to disguise the request.
 *
 *   LINK VERIFICATION — we are checking that a link a human is about to click
 *   still resolves. The request stands in for that human's browser, fetches one
 *   page, stores no content, and follows the same redirects the human would.
 *   A bot UA here measures bot reachability, which is not the question being
 *   asked. This is the one case where a browser UA is the honest one.
 *
 * Neither is evasion: no proxy rotation, no fingerprint spoofing, no CAPTCHA
 * handling, no retry-with-a-different-identity. Those remain forbidden by
 * AGENTS.md and the masterplan's §2.2 invariant.
 */

/** Bumped when crawler behavior changes in a way a source operator would care about. */
export const CRAWLER_VERSION = "1.0";

/**
 * Where a source operator can find out who we are and how to opt out.
 *
 * Points at the repository because that page exists and is readable today.
 * The masterplan's Phase 1 adds a `/transparency` route; switch this constant
 * when that page ships, so the UA never advertises a URL that 404s.
 */
export const CRAWLER_CONTACT_URL = "https://github.com/cyalcala/va-freelance-hub";

/**
 * Declared identity for all collection fetches (RSS, JSON, HTML, ATS).
 *
 * Uses the `Mozilla/5.0 (compatible; Name/Version; +url)` form that Googlebot
 * and bingbot use. Despite the `Mozilla/5.0` prefix — a historical artifact
 * every major crawler carries — this is the conventional *declared bot* format,
 * not an impersonation: the product token names us and the URL resolves to a
 * page identifying the operator.
 */
export const COLLECTION_USER_AGENT =
  `Mozilla/5.0 (compatible; RemotePHJobsBot/${CRAWLER_VERSION}; +${CRAWLER_CONTACT_URL})`;

/**
 * Identity for link-liveness checks (directory link health, job link verifier).
 *
 * See the module note: these requests stand in for a human about to click the
 * link, so a browser UA measures the thing actually being asked. Named
 * explicitly so this stays a decision on the record rather than drift.
 */
export const LINK_CHECK_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

/** Ready-made header object for collection fetches. */
export function collectionHeaders(extra?: Record<string, string>): Record<string, string> {
  return { "User-Agent": COLLECTION_USER_AGENT, ...extra };
}

/** Ready-made header object for link-liveness checks. */
export function linkCheckHeaders(extra?: Record<string, string>): Record<string, string> {
  return { "User-Agent": LINK_CHECK_USER_AGENT, ...extra };
}
