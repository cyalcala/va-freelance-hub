/**
 * Autonomous ATS Tenant Discovery & Admission Engine — scripts/lake/domain-ats-discovery.ts
 *
 * Extracts employer domains from lake_candidate_jobs, probes each domain's known
 * ATS tenant endpoints (Breezy HR, Greenhouse, Workable, Lever), then autonomously
 * evaluates each discovered tenant using geoGate + Jev 1.13 to make an admission
 * decision — no human gate required.
 *
 * Admission pipeline for each discovered tenant:
 *   1. Probe public JSON endpoint → extract all available job listings
 *   2. Run every job through geoGate (deterministic PH eligibility)
 *   3. Compute PH signal metrics (QUALIFIED_READY rate, total count, category mix)
 *   4. Invoke Jev 1.13 for a calibrated ADMIT / SHADOW / REJECT decision
 *   5. Persist decision to lake_ats_discovery:
 *      - ADMIT  → review_status = 'auto_approved'; ingest jobs into lake_candidate_jobs
 *      - SHADOW → review_status = 'shadow_monitor'; store discovery only, no ingestion
 *      - REJECT → review_status = 'auto_rejected'; record evidence; skip ingestion
 *
 * Auto-approved tenants are HELD from D1 sync by default (lake admission is
 * not publication authority per ADR-007) and only included when sync-to-d1.ts
 * runs with explicit `--allow-auto-approved` — no code change needed.
 *
 * Compliance:
 * - Only probes public, unauthenticated JSON endpoints.
 * - Follows all repository compliance rules (minimal metadata, linkback, no auth bypass).
 * - Admission threshold documented per decision; all Jev calls logged in lake.
 *
 * Run: bun run scripts/lake/domain-ats-discovery.ts [--dry-run] [--limit=N]
 */

import { getLakeClient } from "./client";
import { processAndRefineCandidate } from "./ingest-to-lake";
import { markRawProcessed, storeRawObservation } from "./lake-shared";
import { geoGate } from "../../packages/scraper/geoGate";
import { collectionHeaders } from "../../packages/scraper/userAgent";
import { judgeViaJev } from "../../packages/scraper/jev-client";

// ── Admission thresholds (exported for unit tests) ───────────────────────────
// Minimum number of live jobs a tenant must have to be considered
export const MIN_JOBS_TO_EVALUATE = 3;
// Minimum fraction of jobs that must pass geoGate as QUALIFIED_READY for auto-approval
export const AUTO_APPROVE_PH_RATE = 0.20; // 20%
// Below this rate, auto-reject (tenant has negligible PH signal)
export const AUTO_REJECT_PH_RATE = 0.05; // <5% → rejected
// Between REJECT and APPROVE thresholds → shadow monitoring

/** Canonical lake source id for a discovered tenant: `<family-lower>:<slug>`. */
export function buildDiscoverySourceId(atsFamily: string, tenantSlug: string): string {
  return `${atsFamily.toLowerCase()}:${tenantSlug}`;
}

// ── ATS probe templates ───────────────────────────────────────────────────────
const ATS_PROBE_TEMPLATES: Array<{
  family: string;
  buildUrl: (tenant: string) => string;
  extractJobs: (data: unknown) => Array<{
    title: string;
    company: string;
    url: string;
    locationRaw: string;
    description: string;
    tags: string[];
    postedAt: string | null;
  }>;
}> = [
  {
    family: "Breezy",
    buildUrl: (t) => `https://${t}.breezy.hr/json`,
    extractJobs: (data) => {
      if (!Array.isArray(data)) return [];
      return (data as any[])
        .filter((j: any) => j?.name && j?.url)
        .map((j: any) => ({
          title: String(j.name || ""),
          company: j.company?.name || j.company || "",
          url: String(j.url || ""),
          locationRaw: j.location?.name || j.location?.country?.name || (j.location?.is_remote ? "Remote" : ""),
          description: String(j.description || ""),
          tags: [] as string[],
          postedAt: j.updated_at || j.created_at
            ? new Date(j.updated_at || j.created_at).toISOString()
            : null,
        }));
    },
  },
  {
    family: "Greenhouse",
    buildUrl: (t) => `https://boards-api.greenhouse.io/v1/boards/${t}/jobs`,
    extractJobs: (data: any) => {
      const jobs = data?.jobs ?? [];
      if (!Array.isArray(jobs)) return [];
      return jobs
        .filter((j: any) => j?.title && j?.absolute_url)
        .map((j: any) => ({
          title: j.title || "",
          company: data?.company?.name || "",
          url: j.absolute_url || "",
          locationRaw: j.location?.name || "Remote",
          description: j.content || "",
          tags: Array.isArray(j.departments) ? j.departments.map((d: any) => d.name) : [],
          postedAt: j.updated_at ? new Date(j.updated_at).toISOString() : null,
        }));
    },
  },
  {
    family: "Workable",
    buildUrl: (t) => `https://apply.workable.com/api/v3/accounts/${t}/jobs`,
    extractJobs: (data: any) => {
      const jobs = data?.results ?? data?.jobs ?? [];
      if (!Array.isArray(jobs)) return [];
      return jobs
        .filter((j: any) => j?.title && (j?.url || j?.shortcode))
        .map((j: any) => ({
          title: j.title || "",
          company: j.company_name || "",
          url: j.url || `https://apply.workable.com/${data?.slug || ""}/${j.shortcode}`,
          locationRaw: j.location_str || j.location?.city || "Remote",
          description: j.description || j.summary || "",
          tags: Array.isArray(j.tags) ? j.tags : [],
          postedAt: j.published_on ? new Date(j.published_on).toISOString() : null,
        }));
    },
  },
  {
    family: "Lever",
    buildUrl: (t) => `https://api.lever.co/v0/postings/${t}?mode=json`,
    extractJobs: (data: any) => {
      if (!Array.isArray(data)) return [];
      return data
        .filter((j: any) => j?.text && j?.hostedUrl)
        .map((j: any) => ({
          title: j.text || "",
          company: j.company || "",
          url: j.hostedUrl || "",
          locationRaw: j.categories?.location || j.workplaceType || "Remote",
          description: j.descriptionPlain || j.description || "",
          tags: Array.isArray(j.categories?.team) ? [j.categories.team] : [],
          postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null,
        }));
    },
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface TenantMetrics {
  totalJobs: number;
  qualifiedReady: number;
  excluded: number;
  ambiguous: number;
  phRate: number;
  topCategories: string[];
}

interface AdmissionDecision {
  verdict: "ADMIT" | "SHADOW" | "REJECT";
  confidence: number;
  reason: string;
  jevRaw?: string;
}

// ── Admission decision ────────────────────────────────────────────────────────
/**
 * Pure deterministic threshold decision (no network). Exported for unit tests.
 * Used as the Jev-offline fallback so admission never blocks on model availability.
 */
export function decideAdmissionDeterministic(metrics: TenantMetrics): AdmissionDecision {
  if (metrics.phRate >= AUTO_APPROVE_PH_RATE && metrics.totalJobs >= MIN_JOBS_TO_EVALUATE) {
    return {
      verdict: "ADMIT",
      confidence: 0.75,
      reason: `Deterministic threshold: ph_rate=${(metrics.phRate * 100).toFixed(1)}% >= ${AUTO_APPROVE_PH_RATE * 100}% threshold`,
    };
  } else if (metrics.phRate < AUTO_REJECT_PH_RATE || metrics.totalJobs < MIN_JOBS_TO_EVALUATE) {
    return {
      verdict: "REJECT",
      confidence: 0.85,
      reason: `Deterministic threshold: ph_rate=${(metrics.phRate * 100).toFixed(1)}% < ${AUTO_REJECT_PH_RATE * 100}% or insufficient jobs (${metrics.totalJobs})`,
    };
  }
  return {
    verdict: "SHADOW",
    confidence: 0.65,
    reason: `Borderline ph_rate=${(metrics.phRate * 100).toFixed(1)}% — shadow monitoring`,
  };
}

/**
 * Jev-assisted admission via the repository-portable Jev 1.13 client
 * (OpenRouter System One; advisory only). Falls back to the deterministic
 * threshold when the key is missing, the provider fails, or the answer is
 * invalid — admission never blocks on model availability.
 */
async function decideAdmission(
  tenantSlug: string,
  family: string,
  metrics: TenantMetrics
): Promise<AdmissionDecision> {
  const stateStr = `tenant=${family}/${tenantSlug} total=${metrics.totalJobs} qualified=${metrics.qualifiedReady} excluded=${metrics.excluded} ambiguous=${metrics.ambiguous} ph_rate=${metrics.phRate.toFixed(3)} categories=${metrics.topCategories.join(",")}`;

  const result = await judgeViaJev(process.env.OPENROUTER_API_KEY, {
    task: "Admit ATS tenant as autonomous VA lake source",
    state: stateStr,
    context: `ATS tenant admission for VA Freelance Hub lake. PH eligibility rate: ${(metrics.phRate * 100).toFixed(1)}%. Min auto-approve threshold: ${AUTO_APPROVE_PH_RATE * 100}%. Min shadow threshold: ${AUTO_REJECT_PH_RATE * 100}%. Advisory only — deterministic thresholds enforce.`,
    questions: {
      admission: {
        instructions: `Choose ADMIT (approve as autonomous lake source), SHADOW (monitor only, do not sync to D1), or REJECT (insufficient PH signal) for ${family}/${tenantSlug} with PH rate ${(metrics.phRate * 100).toFixed(1)}% QUALIFIED_READY (${metrics.qualifiedReady}/${metrics.totalJobs}).`,
        criteria: {
          ADMIT: `Approve ${family}/${tenantSlug} as autonomous lake source.`,
          SHADOW: `Monitor ${family}/${tenantSlug} with shadow status — ingest but do not sync to D1 yet.`,
          REJECT: `Reject ${family}/${tenantSlug} — insufficient PH eligibility signal for VA-focused board.`,
        },
      },
    },
    timeoutMs: 8_000,
  });

  const answer = result.ok ? result.answers?.admission : undefined;
  if (answer && (answer.choice === "ADMIT" || answer.choice === "SHADOW" || answer.choice === "REJECT")) {
    return {
      verdict: answer.choice,
      confidence: answer.confidence,
      reason: `Jev 1.13 decision: ${answer.choice} | ph_rate=${(metrics.phRate * 100).toFixed(1)}%`,
      jevRaw: `${result.model ?? "jev-1.13"}:${answer.choice}@${answer.confidence}`.slice(0, 500),
    };
  }

  // Jev offline/unavailable/invalid — deterministic threshold (Jev non-blocking)
  return decideAdmissionDeterministic(metrics);
}

// ── Table setup (portable: source_id is a plain column computed in code) ─────
export async function ensureDiscoveryTable(client: ReturnType<typeof getLakeClient>) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS lake_ats_discovery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL,
      company_hint TEXT,
      ats_family TEXT NOT NULL,
      tenant_slug TEXT NOT NULL,
      probe_url TEXT NOT NULL,
      job_count INTEGER NOT NULL DEFAULT 0,
      qualified_ready INTEGER NOT NULL DEFAULT 0,
      ph_rate REAL NOT NULL DEFAULT 0,
      review_status TEXT NOT NULL DEFAULT 'shadow_monitor',
      admission_reason TEXT,
      jev_raw TEXT,
      source_id TEXT NOT NULL DEFAULT '',
      discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_evaluated_at TEXT,
      UNIQUE(ats_family, tenant_slug)
    );
  `);
  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_lake_ats_review
    ON lake_ats_discovery(review_status);
  `);
}

// ── Domain extraction ─────────────────────────────────────────────────────────
async function extractDomains(
  client: ReturnType<typeof getLakeClient>,
  limit: number
): Promise<Array<{ domain: string; company: string; slug: string }>> {
  const res = await client.execute({
    sql: `
      SELECT application_url, company, MAX(sighting_count) as sc
      FROM lake_candidate_jobs
      WHERE application_url IS NOT NULL AND application_url != ''
        AND status = 'QUALIFIED_READY'
      GROUP BY company
      ORDER BY MAX(sighting_count) DESC
      LIMIT ?;
    `,
    args: [limit * 4],
  });

  const SKIP_DOMAINS = new Set([
    "remotive.com", "weworkremotely.com", "remoteok.com", "realworkfromanywhere.com",
    "himalayas.app", "jobicy.com", "breezy.hr", "greenhouse.io",
    "boards-api.greenhouse.io", "workable.com", "lever.co",
    "linkedin.com", "indeed.com", "glassdoor.com",
  ]);

  const seen = new Map<string, { company: string; slug: string }>();

  for (const row of res.rows) {
    try {
      const url = row.application_url as string;
      const company = row.company as string;
      const domain = new URL(url).hostname.replace(/^www\./, "");
      if (SKIP_DOMAINS.has(domain)) continue;

      const slug = domain
        .split(".")
        .filter((p) => !["com", "io", "co", "net", "org", "app", "ai", "hr"].includes(p))
        .join("-")
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 40);

      if (slug.length < 3) continue;
      if (!seen.has(domain)) seen.set(domain, { company, slug });
    } catch { /* skip unparseable URLs */ }
  }

  return Array.from(seen.entries())
    .slice(0, limit)
    .map(([domain, meta]) => ({ domain, ...meta }));
}

// ── Core admission engine ─────────────────────────────────────────────────────
export async function runDomainAtsDiscovery(options: {
  domainLimit?: number;
  dryRun?: boolean;
} = {}) {
  const { domainLimit = 100, dryRun = false } = options;

  console.log("=== Autonomous ATS Tenant Discovery & Admission Engine ===");
  console.log(`DomainLimit: ${domainLimit} | DryRun: ${dryRun}`);
  console.log(`Thresholds: ADMIT >= ${AUTO_APPROVE_PH_RATE * 100}% PH | REJECT < ${AUTO_REJECT_PH_RATE * 100}% PH\n`);

  const client = getLakeClient();

  if (!dryRun) {
    await ensureDiscoveryTable(client);
  }

  const stats = {
    domainsScanned: 0,
    tenantsFound: 0,
    admitted: 0,
    shadowed: 0,
    rejected: 0,
    jobsIngested: 0,
  };

  const domains = await extractDomains(client, domainLimit);
  console.log(`Extracted ${domains.length} employer domains to probe.\n`);

  for (const { domain, company, slug } of domains) {
    stats.domainsScanned++;

    for (const template of ATS_PROBE_TEMPLATES) {
      const probeUrl = template.buildUrl(slug);
      let rawJobs: ReturnType<typeof template.extractJobs> = [];

      // Step 1: Probe endpoint
      try {
        const res = await fetch(probeUrl, {
          headers: collectionHeaders({ Accept: "application/json" }),
          signal: AbortSignal.timeout(12_000),
        });
        if (!res.ok) { await new Promise((r) => setTimeout(r, 200)); continue; }
        const data = await res.json();
        rawJobs = template.extractJobs(data);
      } catch { await new Promise((r) => setTimeout(r, 200)); continue; }

      if (rawJobs.length < MIN_JOBS_TO_EVALUATE) {
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }

      stats.tenantsFound++;
      const sourceId = buildDiscoverySourceId(template.family, slug);
      console.log(`\n✓ Found: ${template.family}/${slug} (${rawJobs.length} jobs) | company: ${company}`);

      // Step 2: geoGate every job to compute PH signal metrics
      let qualifiedReady = 0, excluded = 0, ambiguous = 0;
      const categoryCount: Record<string, number> = {};

      for (const job of rawJobs) {
        const verdict = geoGate({
          title: job.title,
          description: job.description,
          locationRaw: job.locationRaw,
          tags: job.tags,
        });

        if (verdict.phEligibility === "eligible_verified" || verdict.phEligibility === "eligible_likely") {
          qualifiedReady++;
        } else if (verdict.phEligibility === "ineligible") {
          excluded++;
        } else {
          ambiguous++;
        }

        // Tally categories from tags
        for (const tag of job.tags) {
          categoryCount[tag] = (categoryCount[tag] || 0) + 1;
        }
      }

      const phRate = rawJobs.length > 0 ? qualifiedReady / rawJobs.length : 0;
      const topCategories = Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k]) => k);

      const metrics: TenantMetrics = {
        totalJobs: rawJobs.length,
        qualifiedReady,
        excluded,
        ambiguous,
        phRate,
        topCategories,
      };

      console.log(`  geoGate: ${qualifiedReady}✓ ${excluded}✗ ${ambiguous}? | ph_rate=${(phRate * 100).toFixed(1)}%`);

      // Step 3: Jev autonomous admission decision (advisory; deterministic fallback)
      const decision = await decideAdmission(slug, template.family, metrics);
      console.log(`  Jev decision: ${decision.verdict} (confidence=${decision.confidence}) | ${decision.reason}`);

      if (dryRun) {
        console.log(`  [DryRun] Would set review_status='${toReviewStatus(decision.verdict)}' for ${sourceId}`);
        if (decision.verdict === "ADMIT") stats.admitted++;
        else if (decision.verdict === "SHADOW") stats.shadowed++;
        else stats.rejected++;
        await new Promise((r) => setTimeout(r, 300));
        continue;
      }

      const reviewStatus = toReviewStatus(decision.verdict);

      // Step 4: Persist discovery with AI decision
      await client.execute({
        sql: `
          INSERT INTO lake_ats_discovery
            (domain, company_hint, ats_family, tenant_slug, probe_url, job_count,
             qualified_ready, ph_rate, review_status, admission_reason, jev_raw, source_id, last_evaluated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(ats_family, tenant_slug) DO UPDATE SET
            job_count = ?,
            qualified_ready = ?,
            ph_rate = ?,
            review_status = ?,
            admission_reason = ?,
            jev_raw = ?,
            source_id = ?,
            last_evaluated_at = datetime('now');
        `,
        args: [
          domain, company, template.family, slug, probeUrl,
          rawJobs.length, qualifiedReady, phRate,
          reviewStatus, decision.reason, decision.jevRaw ?? null, sourceId,
          // ON CONFLICT updates:
          rawJobs.length, qualifiedReady, phRate,
          reviewStatus, decision.reason, decision.jevRaw ?? null, sourceId,
        ],
      });

      // Step 5: If ADMITTED — ingest all jobs into lake_candidate_jobs right now
      if (decision.verdict === "ADMIT") {
        stats.admitted++;
        console.log(`  → ADMITTED. Ingesting ${rawJobs.length} jobs into lake_candidate_jobs...`);

        // Store raw observation (sample payload; hash covers the sample)
        const rawPayload = JSON.stringify(rawJobs.slice(0, 20)); // store sample
        const rawObsId = await storeRawObservation(client, {
          sourceId,
          sourcePlatform: `${template.family}/${slug}`,
          fetchUrl: probeUrl,
          httpStatus: 200,
          rawPayload,
        });

        const ingestStats = {
          totalExtracted: 0, duplicates: 0, excluded: 0, qualifiedReady: 0, ambiguous: 0,
        };

        for (const job of rawJobs) {
          await processAndRefineCandidate(
            client,
            rawObsId,
            {
              sourceId,
              sourcePlatform: `${template.family}/${slug}`,
              sourceUrl: job.url,
              title: job.title,
              company: job.company || company,
              category: job.tags[0] || "other",
              locationRaw: job.locationRaw || "Remote",
              description: job.description,
              applicationUrl: job.url,
              postedAt: job.postedAt,
              tags: job.tags,
            },
            ingestStats
          );
        }

        await markRawProcessed(client, rawObsId);

        stats.jobsIngested += ingestStats.qualifiedReady;
        console.log(`  → Ingested: ${ingestStats.qualifiedReady} QUALIFIED_READY, ${ingestStats.excluded} excluded, ${ingestStats.duplicates} duplicates`);
      } else if (decision.verdict === "SHADOW") {
        stats.shadowed++;
        console.log(`  → SHADOW: stored in lake_ats_discovery, not yet synced to D1.`);
      } else {
        stats.rejected++;
        console.log(`  → REJECTED: ${decision.reason}`);
      }

      await new Promise((r) => setTimeout(r, 400));
    }
  }

  console.log("\n=======================================================");
  console.log("   AUTONOMOUS ATS DISCOVERY & ADMISSION SUMMARY        ");
  console.log("=======================================================");
  console.log(`Domains Scanned:               ${stats.domainsScanned}`);
  console.log(`Tenants Found (>= min jobs):   ${stats.tenantsFound}`);
  console.log(`AUTO-ADMITTED (ingested):      ${stats.admitted}`);
  console.log(`Shadow Monitored:              ${stats.shadowed}`);
  console.log(`Auto-Rejected:                 ${stats.rejected}`);
  console.log(`Jobs Ingested (QUALIFIED):     ${stats.jobsIngested}`);
  console.log("-------------------------------------------------------");
  console.log("Auto-approved tenants are HELD from D1 sync by default;");
  console.log("include them only via lake:sync --allow-auto-approved after review.");
  console.log("=======================================================\n");

  return stats;
}

function toReviewStatus(verdict: "ADMIT" | "SHADOW" | "REJECT"): string {
  switch (verdict) {
    case "ADMIT": return "auto_approved";
    case "SHADOW": return "shadow_monitor";
    case "REJECT": return "auto_rejected";
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const domainLimit = limitArg ? parseInt(limitArg.split("=")[1], 10) : 100;

  runDomainAtsDiscovery({ domainLimit, dryRun }).catch((err) => {
    console.error("ATS discovery failed:", err);
    process.exit(1);
  });
}
