import { sql } from "drizzle-orm";

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
 */
export function buildAtsCandidateMiningQuery(limit = 100) {
  return sql`
    SELECT o.company AS company,
           COUNT(*) AS jobs,
           MAX(o.application_url) AS sampleUrl,
           MAX(o.category) AS category
    FROM opportunities o
    WHERE o.ph_eligibility IN ('eligible_verified', 'eligible_likely')
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
 * Mine curated va_directory website links pointing to known ATS platforms.
 */
export function buildDirectoryAtsMiningQuery(limit = 100) {
  return sql`
    SELECT d.company_name AS company,
           1 AS jobs,
           d.website AS sampleUrl,
           d.niche AS category
    FROM va_directory d
    WHERE d.website IS NOT NULL
      AND (
        d.website LIKE '%greenhouse.io%'
        OR d.website LIKE '%lever.co%'
        OR d.website LIKE '%ashbyhq.com%'
        OR d.website LIKE '%breezy.hr%'
        OR d.website LIKE '%workable.com%'
      )
    LIMIT ${limit}
  `;
}
