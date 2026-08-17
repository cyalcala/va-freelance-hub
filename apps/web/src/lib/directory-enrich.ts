import { sql, eq } from "drizzle-orm";
import { getDb, vaDirectory, opportunities } from "@va-hub/db";
import { nowUtcIso } from "@/lib/time";

const ATS_CAREER_URLS: Record<string, (token: string) => string> = {
  greenhouse: (t) => `https://boards.greenhouse.io/${t}`,
  lever: (t) => `https://jobs.lever.co/${t}`,
  ashby: (t) => `https://jobs.ashbyhq.com/${t}`,
  breezy: (t) => `https://${t}.breezy.hr`,
  workable: (t) => `https://apply.workable.com/${t}`,
};

export interface EnrichmentTarget {
  id: number;
  companyName: string;
  website: string | null;
  hiringPageUrl: string | null;
  atsPlatform: string | null;
  atsToken: string | null;
  isVerified: boolean;
}

export interface EnrichmentResult {
  enriched: number;
  verified: number;
  hiringPageSet: number;
  websiteSet: number;
  errors: number;
  details: { id: number; company: string; action: string }[];
}

export function buildAtsCareerUrl(platform: string | null, token: string | null): string | null {
  if (!platform || !token) return null;
  const builder = ATS_CAREER_URLS[platform];
  return builder ? builder(token) : null;
}

export function extractDomainFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const knownAtsHosts = [
      "boards.greenhouse.io", "boards-api.greenhouse.io",
      "jobs.lever.co", "api.lever.co",
      "jobs.ashbyhq.com", "api.ashbyhq.com",
      "apply.workable.com", "breezy.hr",
      "weworkremotely.com", "remotive.com", "remoteok.com",
      "realworkfromanywhere.com", "jobicy.com",
      "linkedin.com", "indeed.com", "glassdoor.com", "glassdoor.ie",
      "ziprecruiter.com", "smartrecruiters.com", "gohiring.com",
    ];
    if (knownAtsHosts.some((h) => host === h || host.endsWith(`.${h}`))) return null;
    return `https://${host}`;
  } catch {
    return null;
  }
}

/**
 * Selection query for the enrichment pulse's per-run target budget.
 *
 * Extracted as raw SQL (bun:sqlite-testable, mirroring duplicateSurvivorSql)
 * because the ordering here is load-bearing and was the site of a starvation
 * bug. Two properties matter:
 *
 *  - `ORDER BY RANDOM()`, not `id ASC`. The candidate set is dominated by rows
 *    this pass can never enrich in a given run: a prospector-added company whose
 *    only job URLs are aggregator links (weworkremotely, remoteok) yields no
 *    inferable website, and a company with no ATS token can never get a hiring
 *    page. Those rows never leave the candidate set, so `ORDER BY id ASC LIMIT
 *    budget` re-selected the same lowest-id stuck rows every run and starved
 *    every higher-id row — including the few that ARE enrichable. Random
 *    rotation gives every candidate a fair turn, matching how directory-audit
 *    rotates on link_checked_at and verify-links on last_verified_at. Those two
 *    can use a deterministic cursor because a migration added the column;
 *    enrichment has none, so RANDOM() is the migration-free equivalent that
 *    still guarantees eventual coverage.
 *
 *  - The hiring-page gap is ATS-scoped. A missing hiring page is only actionable
 *    when the row carries an ATS platform+token (buildAtsCareerUrl). Selecting
 *    non-ATS rows purely because hiring_page_url IS NULL kept them in the budget
 *    forever for a gap that can never be filled.
 *
 * `budget` is clamped here too, so the function is safe to interpolate even if a
 * caller forgets to validate it.
 */
export function buildEnrichmentTargetSql(budget: number): string {
  const limit = Math.max(1, Math.min(100, Math.floor(Number(budget) || 1)));
  return `
    SELECT
      id,
      company_name AS companyName,
      website,
      hiring_page_url AS hiringPageUrl,
      ats_platform AS atsPlatform,
      ats_token AS atsToken,
      is_verified AS isVerified
    FROM va_directory
    WHERE website IS NULL
       OR TRIM(COALESCE(website, '')) = ''
       OR (is_verified = 0 AND hires_filipinos = 1)
       OR (ats_platform IS NOT NULL AND ats_token IS NOT NULL AND hiring_page_url IS NULL)
    ORDER BY RANDOM()
    LIMIT ${limit}
  `;
}

export async function enrichDirectory(db: ReturnType<typeof getDb>, budget: number): Promise<EnrichmentResult> {
  const now = nowUtcIso();
  const result: EnrichmentResult = { enriched: 0, verified: 0, hiringPageSet: 0, websiteSet: 0, errors: 0, details: [] };

  const targets = await db.all<EnrichmentTarget>(sql.raw(buildEnrichmentTargetSql(budget)));

  for (const target of targets) {
    try {
      const updates: Partial<typeof vaDirectory.$inferInsert> = {};
      const actions: string[] = [];

      const needsWebsite = !target.website || target.website.trim() === "";
      const needsHiringPage = !target.hiringPageUrl;
      const needsVerification = !target.isVerified;

      if (needsHiringPage && target.atsPlatform && target.atsToken) {
        const atsUrl = buildAtsCareerUrl(target.atsPlatform, target.atsToken);
        if (atsUrl) {
          updates.hiringPageUrl = atsUrl;
          actions.push(`hiring_page=${atsUrl}`);
          result.hiringPageSet++;
        }
      }

      if (needsWebsite) {
        let inferredWebsite: string | null = null;

        const jobUrls = await db.all<{ appUrl: string | null; srcUrl: string | null }>(sql`
          SELECT application_url AS appUrl, source_url AS srcUrl
          FROM opportunities
          WHERE LOWER(company) = LOWER(${target.companyName})
            AND is_active = 1
          ORDER BY COALESCE(scraped_at, posted_at) DESC
          LIMIT 5
        `);

        for (const row of jobUrls) {
          inferredWebsite = extractDomainFromUrl(row.appUrl) ?? extractDomainFromUrl(row.srcUrl);
          if (inferredWebsite) break;
        }

        if (inferredWebsite) {
          updates.website = inferredWebsite;
          actions.push(`website=${inferredWebsite}`);
          result.websiteSet++;
        }
      }

      if (needsVerification) {
        const [jobSignal] = await db.all<{ verified_jobs: number; total_ph_jobs: number }>(sql`
          SELECT
            COUNT(CASE WHEN ph_eligibility = 'eligible_verified' THEN 1 END) AS verified_jobs,
            COUNT(*) AS total_ph_jobs
          FROM opportunities
          WHERE LOWER(company) = LOWER(${target.companyName})
            AND is_active = 1
            AND ph_eligibility IN ('eligible_verified', 'eligible_likely')
        `);

        if (jobSignal && jobSignal.verified_jobs >= 1 && jobSignal.total_ph_jobs >= 2) {
          updates.isVerified = true;
          updates.verifiedAt = now;
          actions.push(`auto-verified (${jobSignal.verified_jobs} verified, ${jobSignal.total_ph_jobs} PH-eligible jobs)`);
          result.verified++;
        }
      }

      if (Object.keys(updates).length > 0) {
        const notePrefix = `[enrich ${now.slice(0, 10)}] `;
        const noteText = notePrefix + actions.join("; ");
        await db.update(vaDirectory).set({
          ...updates,
          notes: sql`COALESCE(${vaDirectory.notes} || ' | ', '') || ${noteText}`,
        }).where(eq(vaDirectory.id, target.id));

        result.enriched++;
        result.details.push({ id: target.id, company: target.companyName, action: actions.join("; ") });
      }
    } catch (err) {
      result.errors++;
      const msg = err instanceof Error ? err.message : String(err);
      result.details.push({ id: target.id, company: target.companyName, action: `error: ${msg}` });
      console.warn(`[directory-enrich] target ${target.id} (${target.companyName}) failed: ${msg}`);
    }
  }

  return result;
}
