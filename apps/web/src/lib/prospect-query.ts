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
           (SELECT o2.source_url FROM opportunities o2
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
import { sql } from "drizzle-orm";
