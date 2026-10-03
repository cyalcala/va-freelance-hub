/**
 * MATH-09 Offline Identity Fixtures
 *
 * DOCUMENTED GAP: METRICS.md Query 3A (Internal Mechanical Quality Consistency)
 * references `opportunities.fingerprint_hash` for duplicate detection:
 *   `COUNT(*) - COUNT(DISTINCT fingerprint_hash) AS duplicate_count`
 *
 * However, the Cloudflare D1 `opportunities` table schema has `content_hash` only.
 * The `fingerprint_hash` column exists in Turso `lake_candidate_jobs` but NOT in D1.
 *
 * Therefore: the duplicate rate reported by Query 3A is UNMEASURED in production,
 * not 0%. This helper provides offline fixtures to measure identity resolution
 * accuracy using three strategies:
 * 1. EXACT_ATS_ID — ATS requisition ID (e.g., ashby_job_123, greenhouse_abc)
 * 2. NORMALIZED_URL — canonicalized source_url (strip tracking params, normalize case)
 * 3. CONTENT_HASH — toContentHash(title, source_url) as currently stored in D1
 *
 * False Split = same canonical opening gets different identities (over-counting)
 * False Merge = different openings get same identity (under-counting, safety risk)
 */

import { toContentHash, hashString } from "../../packages/scraper/contentHash";

export type IdentityStrategy = "EXACT_ATS_ID" | "NORMALIZED_URL" | "CONTENT_HASH";

export interface IdentityFixture {
  id: string;
  title: string;
  sourceUrl: string;
  atsJobId: string | null;
  expectedCanonicalId: string; // ground truth: which opening this represents
  description: string;
}

export interface IdentityResolutionResult {
  strategy: IdentityStrategy;
  inputCount: number;
  uniqueIdentities: number;
  falseSplits: number; // same canonicalId mapped to different identities
  falseMerges: number; // different canonicalIds mapped to same identity
  splits: Array<{ canonicalId: string; identities: string[] }>;
  merges: Array<{ identity: string; canonicalIds: string[] }>;
}

export interface IdentityComparisonReport {
  fixtures: IdentityFixture[];
  results: Record<IdentityStrategy, IdentityResolutionResult>;
  summary: {
    bestStrategy: IdentityStrategy;
    worstStrategy: IdentityStrategy;
    recommendedStrategy: IdentityStrategy;
    notes: string[];
  };
}

/** Normalize URL for identity comparison: strip tracking params, lowercase host, remove fragments. */
export function normalizeUrlForIdentity(url: string): string {
  try {
    const parsed = new URL(url);
    // Strip common tracking parameters
    const trackingParams = new Set([
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "ref", "referrer", "source", "medium", "campaign",
      "fbclid", "gclid", "msclid", "ttclid", "li_fat_id",
      "_ga", "_gl", "_hsenc", "_hsmi",
    ]);
    for (const param of trackingParams) {
      parsed.searchParams.delete(param);
    }
    // Remove fragment
    parsed.hash = "";
    // Normalize: lowercase host, sort params for determinism
    const sortedParams = Array.from(parsed.searchParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    const search = sortedParams ? `?${sortedParams}` : "";
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${parsed.pathname}${search}`;
  } catch {
    // Fallback: basic lowercase and trim
    return url.toLowerCase().trim();
  }
}

/** Generate identity key for a fixture under a given strategy. */
export function getIdentityKey(fixture: IdentityFixture, strategy: IdentityStrategy): string {
  switch (strategy) {
    case "EXACT_ATS_ID":
      return fixture.atsJobId ? `ats:${fixture.atsJobId}` : `no-ats:${fixture.id}`;
    case "NORMALIZED_URL":
      return `url:${normalizeUrlForIdentity(fixture.sourceUrl)}`;
    case "CONTENT_HASH":
      return `content:${toContentHash(fixture.title, fixture.sourceUrl)}`;
    default:
      throw new Error(`Unknown strategy: ${strategy}`);
  }
}

/** Resolve identities for fixtures under a strategy and detect splits/merges. */
export function resolveIdentities(fixtures: IdentityFixture[], strategy: IdentityStrategy): IdentityResolutionResult {
  const canonicalToIdentities = new Map<string, Set<string>>();
  const identityToCanonicals = new Map<string, Set<string>>();

  for (const fixture of fixtures) {
    const identity = getIdentityKey(fixture, strategy);
    const canonical = fixture.expectedCanonicalId;

    if (!canonicalToIdentities.has(canonical)) canonicalToIdentities.set(canonical, new Set());
    canonicalToIdentities.get(canonical)!.add(identity);

    if (!identityToCanonicals.has(identity)) identityToCanonicals.set(identity, new Set());
    identityToCanonicals.get(identity)!.add(canonical);
  }

  const splits: Array<{ canonicalId: string; identities: string[] }> = [];
  for (const [canonical, identities] of canonicalToIdentities) {
    if (identities.size > 1) {
      splits.push({ canonicalId: canonical, identities: Array.from(identities) });
    }
  }

  const merges: Array<{ identity: string; canonicalIds: string[] }> = [];
  for (const [identity, canonicals] of identityToCanonicals) {
    if (canonicals.size > 1) {
      merges.push({ identity, canonicalIds: Array.from(canonicals) });
    }
  }

  return {
    strategy,
    inputCount: fixtures.length,
    uniqueIdentities: identityToCanonicals.size,
    falseSplits: splits.length,
    falseMerges: merges.length,
    splits,
    merges,
  };
}

/** Run all strategies on fixtures and generate comparison report. */
export function compareIdentityStrategies(fixtures: IdentityFixture[]): IdentityComparisonReport {
  const strategies: IdentityStrategy[] = ["EXACT_ATS_ID", "NORMALIZED_URL", "CONTENT_HASH"];
  const results: Record<IdentityStrategy, IdentityResolutionResult> = {} as any;

  for (const strategy of strategies) {
    results[strategy] = resolveIdentities(fixtures, strategy);
  }

  // Score strategies: fewer false splits + fewer false merges is better
  // False merges are safety-critical (different jobs collapsed), weight them higher
  const scored = strategies.map((s) => ({
    strategy: s,
    score: results[s].falseMerges * 10 + results[s].falseSplits,
  }));
  scored.sort((a, b) => a.score - b.score);

  const bestStrategy = scored[0].strategy;
  const worstStrategy = scored[scored.length - 1].strategy;

  // Recommended: EXACT_ATS_ID when available, else CONTENT_HASH
  const hasAtsCoverage = fixtures.some((f) => f.atsJobId);
  const recommendedStrategy = hasAtsCoverage ? "EXACT_ATS_ID" : "CONTENT_HASH";

  const notes = [
    `D1 opportunities table has content_hash column only; fingerprint_hash does not exist (METRICS.md Query 3A / docs/generated/PARAMETERS.md rely on missing column).`,
    `Duplicate rate in production is UNMEASURED, not 0%.`,
    `EXACT_ATS_ID requires ATS job ID extraction at ingestion (not currently stored in D1).`,
    `CONTENT_HASH (title + sourceUrl) is current D1 deduplication key; vulnerable to title variations.`,
    `NORMALIZED_URL is robust to tracking params but fails on cross-posting with different URLs.`,
    `False merges (safety risk) weighted 10x false splits in strategy scoring.`,
  ];

  return {
    fixtures,
    results,
    summary: {
      bestStrategy,
      worstStrategy,
      recommendedStrategy,
      notes,
    },
  };
}

/**
 * Canonical test fixtures covering known identity resolution edge cases.
 * Each fixture has a ground-truth canonicalId representing the real job opening.
 */
export const IDENTITY_FIXTURES: IdentityFixture[] = [
  // 1. SAME JOB cross-posted to multiple aggregators (should NOT be split)
  {
    id: "crosspost-1a",
    title: "Senior Software Engineer",
    sourceUrl: "https://weworkremotely.com/remote-jobs/senior-software-engineer-123",
    atsJobId: null,
    expectedCanonicalId: "canonical:senior-swe-123",
    description: "We Work Remotely original posting",
  },
  {
    id: "crosspost-1b",
    title: "Senior Software Engineer",
    sourceUrl: "https://remoteok.io/remote-jobs/123-senior-software-engineer",
    atsJobId: null,
    expectedCanonicalId: "canonical:senior-swe-123",
    description: "Remote OK cross-post of same job",
  },
  {
    id: "crosspost-1c",
    title: "Senior Software Engineer",
    sourceUrl: "https://jobs.lever.co/company/123-senior-software-engineer",
    atsJobId: "lever_123",
    expectedCanonicalId: "canonical:senior-swe-123",
    description: "Lever ATS canonical source",
  },

  // 2. SAME JOB with tracking parameters (should NOT be split by NORMALIZED_URL)
  {
    id: "tracking-2a",
    title: "Product Manager",
    sourceUrl: "https://jobs.ashbyhq.com/company/abc?utm_source=linkedin&utm_medium=social",
    atsJobId: "ashby_abc",
    expectedCanonicalId: "canonical:pm-abc",
    description: "Ashby with tracking params",
  },
  {
    id: "tracking-2b",
    title: "Product Manager",
    sourceUrl: "https://jobs.ashbyhq.com/company/abc?ref=newsletter&fbclid=123",
    atsJobId: "ashby_abc",
    expectedCanonicalId: "canonical:pm-abc",
    description: "Same Ashby job with different tracking",
  },

  // 3. SAME JOB with minor title variations (CONTENT_HASH splits)
  {
    id: "title-var-3a",
    title: "Senior Software Engineer",
    sourceUrl: "https://jobs.ashbyhq.com/company/xyz",
    atsJobId: "ashby_xyz",
    expectedCanonicalId: "canonical:swe-xyz",
    description: "Original title",
  },
  {
    id: "title-var-3b",
    title: "Senior Software Engineer (Remote)",
    sourceUrl: "https://jobs.ashbyhq.com/company/xyz",
    atsJobId: "ashby_xyz",
    expectedCanonicalId: "canonical:swe-xyz",
    description: "Title with (Remote) suffix",
  },
  {
    id: "title-var-3c",
    title: "Sr. Software Engineer",
    sourceUrl: "https://jobs.ashbyhq.com/company/xyz",
    atsJobId: "ashby_xyz",
    expectedCanonicalId: "canonical:swe-xyz",
    description: "Abbreviated title",
  },

  // 4. DIFFERENT JOBS with same title at same company (CONTENT_HASH merges dangerously)
  {
    id: "diff-jobs-4a",
    title: "Software Engineer",
    sourceUrl: "https://jobs.ashbyhq.com/company/team-a/role-1",
    atsJobId: "ashby_team_a_1",
    expectedCanonicalId: "canonical:team-a-role-1",
    description: "Team A role 1",
  },
  {
    id: "diff-jobs-4b",
    title: "Software Engineer",
    sourceUrl: "https://jobs.ashbyhq.com/company/team-b/role-2",
    atsJobId: "ashby_team_b_2",
    expectedCanonicalId: "canonical:team-b-role-2",
    description: "Team B role 2 (different team, same title)",
  },

  // 5. SAME JOB reposted with new URL (ATS ID stable, URL changes)
  {
    id: "repost-5a",
    title: "DevOps Engineer",
    sourceUrl: "https://jobs.lever.co/company/devops-123",
    atsJobId: "lever_devops_123",
    expectedCanonicalId: "canonical:devops-123",
    description: "Original Lever posting",
  },
  {
    id: "repost-5b",
    title: "DevOps Engineer",
    sourceUrl: "https://jobs.lever.co/company/devops-123-v2",
    atsJobId: "lever_devops_123",
    expectedCanonicalId: "canonical:devops-123",
    description: "Reposted with v2 URL slug",
  },

  // 6. Greenhouse jobs with different board tokens
  {
    id: "gh-6a",
    title: "Data Scientist",
    sourceUrl: "https://boards.greenhouse.io/company/jobs/12345",
    atsJobId: "gh_12345",
    expectedCanonicalId: "canonical:ds-12345",
    description: "Greenhouse board 1",
  },
  {
    id: "gh-6b",
    title: "Data Scientist",
    sourceUrl: "https://boards.greenhouse.io/partner/jobs/12345",
    atsJobId: "gh_12345",
    expectedCanonicalId: "canonical:ds-12345",
    description: "Same job on partner board",
  },

  // 7. Breezy jobs - same company, different positions
  {
    id: "breezy-7a",
    title: "Virtual Assistant",
    sourceUrl: "https://20four7va.breezy.hr/va-001",
    atsJobId: "breezy_va_001",
    expectedCanonicalId: "canonical:20four7va-va-001",
    description: "20Four7VA position 1",
  },
  {
    id: "breezy-7b",
    title: "Virtual Assistant",
    sourceUrl: "https://20four7va.breezy.hr/va-002",
    atsJobId: "breezy_va_002",
    expectedCanonicalId: "canonical:20four7va-va-002",
    description: "20Four7VA position 2 (different role)",
  },

  // 8. Job with NO ATS ID (RSS/HTML sources)
  {
    id: "rss-8a",
    title: "Content Writer",
    sourceUrl: "https://remotive.io/remote-jobs/content-writer-456",
    atsJobId: null,
    expectedCanonicalId: "canonical:content-writer-456",
    description: "Remotive RSS feed",
  },
  {
    id: "rss-8b",
    title: "Content Writer",
    sourceUrl: "https://remotive.io/remote-jobs/content-writer-456?ref=email",
    atsJobId: null,
    expectedCanonicalId: "canonical:content-writer-456",
    description: "Same Remotive job with ref param",
  },
];

/** Fixture pinning the D1 fingerprint_hash gap: METRICS Query 3A and PARAMETERS.md reference a column that does not exist in D1. */
export const FINGERPRINT_HASH_GAP_FIXTURE: IdentityFixture = {
  id: "fingerprint-hash-gap",
  title: "Duplicate Rate Measurement Gap",
  sourceUrl: "https://example.com/job",
  atsJobId: null,
  expectedCanonicalId: "gap:fingerprint-hash-missing",
  description: "METRICS.md Query 3A and docs/generated/PARAMETERS.md reference opportunities.fingerprint_hash for duplicate detection, but D1 schema has only content_hash. Duplicate rate is UNMEASURED.",
};

/** Minimal fixture set for quick smoke tests. */
export const MINIMAL_IDENTITY_FIXTURES: IdentityFixture[] = [
  {
    id: "min-1",
    title: "Engineer",
    sourceUrl: "https://jobs.ashbyhq.com/co/123",
    atsJobId: "ashby_123",
    expectedCanonicalId: "canon:1",
    description: "Base",
  },
  {
    id: "min-2",
    title: "Engineer (Remote)",
    sourceUrl: "https://jobs.ashbyhq.com/co/123",
    atsJobId: "ashby_123",
    expectedCanonicalId: "canon:1",
    description: "Title variant same ATS ID",
  },
  {
    id: "min-3",
    title: "Engineer",
    sourceUrl: "https://jobs.ashbyhq.com/co/456",
    atsJobId: "ashby_456",
    expectedCanonicalId: "canon:2",
    description: "Different job same title",
  },
];

export function formatIdentityReport(report: IdentityComparisonReport): string {
  const lines = [
    "# MATH-09 Identity Resolution Fixture Report",
    "",
    `**Fixtures tested:** ${report.fixtures.length}`,
    "",
    "## Per-Strategy Results",
    "",
    "| Strategy | Input | Unique Identities | False Splits | False Merges |",
    "| :--- | ---: | ---: | ---: | ---: |",
  ];

  for (const [strategy, result] of Object.entries(report.results)) {
    lines.push(`| ${strategy} | ${result.inputCount} | ${result.uniqueIdentities} | ${result.falseSplits} | ${result.falseMerges} |`);
  }

  lines.push("", "## False Splits (Same Canonical → Different Identities)", "");
  for (const [strategy, result] of Object.entries(report.results)) {
    if (result.splits.length > 0) {
      lines.push(`### ${strategy}`);
      for (const split of result.splits) {
        lines.push(`- **${split.canonicalId}** → ${split.identities.length} identities: ${split.identities.join(", ")}`);
      }
      lines.push("");
    }
  }

  lines.push("## False Merges (Different Canonicals → Same Identity) ⚠️ SAFETY RISK", "");
  for (const [strategy, result] of Object.entries(report.results)) {
    if (result.merges.length > 0) {
      lines.push(`### ${strategy}`);
      for (const merge of result.merges) {
        lines.push(`- **${merge.identity}** ← ${merge.canonicalIds.length} canonicals: ${merge.canonicalIds.join(", ")}`);
      }
      lines.push("");
    }
  }

  lines.push("## Summary & Recommendation", "");
  lines.push(`- **Best overall:** ${report.summary.bestStrategy} (fewest weighted errors)`);
  lines.push(`- **Worst:** ${report.summary.worstStrategy}`);
  lines.push(`- **Recommended for production:** ${report.summary.recommendedStrategy}`);
  lines.push("");
  lines.push("## Notes");
  for (const note of report.summary.notes) {
    lines.push(`- ${note}`);
  }

  return lines.join("\n");
}

if (import.meta.main) {
  const report = compareIdentityStrategies(IDENTITY_FIXTURES);
  console.log(formatIdentityReport(report));
}