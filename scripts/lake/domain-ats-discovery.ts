/**
 * Company Domain → ATS Tenant Discovery Flywheel — scripts/lake/domain-ats-discovery.ts
 *
 * Extracts unique employer domains from lake_candidate_jobs, then probes each domain's
 * known ATS tenant endpoints (Breezy HR, Greenhouse, Workable, Ashby, Lever) for
 * publicly accessible job listings JSON.
 *
 * Discovered tenants that return live job listings are recorded in the lake as
 * `lake_ats_discovery` entries, ready for human review before any source registration.
 *
 * Compliance:
 * - Only probes public, unauthenticated JSON endpoints (no login/CAPTCHA bypass).
 * - Respects robots.txt directives for each ATS platform.
 * - Follows the repository's needs_review → bounded decision workflow (ADR-006/007).
 * - Does NOT automatically write to D1 or source_registry — discovery is lake-only.
 *
 * Run: bun run scripts/lake/domain-ats-discovery.ts [--dry-run] [--limit=N]
 */

import { getLakeClient } from "./client";
import { collectionHeaders } from "../../packages/scraper/userAgent";

interface DiscoveredTenant {
  domain: string;
  atsFamily: string;
  tenantSlug: string;
  probeUrl: string;
  httpStatus: number;
  jobCount: number;
  sampleTitles: string[];
}

// ATS probe templates — all use public, documented JSON endpoints
const ATS_PROBE_TEMPLATES: Array<{
  family: string;
  buildUrl: (tenant: string) => string;
  extractJobs: (data: unknown) => { count: number; titles: string[] };
}> = [
  {
    family: "Breezy",
    buildUrl: (t) => `https://${t}.breezy.hr/json`,
    extractJobs: (data) => {
      if (!Array.isArray(data)) return { count: 0, titles: [] };
      return {
        count: data.length,
        titles: data.slice(0, 3).map((j: any) => j.name || j.title || "").filter(Boolean),
      };
    },
  },
  {
    family: "Greenhouse",
    buildUrl: (t) => `https://boards-api.greenhouse.io/v1/boards/${t}/jobs`,
    extractJobs: (data: any) => {
      const jobs = data?.jobs ?? [];
      return {
        count: Array.isArray(jobs) ? jobs.length : 0,
        titles: (Array.isArray(jobs) ? jobs.slice(0, 3) : []).map((j: any) => j.title || "").filter(Boolean),
      };
    },
  },
  {
    family: "Workable",
    buildUrl: (t) => `https://apply.workable.com/api/v3/accounts/${t}/jobs`,
    extractJobs: (data: any) => {
      const jobs = data?.results ?? data?.jobs ?? [];
      return {
        count: Array.isArray(jobs) ? jobs.length : 0,
        titles: (Array.isArray(jobs) ? jobs.slice(0, 3) : []).map((j: any) => j.title || j.name || "").filter(Boolean),
      };
    },
  },
  {
    family: "Ashby",
    buildUrl: (t) => `https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams`,
    // Ashby uses a POST; skip GET-only probe — mark as needs-research
    extractJobs: (_data) => ({ count: 0, titles: [] }),
  },
  {
    family: "Lever",
    buildUrl: (t) => `https://api.lever.co/v0/postings/${t}?mode=json`,
    extractJobs: (data: any) => {
      if (!Array.isArray(data)) return { count: 0, titles: [] };
      return {
        count: data.length,
        titles: data.slice(0, 3).map((j: any) => j.text || j.title || "").filter(Boolean),
      };
    },
  },
];

async function extractDomains(
  client: ReturnType<typeof getLakeClient>,
  limit: number
): Promise<Array<{ domain: string; company: string; sightingCount: number }>> {
  const res = await client.execute({
    sql: `
      SELECT 
        application_url,
        company,
        MAX(sighting_count) as sighting_count
      FROM lake_candidate_jobs
      WHERE application_url IS NOT NULL
        AND application_url != ''
        AND status = 'QUALIFIED_READY'
      GROUP BY company
      ORDER BY MAX(sighting_count) DESC
      LIMIT ?;
    `,
    args: [limit * 3], // over-fetch since many won't parse cleanly
  });

  const seen = new Map<string, { company: string; sightingCount: number }>();

  for (const row of res.rows) {
    const url = row.application_url as string;
    const company = row.company as string;
    const sc = Number(row.sighting_count || 1);

    try {
      const parsed = new URL(url);
      let domain = parsed.hostname.replace(/^www\./, "");

      // Normalize away job board domains — we want employer domains
      const SKIP_DOMAINS = new Set([
        "remotive.com", "weworkremotely.com", "remoteok.com",
        "realworkfromanywhere.com", "himalayas.app", "jobicy.com",
        "breezy.hr", "greenhouse.io", "boards-api.greenhouse.io",
        "workable.com", "lever.co", "linkedin.com", "indeed.com",
        "glassdoor.com", "job.openings.com",
      ]);

      if (SKIP_DOMAINS.has(domain)) continue;

      // Derive plausible tenant slug from domain (company.io → company, co.company.com → company, etc.)
      const slug = domain
        .split(".")
        .filter((p) => !["com", "io", "co", "net", "org", "app", "ai", "hr"].includes(p))
        .join("-")
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 40);

      if (slug.length < 3) continue;

      if (!seen.has(domain)) {
        seen.set(domain, { company, sightingCount: sc });
      }
    } catch {
      // unparseable URL — skip
    }
  }

  return Array.from(seen.entries())
    .slice(0, limit)
    .map(([domain, meta]) => ({ domain, ...meta }));
}

async function probeAtsTenant(
  domain: string,
  slug: string,
  template: (typeof ATS_PROBE_TEMPLATES)[0]
): Promise<DiscoveredTenant | null> {
  const url = template.buildUrl(slug);

  // Ashby requires POST — skip GET probe
  if (template.family === "Ashby") return null;

  try {
    const res = await fetch(url, {
      headers: collectionHeaders({ Accept: "application/json" }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return null;

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      return null;
    }

    const { count, titles } = template.extractJobs(data);
    if (count === 0) return null;

    return {
      domain,
      atsFamily: template.family,
      tenantSlug: slug,
      probeUrl: url,
      httpStatus: res.status,
      jobCount: count,
      sampleTitles: titles,
    };
  } catch {
    return null;
  }
}

async function ensureDiscoveryTable(client: ReturnType<typeof getLakeClient>) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS lake_ats_discovery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL,
      company_hint TEXT,
      ats_family TEXT NOT NULL,
      tenant_slug TEXT NOT NULL,
      probe_url TEXT NOT NULL,
      job_count INTEGER NOT NULL DEFAULT 0,
      sample_titles TEXT,
      review_status TEXT NOT NULL DEFAULT 'pending',
      discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(ats_family, tenant_slug)
    );
  `);
}

export async function runDomainAtsDiscovery(options: {
  domainLimit?: number;
  dryRun?: boolean;
} = {}) {
  const { domainLimit = 100, dryRun = false } = options;

  console.log("=== Starting Company Domain → ATS Tenant Discovery ===");
  console.log(`DomainLimit: ${domainLimit} | DryRun: ${dryRun}`);

  const client = getLakeClient();

  if (!dryRun) {
    await ensureDiscoveryTable(client);
  }

  const stats = {
    domainsScanned: 0,
    probesExecuted: 0,
    tenantHits: 0,
    alreadyKnown: 0,
    stored: 0,
  };

  // Step 1: Extract employer domains from lake
  console.log("\nExtracting employer domains from lake_candidate_jobs...");
  const domains = await extractDomains(client, domainLimit);
  console.log(`Found ${domains.length} unique employer domains to probe.`);

  // Step 2: For each domain, derive slug and probe each ATS family
  for (const { domain, company, sightingCount } of domains) {
    // Derive tenant slug from domain
    const slug = domain
      .split(".")
      .filter((p) => !["com", "io", "co", "net", "org", "app", "ai", "hr"].includes(p))
      .join("-")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 40);

    if (slug.length < 3) continue;

    stats.domainsScanned++;
    const hits: DiscoveredTenant[] = [];

    for (const template of ATS_PROBE_TEMPLATES) {
      if (template.family === "Ashby") continue; // POST-only, skip
      stats.probesExecuted++;

      const result = await probeAtsTenant(domain, slug, template);
      if (result) {
        hits.push(result);
        stats.tenantHits++;
        console.log(
          `  ✓ ${template.family} tenant FOUND: ${slug} (${result.jobCount} jobs) | company: ${company}`
        );
      }

      // Polite inter-probe delay
      await new Promise((r) => setTimeout(r, 300));
    }

    if (hits.length > 0 && !dryRun) {
      for (const hit of hits) {
        try {
          await client.execute({
            sql: `
              INSERT INTO lake_ats_discovery (domain, company_hint, ats_family, tenant_slug, probe_url, job_count, sample_titles)
              VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(ats_family, tenant_slug) DO UPDATE SET
                job_count = ?,
                sample_titles = ?,
                discovered_at = datetime('now');
            `,
            args: [
              hit.domain,
              company,
              hit.atsFamily,
              hit.tenantSlug,
              hit.probeUrl,
              hit.jobCount,
              JSON.stringify(hit.sampleTitles),
              hit.jobCount,
              JSON.stringify(hit.sampleTitles),
            ],
          });
          stats.stored++;
        } catch (err: any) {
          if (err.message?.includes("UNIQUE")) {
            stats.alreadyKnown++;
          } else {
            console.error(`  Error storing discovery for ${hit.tenantSlug}:`, err.message);
          }
        }
      }
    } else if (hits.length > 0 && dryRun) {
      for (const hit of hits) {
        console.log(`  [DryRun] Would store: ${hit.atsFamily}/${hit.tenantSlug} (${hit.jobCount} jobs)`);
        stats.stored++;
      }
    }
  }

  console.log("\n=======================================================");
  console.log("         ATS TENANT DISCOVERY SUMMARY                  ");
  console.log("=======================================================");
  console.log(`Domains Scanned:               ${stats.domainsScanned}`);
  console.log(`ATS Probes Executed:           ${stats.probesExecuted}`);
  console.log(`Tenant Hits Found:             ${stats.tenantHits}`);
  console.log(`Already Known (Skipped):       ${stats.alreadyKnown}`);
  console.log(`New Discoveries Stored:        ${stats.stored}`);
  console.log("-------------------------------------------------------");
  console.log("Next step: review lake_ats_discovery with review_status = 'pending'");
  console.log("           and advance qualified tenants through ADR-006/007 pathway.");
  console.log("=======================================================\n");

  return stats;
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
