import { sql } from "drizzle-orm";
import { directoryVisibilityFilters } from "./directory-visibility";

// `opportunities` has `posted_at` and `scraped_at`, but no `created_at`.
// Keep the trusted raw fragments here so the cron query and its regression
// contract cannot drift apart when its freshness policy changes.
export const PROSPECT_SAMPLE_FRESHNESS_SQL = "COALESCE(o2.scraped_at, o2.posted_at)";
export const PROSPECT_CANDIDATE_FRESHNESS_SQL = "COALESCE(o.scraped_at, o.posted_at)";

export const POSITIVE_PH_ELIGIBILITY = ["eligible_verified", "eligible_likely"] as const;

export function buildProspectCandidateQuery(input: {
  minimumJobs: number;
  staleCutoff: string;
  limit: number;
}) {
  return sql`
    SELECT o.company AS company,
           COUNT(*) AS jobs,
           (SELECT COALESCE(o2.application_url, o2.source_url) FROM opportunities o2
            WHERE o2.company = o.company
              AND o2.is_active = 1
              AND o2.ph_eligibility IN ('eligible_verified', 'eligible_likely')
            ORDER BY ${sql.raw(PROSPECT_SAMPLE_FRESHNESS_SQL)} DESC LIMIT 1) AS sampleUrl,
           MAX(o.category) AS category
    FROM opportunities o
    WHERE o.is_active = 1
      AND o.ph_eligibility IN ('eligible_verified', 'eligible_likely')
      AND o.company IS NOT NULL AND TRIM(o.company) <> ''
      AND LOWER(o.company) NOT IN (SELECT LOWER(company_name) FROM va_directory)
    GROUP BY LOWER(o.company)
    HAVING COUNT(*) >= ${input.minimumJobs}
      AND MAX(${sql.raw(PROSPECT_CANDIDATE_FRESHNESS_SQL)}) >= ${input.staleCutoff}
    ORDER BY jobs DESC
    LIMIT ${input.limit}
  `;
}

/**
 * Mine active eligible opportunities where application_url points to a known ATS platform.
 * Enables Prospector 2.0 to discover direct ATS candidate feeds even for companies
 * already in va_directory.
 *
 * `is_active = 1` matches `buildProspectCandidateQuery` above and is load-bearing:
 * a deactivated row is withdrawn evidence — the verifier deactivates rows for dead
 * apply links, policy rejection and duplicate supersession — so mining it would mint
 * an ATS candidate whose entire provenance is a row the system no longer stands
 * behind, and would inflate `jobs` with postings nobody can apply to.
 */
export function buildAtsCandidateMiningQuery(limit = 100) {
  return sql`
    SELECT o.company AS company,
           COUNT(*) AS jobs,
           MAX(o.application_url) AS sampleUrl,
           MAX(o.category) AS category
    FROM opportunities o
    WHERE o.is_active = 1
      AND o.ph_eligibility IN ('eligible_verified', 'eligible_likely')
      AND o.application_url IS NOT NULL
      AND (
        o.application_url LIKE '%greenhouse.io%'
        OR o.application_url LIKE '%lever.co%'
        OR o.application_url LIKE '%ashbyhq.com%'
        OR o.application_url LIKE '%breezy.hr%'
        OR o.application_url LIKE '%workable.com%'
      )
    GROUP BY o.company
    ORDER BY jobs DESC
    LIMIT ${limit}
  `;
}

/**
 * Mine curated va_directory hiring page or website links pointing to known ATS platforms.
 *
 * `directoryVisibilityFilters()` is load-bearing here, exactly as it is on `/` and
 * `/directory`. A directory row the public directory hides — not positively
 * identified as Filipino-friendly, or struck three times by the link verifier — is
 * evidence the product does not stand behind, so minting an ATS source candidate
 * from it would record provenance the public surface contradicts. Reusing the
 * shared predicate also means the mining query cannot drift from the surfaces
 * that decide what is publicly visible; for the same reason the table is
 * referenced unqualified, because the predicate qualifies its own columns.
 */
export function buildDirectoryAtsMiningQuery(limit = 100) {
  return sql`
    SELECT company_name AS company,
           1 AS jobs,
           COALESCE(hiring_page_url, website) AS sampleUrl,
           niche AS category
    FROM va_directory
    WHERE ${directoryVisibilityFilters()}
      AND COALESCE(hiring_page_url, website) IS NOT NULL
      AND (
        COALESCE(hiring_page_url, website) LIKE '%greenhouse.io%'
        OR COALESCE(hiring_page_url, website) LIKE '%lever.co%'
        OR COALESCE(hiring_page_url, website) LIKE '%ashbyhq.com%'
        OR COALESCE(hiring_page_url, website) LIKE '%breezy.hr%'
        OR COALESCE(hiring_page_url, website) LIKE '%workable.com%'
      )
    LIMIT ${limit}
  `;
}
