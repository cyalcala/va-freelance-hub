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
 * Auto-approved tenants are published by lake:sync with no human flag.
 * The Wilson lower bound must clear the admit floor, or Jev must return a
 * confident verdict in the ambiguous band. `--hold-auto-approved` stops it.
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
import { JEV_MIN_CONFIDENCE, wilsonLowerBound, PUBLISH_PH_RATE_FLOOR } from "./auto-publish-policy";

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

// ── Runner version & pacing (mirrors shadow-dispatcher skip-on-429) ──────────
/** Bumped when discovery fetch/pacing behavior changes in a way operators care about. */
export const DISCOVERY_VERSION = "2.1.0";
/** Mandatory inter-probe delay (ms) — polite pacing against public ATS JSON hosts. */
export const INTER_PROBE_DELAY_MS_DEFAULT = 1500;
export const INTER_PROBE_DELAY_MS_MIN = 1000;
export const INTER_PROBE_DELAY_MS_MAX = 2000;

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function clampProbeDelay(ms: number): number {
  if (!Number.isFinite(ms)) return INTER_PROBE_DELAY_MS_DEFAULT;
  return Math.min(INTER_PROBE_DELAY_MS_MAX, Math.max(INTER_PROBE_DELAY_MS_MIN, Math.floor(ms)));
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return url.slice(0, 80).toLowerCase();
  }
}

// ── ATS probe templates ───────────────────────────────────────────────────────
export interface AtsProbeTemplate {
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
}

export const ATS_PROBE_TEMPLATES: Array<AtsProbeTemplate> = [
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
  {
    family: "Ashby",
    buildUrl: (t) => `https://api.ashbyhq.com/posting-api/job-board/${t}`,
    extractJobs: (data: any) => {
      const jobs = data?.jobs ?? [];
      if (!Array.isArray(jobs)) return [];
      return jobs
        .filter((j: any) => j && j.isListed !== false && j.title && j.jobUrl)
        .map((j: any) => {
          const loc = typeof j.location === "string" ? j.location : j.location?.name || "";
          return {
            title: j.title || "",
            company: j.companyName || j.organizationName || "",
            url: j.jobUrl || "",
            locationRaw: [loc, j.isRemote === false ? "(onsite)" : ""].filter(Boolean).join(" ") || "Remote",
            description: [loc, j.isRemote === true ? "Remote: yes." : j.isRemote === false ? "Remote: no." : ""]
              .filter(Boolean).join(" "),
            tags: Array.isArray(j.departments) ? j.departments.map((d: any) => d.name || d).filter(Boolean) : [],
            postedAt: j.publishedAt ? new Date(j.publishedAt).toISOString() : null,
          };
        });
    },
  },
];

export function probeTemplateForFamily(family: string): AtsProbeTemplate | undefined {
  return ATS_PROBE_TEMPLATES.find((t) => t.family.toLowerCase() === family.toLowerCase());
}

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
/**
 * Jev chooses only when the Wilson bound has not cleared the admit floor.
 * A cleared bound admits. A hard reject stays rejected. Neither waits for a person.
 */
export function mergeAdmissionDecision(
  metrics: TenantMetrics,
  jev: { choice: "ADMIT" | "SHADOW" | "REJECT"; confidence: number } | null,
): AdmissionDecision {
  const deterministic = decideAdmissionDeterministic(metrics);
  if (deterministic.verdict === "REJECT") return deterministic;
  const wilson = wilsonLowerBound(metrics.qualifiedReady, metrics.totalJobs);
  if (wilson !== null && wilson >= PUBLISH_PH_RATE_FLOOR && deterministic.verdict === "ADMIT") {
    return {
      verdict: "ADMIT",
      confidence: Math.max(deterministic.confidence, jev?.confidence ?? 0),
      reason: `Wilson lower bound ${(wilson * 100).toFixed(1)}% clears ${PUBLISH_PH_RATE_FLOOR * 100}%. Jev cannot hold this cohort for a person.`,
      jevRaw: jev ? `jev:${jev.choice}@${jev.confidence}` : undefined,
    };
  }
  if (jev && jev.confidence >= JEV_MIN_CONFIDENCE) {
    return {
      verdict: jev.choice,
      confidence: jev.confidence,
      reason: `Jev ${jev.choice} at ${jev.confidence} executes the ambiguous band with no human gate.`,
      jevRaw: `jev:${jev.choice}@${jev.confidence}`,
    };
  }
  if (jev) {
    return {
      verdict: "SHADOW",
      confidence: jev.confidence,
      reason: `Jev confidence ${jev.confidence} is below ${JEV_MIN_CONFIDENCE} in the ambiguous band. Shadow, no human queue.`,
      jevRaw: `jev:${jev.choice}@${jev.confidence}`,
    };
  }
  return deterministic;
}

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
        instructions: `Choose ADMIT (publish the qualified jobs on the next automatic sync, no human approval), SHADOW (do not publish yet), or REJECT for ${family}/${tenantSlug} with PH rate ${(metrics.phRate * 100).toFixed(1)}% QUALIFIED_READY (${metrics.qualifiedReady}/${metrics.totalJobs}). A Wilson lower bound already above the admit floor will publish even if you say SHADOW.`,
        criteria: {
          ADMIT: `Publish qualified ${family}/${tenantSlug} jobs automatically.`,
          SHADOW: `Keep ${family}/${tenantSlug} unpublished until the evidence is clearer.`,
          REJECT: `Reject ${family}/${tenantSlug} — insufficient PH eligibility signal for VA-focused board.`,
        },
      },
    },
    timeoutMs: 8_000,
  });

  const answer = result.ok ? result.answers?.admission : undefined;
  const jev = answer && (answer.choice === "ADMIT" || answer.choice === "SHADOW" || answer.choice === "REJECT")
    ? { choice: answer.choice, confidence: answer.confidence }
    : null;
  const decision = mergeAdmissionDecision(metrics, jev);
  if (jev && result.model) {
    decision.jevRaw = `${result.model}:${jev.choice}@${jev.confidence}`.slice(0, 500);
  }
  return decision;
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

// ── Shared paced probe + admission ────────────────────────────────────────────
export interface DiscoveryStats {
  domainsScanned: number;
  tenantsFound: number;
  admitted: number;
  shadowed: number;
  rejected: number;
  jobsIngested: number;
  skippedRateLimitedHost: number;
}

export function emptyDiscoveryStats(): DiscoveryStats {
  return { domainsScanned: 0, tenantsFound: 0, admitted: 0, shadowed: 0, rejected: 0, jobsIngested: 0, skippedRateLimitedHost: 0 };
}

export interface BulkSeed {
  companyName: string;
  atsFamily: string;
  tenantSlug: string;
  website?: string;
}

/** Probe one tenant URL with skip-on-429 host shielding. Returns null when skipped/failed. */
async function probeTenantJobs(
  template: AtsProbeTemplate,
  tenantSlug: string,
  rateLimitedHosts: Set<string>,
): Promise<{ jobs: ReturnType<AtsProbeTemplate["extractJobs"]>; probeUrl: string; rateLimited: boolean } | null> {
  const probeUrl = template.buildUrl(tenantSlug);
  const host = hostOf(probeUrl);
  if (rateLimitedHosts.has(host)) return null;
  try {
    const res = await fetch(probeUrl, {
      headers: collectionHeaders({ Accept: "application/json" }),
      signal: AbortSignal.timeout(12_000),
    });
    if (res.status === 429) {
      rateLimitedHosts.add(host);
      return { jobs: [], probeUrl, rateLimited: true };
    }
    if (!res.ok) return null;
    const data = await res.json();
    return { jobs: template.extractJobs(data), probeUrl, rateLimited: false };
  } catch {
    return null;
  }
}

function computeTenantMetrics(rawJobs: Array<{ title: string; description: string; locationRaw: string; tags: string[] }>): TenantMetrics {
  let qualifiedReady = 0, excluded = 0, ambiguous = 0;
  const categoryCount: Record<string, number> = {};
  for (const job of rawJobs) {
    const verdict = geoGate({ title: job.title, description: job.description, locationRaw: job.locationRaw, tags: job.tags });
    if (verdict.phEligibility === "eligible_verified" || verdict.phEligibility === "eligible_likely") qualifiedReady++;
    else if (verdict.phEligibility === "ineligible") excluded++;
    else ambiguous++;
    for (const tag of job.tags) categoryCount[tag] = (categoryCount[tag] || 0) + 1;
  }
  const phRate = rawJobs.length > 0 ? qualifiedReady / rawJobs.length : 0;
  const topCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);
  return { totalJobs: rawJobs.length, qualifiedReady, excluded, ambiguous, phRate, topCategories };
}

/** Evaluate + optionally ingest a single (family, slug) tenant. Shared by domain + bulk paths. */
async function evaluateTenant(
  client: ReturnType<typeof getLakeClient>,
  seed: { domain: string; company: string; slug: string; family?: string },
  template: AtsProbeTemplate,
  opts: { dryRun: boolean; rateLimitedHosts: Set<string>; probeDelayMs: number },
  stats: DiscoveryStats,
): Promise<void> {
  const probe = await probeTenantJobs(template, seed.slug, opts.rateLimitedHosts);
  await sleep(opts.probeDelayMs);
  if (!probe) return;
  if (probe.rateLimited) {
    stats.skippedRateLimitedHost++;
    console.log(`  ⏭ ${template.family}/${seed.slug}: host 429 — shielding remaining probes to ${hostOf(probe.probeUrl)} this run.`);
    return;
  }
  const rawJobs = probe.jobs;
  if (rawJobs.length < MIN_JOBS_TO_EVALUATE) return;

  stats.tenantsFound++;
  const sourceId = buildDiscoverySourceId(template.family, seed.slug);
  console.log(`\n✓ Found: ${template.family}/${seed.slug} (${rawJobs.length} jobs) | company: ${seed.company}`);

  const metrics = computeTenantMetrics(rawJobs);
  console.log(`  geoGate: ${metrics.qualifiedReady}✓ ${metrics.excluded}✗ ${metrics.ambiguous}? | ph_rate=${(metrics.phRate * 100).toFixed(1)}%`);

  const decision = await decideAdmission(seed.slug, template.family, metrics);
  console.log(`  Jev decision: ${decision.verdict} (confidence=${decision.confidence}) | ${decision.reason}`);

  if (opts.dryRun) {
    console.log(`  [DryRun] Would set review_status='${toReviewStatus(decision.verdict)}' for ${sourceId}`);
    if (decision.verdict === "ADMIT") stats.admitted++;
    else if (decision.verdict === "SHADOW") stats.shadowed++;
    else stats.rejected++;
    return;
  }

  const reviewStatus = toReviewStatus(decision.verdict);
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
      seed.domain, seed.company, template.family, seed.slug, probe.probeUrl,
      rawJobs.length, metrics.qualifiedReady, metrics.phRate,
      reviewStatus, decision.reason, decision.jevRaw ?? null, sourceId,
      rawJobs.length, metrics.qualifiedReady, metrics.phRate,
      reviewStatus, decision.reason, decision.jevRaw ?? null, sourceId,
    ],
  });

  if (decision.verdict === "ADMIT") {
    stats.admitted++;
    console.log(`  → ADMITTED. Ingesting ${rawJobs.length} jobs into lake_candidate_jobs...`);
    const rawPayload = JSON.stringify(rawJobs.slice(0, 20));
    const rawObsId = await storeRawObservation(client, {
      sourceId,
      sourcePlatform: `${template.family}/${seed.slug}`,
      fetchUrl: probe.probeUrl,
      httpStatus: 200,
      rawPayload,
    });
    const ingestStats = { totalExtracted: 0, duplicates: 0, excluded: 0, qualifiedReady: 0, ambiguous: 0 };
    for (const job of rawJobs) {
      await processAndRefineCandidate(
        client, rawObsId,
        {
          sourceId,
          sourcePlatform: `${template.family}/${seed.slug}`,
          sourceUrl: job.url,
          title: job.title,
          company: job.company || seed.company,
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
}

function printDiscoverySummary(stats: DiscoveryStats): void {
  console.log("\n=======================================================");
  console.log("   AUTONOMOUS ATS DISCOVERY & ADMISSION SUMMARY        ");
  console.log("=======================================================");
  console.log(`Domains Scanned:               ${stats.domainsScanned}`);
  console.log(`Tenants Found (>= min jobs):   ${stats.tenantsFound}`);
  console.log(`AUTO-ADMITTED (ingested):      ${stats.admitted}`);
  console.log(`Shadow Monitored:              ${stats.shadowed}`);
  console.log(`Auto-Rejected:                 ${stats.rejected}`);
  console.log(`Jobs Ingested (QUALIFIED):     ${stats.jobsIngested}`);
  console.log(`Skipped (rate-limited host):   ${stats.skippedRateLimitedHost}`);
  console.log("-------------------------------------------------------");
  console.log("Auto-approved tenants publish on the next lake:sync when the Wilson bound clears.");
  console.log("No separate human approval. --hold-auto-approved is the kill switch.");
  console.log("=======================================================\n");
}

// ── Core admission engine ─────────────────────────────────────────────────────
export async function runDomainAtsDiscovery(options: {
  domainLimit?: number;
  dryRun?: boolean;
  probeDelayMs?: number;
} = {}) {
  const { domainLimit = 100, dryRun = false, probeDelayMs = INTER_PROBE_DELAY_MS_DEFAULT } = options;
  const delay = clampProbeDelay(probeDelayMs);

  console.log("=== Autonomous ATS Tenant Discovery & Admission Engine ===");
  console.log(`Runner: v${DISCOVERY_VERSION} | DomainLimit: ${domainLimit} | DryRun: ${dryRun} | ProbeDelay: ${delay}ms`);
  console.log(`Thresholds: ADMIT >= ${AUTO_APPROVE_PH_RATE * 100}% PH | REJECT < ${AUTO_REJECT_PH_RATE * 100}% PH\n`);

  const client = getLakeClient();
  if (!dryRun) await ensureDiscoveryTable(client);

  const stats = emptyDiscoveryStats();
  const rateLimitedHosts = new Set<string>();
  const domains = await extractDomains(client, domainLimit);
  console.log(`Extracted ${domains.length} employer domains to probe.\n`);

  for (const { domain, company, slug } of domains) {
    stats.domainsScanned++;
    for (const template of ATS_PROBE_TEMPLATES) {
      if (rateLimitedHosts.has(hostOf(template.buildUrl(slug)))) {
        stats.skippedRateLimitedHost++;
        continue;
      }
      await evaluateTenant(client, { domain, company, slug }, template, { dryRun, rateLimitedHosts, probeDelayMs: delay }, stats);
    }
  }

  printDiscoverySummary(stats);
  return stats;
}

/** Bulk path: probe an explicit seed list (family-pinned; no 4x fan-out). Used by bulk-ats-seed.ts. */
export async function runBulkAtsDiscovery(
  seeds: BulkSeed[],
  options: { dryRun?: boolean; probeDelayMs?: number; limit?: number } = {},
): Promise<DiscoveryStats> {
  const { dryRun = false, probeDelayMs = INTER_PROBE_DELAY_MS_DEFAULT, limit = seeds.length } = options;
  const delay = clampProbeDelay(probeDelayMs);
  const cohort = seeds.slice(0, Math.max(0, limit));

  console.log("=== Bulk ATS Seed Discovery (explicit cohort) ===");
  console.log(`Runner: v${DISCOVERY_VERSION} | Seeds: ${cohort.length} | DryRun: ${dryRun} | ProbeDelay: ${delay}ms\n`);

  const client = getLakeClient();
  if (!dryRun) await ensureDiscoveryTable(client);

  const stats = emptyDiscoveryStats();
  const rateLimitedHosts = new Set<string>();

  for (const seed of cohort) {
    const template = probeTemplateForFamily(seed.atsFamily);
    if (!template) {
      console.warn(`  ⚠ Unknown ATS family "${seed.atsFamily}" for ${seed.companyName} — skipping.`);
      continue;
    }
    stats.domainsScanned++;
    const domain = seed.website ?? `${seed.tenantSlug}.${template.family.toLowerCase()}`;
    await evaluateTenant(
      client,
      { domain, company: seed.companyName, slug: seed.tenantSlug },
      template,
      { dryRun, rateLimitedHosts, probeDelayMs: delay },
      stats,
    );
  }

  printDiscoverySummary(stats);
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
  const delayArg = args.find((a) => a.startsWith("--delay-ms="));
  const probeDelayMs = delayArg ? parseInt(delayArg.split("=")[1], 10) : INTER_PROBE_DELAY_MS_DEFAULT;
  const seedsArg = args.find((a) => a.startsWith("--seeds="));

  (async () => {
    if (seedsArg) {
      const seedsPath = seedsArg.split("=").slice(1).join("=");
      const raw = await Bun.file(seedsPath).text();
      const seeds = JSON.parse(raw) as BulkSeed[];
      await runBulkAtsDiscovery(seeds, { dryRun, probeDelayMs, limit: domainLimit });
    } else {
      await runDomainAtsDiscovery({ domainLimit, dryRun, probeDelayMs });
    }
  })().catch((err) => {
    console.error("ATS discovery failed:", err);
    process.exit(1);
  });
}
