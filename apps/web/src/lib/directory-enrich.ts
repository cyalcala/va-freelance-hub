import { sql, eq, and, isNull, or, lt, asc, type SQL } from "drizzle-orm";
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

export async function enrichDirectory(db: ReturnType<typeof getDb>, budget: number): Promise<EnrichmentResult> {
  const now = nowUtcIso();
  const result: EnrichmentResult = { enriched: 0, verified: 0, hiringPageSet: 0, websiteSet: 0, errors: 0, details: [] };

  const targets = await db
    .select({
      id: vaDirectory.id,
      companyName: vaDirectory.companyName,
      website: vaDirectory.website,
      hiringPageUrl: vaDirectory.hiringPageUrl,
      atsPlatform: vaDirectory.atsPlatform,
      atsToken: vaDirectory.atsToken,
      isVerified: vaDirectory.isVerified,
    })
    .from(vaDirectory)
    .where(
      or(
        isNull(vaDirectory.website),
        sql`TRIM(COALESCE(${vaDirectory.website}, '')) = ''`,
        and(eq(vaDirectory.isVerified, false), sql`${vaDirectory.hiresFilipinos} = 1`),
        isNull(vaDirectory.hiringPageUrl),
      )
    )
    .orderBy(asc(vaDirectory.id))
    .limit(budget);

  for (const target of targets) {
    try {
      const updates: Record<string, any> = {};
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
