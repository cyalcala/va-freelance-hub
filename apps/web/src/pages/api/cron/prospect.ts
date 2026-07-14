import type { APIRoute } from "astro";
import { getDb, vaDirectory } from "@va-hub/db";
import { sql } from "drizzle-orm";
import {
  classifyCandidates, chunkArray, maxRowsPerD1Batch,
  type RawCandidate, type ClassifiedCandidate,
} from "@va-hub/scraper";
import { nowUtcIso } from "@/lib/time";
import { isAuthorized } from "@/lib/auth";

export const prerender = false;

// Autonomous Prospector (2026-07-14). Mines already-ingested, already-eligible
// jobs for companies missing from va_directory and auto-adds the trusted,
// quality ones — removing the manual spreadsheet-import loop. Safety:
//  - Two gates (name quality + source trust) in @va-hub/scraper/prospector.
//  - Idempotent (skips existing normalized names); additive only, no deletes.
//  - Mass-add guard: > MAX_AUTO_ADD in one run is treated as anomalous
//    (a new bulk source or a bug) -> add nothing, flag for review.
//  - Fail-closed ATS: discovered ats_platform/ats_token are stored, but a
//    token absent from ATS_TOKEN_POLICIES stays PAUSED, so nothing is scraped
//    until a human promotes it (the workflow files that proposal).
const MIN_JOBS = 2;
const CANDIDATE_LIMIT = 200;
const MAX_AUTO_ADD = 15;
const DIRECTORY_INSERT_COLUMNS = 9;

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = (locals.runtime?.env ?? (import.meta as any).env) as any;

    const rateLimiter = env?.API_RATE_LIMITER;
    if (rateLimiter) {
      const clientIp = request.headers.get("cf-connecting-ip") || "unknown";
      const { success } = await rateLimiter.limit({ key: `prospect:${clientIp}` });
      if (!success) {
        return new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429 });
      }
    }

    if (!isAuthorized(request, env.PROXY_SECRET || env.CRON_SECRET)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const db = getDb(env);
    const now = nowUtcIso();

    // 1. Candidate companies: appear in active eligible jobs, not yet in the
    // directory, with at least MIN_JOBS active postings. Correlated NOT IN
    // subquery (not a bound-param list) keeps this off the 100-param limit.
    const rows = await db.all<{ company: string; jobs: number; sampleUrl: string | null; category: string | null }>(sql`
      SELECT company AS company,
             COUNT(*) AS jobs,
             MAX(source_url) AS sampleUrl,
             MAX(category) AS category
      FROM opportunities
      WHERE is_active = 1
        AND company IS NOT NULL AND TRIM(company) <> ''
        AND LOWER(company) NOT IN (SELECT LOWER(company_name) FROM va_directory)
      GROUP BY LOWER(company)
      HAVING COUNT(*) >= ${MIN_JOBS}
      ORDER BY jobs DESC
      LIMIT ${CANDIDATE_LIMIT}
    `);

    const raw: RawCandidate[] = rows.map((r) => ({
      company: r.company,
      jobs: Number(r.jobs) || 0,
      sampleUrl: r.sampleUrl ?? null,
      category: r.category ?? null,
    }));

    // 2. Existing directory names for idempotent skip.
    const existing = await db.select({ name: vaDirectory.companyName }).from(vaDirectory);
    const existingNormalized = new Set(existing.map((e) => e.name.toLowerCase().replace(/\s+/g, " ").trim()));

    // 3. Classify (name-quality + source-trust gates, dedup vs directory).
    const { autoAdd, review, rejected } = classifyCandidates(raw, existingNormalized);

    // 4. Mass-add guard.
    const massAddGuardTripped = autoAdd.length > MAX_AUTO_ADD;

    // 5. Idempotent additive insert of trusted candidates (chunked under D1's
    // 100-param limit). Discovered ATS tokens are stored but stay paused
    // (fail-closed) until promoted in code.
    let added = 0;
    const addedNames: string[] = [];
    if (!massAddGuardTripped && autoAdd.length > 0) {
      const values = autoAdd.map((c: ClassifiedCandidate) => ({
        companyName: c.companyName,
        website: null,
        hiresFilipinos: true,
        niche: c.niche as any,
        isVerified: false,
        isRemote: true,
        notes: `Prospector auto-add ${now.slice(0, 10)}: discovered from ${c.jobs} active job(s); sample ${c.sampleUrl ?? "n/a"}.`,
        atsPlatform: (c.atsRef?.platform ?? null) as any,
        atsToken: c.atsRef?.token ?? null,
      }));
      for (const batch of chunkArray(values, maxRowsPerD1Batch(DIRECTORY_INSERT_COLUMNS))) {
        try {
          await db.insert(vaDirectory).values(batch);
          added += batch.length;
          addedNames.push(...batch.map((b) => b.companyName));
        } catch (err) {
          console.warn(`[api/cron/prospect] directory insert batch failed:`, errorMessage(err));
        }
      }
    }

    // 6. ATS-enable proposals: discovered tokens (from auto-added or review
    // candidates) that a human should promote into ATS_TOKEN_POLICIES.
    const atsProposals = [...autoAdd, ...review]
      .filter((c) => c.atsRef)
      .map((c) => ({ company: c.companyName, platform: c.atsRef!.platform, token: c.atsRef!.token, jobs: c.jobs, sampleUrl: c.sampleUrl }));

    return new Response(JSON.stringify({
      success: true,
      candidatesConsidered: raw.length,
      autoAddEligible: autoAdd.length,
      added,
      addedNames,
      reviewOnly: review.map((c) => ({ company: c.companyName, jobs: c.jobs, sampleUrl: c.sampleUrl })),
      rejectedForQuality: rejected,
      atsProposals,
      massAddGuardTripped,
      mode: "auto-add-directory-only",
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[api/cron/prospect] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), { status: 500 });
  }
};
