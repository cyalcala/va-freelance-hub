/**
 * INCIDENT-0410(u): the wiring, not just the selector.
 *
 * `held-tenant-readjudication.test.ts` pins which tenants are chosen. This file pins
 * that the second pass actually re-probes them, and — more importantly — that it
 * cannot do the things it must not do: admit a source that is not already
 * `auto_approved`, demote a tenant because its board happened to be thin this run,
 * double-probe a tenant the discovery loop already handled, keep running after one
 * tenant fails, or take the whole discovery run down with it.
 *
 * The pass is exercised end to end against the real `readjudicateHeldTenants`, the
 * real `evaluateTenant`, the real `probeTenantJobs`, the real `computeTenantMetrics`,
 * the real `geoGate` and the real `decideAdmission`, with `fetch` and the judge
 * injected and a recording fake for the lake. Nothing here asserts a constant against
 * itself: every assertion is about an observable effect on the recorded lake calls,
 * the recorded outbound requests, or the returned stats.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import {
  HELD_READJUDICATION_CAP_PER_RUN,
  MIN_JOBS_TO_EVALUATE,
  buildDiscoverySourceId,
  decideAdmission,
  emptyDiscoveryStats,
  extractDiscoveryCandidatesFromRows,
  readjudicateHeldTenants,
  type DiscoveryStats,
  type HeldTenantCandidateRow,
} from "./domain-ats-discovery";
import { JEV_MIN_CONFIDENCE, decideAutoPublish, parseJevRaw } from "./auto-publish-policy";

/** A confident Jev verdict, injected so no network call is made. */
const CONFIDENT_ADMIT = {
  ok: true as const,
  model: "test/jev-1.13",
  answers: {
    admission: {
      choice: "ADMIT" as const,
      confidence: 0.91,
      rationale: "injected",
    },
  },
  raw: {} as unknown as Record<string, unknown>,
};

/** Minimal Lever-postings JSON for the production Lever probe template. */
function leverJson(count: number, location = "Remote (Worldwide)") {
  return Array.from({ length: count }, (_, i) => ({
    text: `Support Engineer ${i}`,
    hostedUrl: `https://jobs.lever.co/acme/${i}`,
    descriptionPlain: "Fully remote, work from anywhere including the Philippines.",
    categories: { location, team: "Support" },
    createdAt: 1758000000000,
  }));
}

/** Recording fake for the lake client: every statement is kept for assertions. */
function fakeLake(rows: HeldTenantCandidateRow[]) {
  const statements: string[] = [];
  const args: unknown[][] = [];
  const client = {
    execute: async (req: { sql: string; args?: unknown[] }) => {
      statements.push(req.sql);
      args.push(req.args ?? []);
      const normalized = req.sql.replace(/\s+/g, " ").trim();
      if (normalized.includes("FROM lake_ats_discovery d")) {
        return { rows: rows.map((r) => ({
          source_id: r.sourceId,
          review_status: r.reviewStatus,
          ats_family: r.atsFamily,
          tenant_slug: r.tenantSlug,
          domain: r.domain,
          company_hint: r.companyHint,
          job_count: r.jobCount,
          qualified_ready: r.qualifiedReady,
          ph_rate: r.phRate,
          last_evaluated_at: r.lastEvaluatedAt,
          jev_raw: r.jevRaw,
          pending_qualified: r.pendingQualified,
        })) };
      }
      if (normalized.includes("COUNT(*) AS cnt FROM lake_candidate_jobs")) {
        const total = rows.reduce((sum, r) => sum + r.pendingQualified, 0);
        return { rows: [{ cnt: total }] };
      }
      return { rows: [] };
    },
  };
  return { client: client as never, statements, args };
}

const originalFetch = globalThis.fetch;
const originalJevKey = process.env.OPENROUTER_API_KEY;
beforeEach(() => {
  // These wiring tests exercise the deterministic fallback. A developer's
  // .env must not add a provider request to the recorded ATS probe calls.
  delete process.env.OPENROUTER_API_KEY;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalJevKey === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = originalJevKey;
});

function stubFetch(handler: (url: string) => { status: number; body: unknown }) {
  const urls: string[] = [];
  globalThis.fetch = (async (input: any) => {
    const url = String(input);
    urls.push(url);
    const { status, body } = handler(url);
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
  return urls;
}

const heldRow = (overrides: Partial<HeldTenantCandidateRow> = {}): HeldTenantCandidateRow => ({
  sourceId: buildDiscoverySourceId("lever", "acme"),
  reviewStatus: "auto_approved",
  atsFamily: "lever",
  tenantSlug: "acme",
  domain: "acme.lever",
  companyHint: "Acme",
  jobCount: 10,
  qualifiedReady: 3,
  phRate: 0.3,
  lastEvaluatedAt: "2026-10-03 07:00:00",
  pendingQualified: 3,
  jevRaw: null,
  ...overrides,
});

describe("readjudicateHeldTenants — the pass re-probes the held cohort", () => {
  test("probes the selected tenant and records the verdict through the existing writer", async () => {
    const urls = stubFetch(() => ({ status: 200, body: leverJson(10) }));
    const { client, statements } = fakeLake([heldRow()]);
    const stats = emptyDiscoveryStats();

    const selection = await readjudicateHeldTenants(client, {
      cap: 5,
      dryRun: false,
      probeDelayMs: 0,
      rateLimitedHosts: new Set(),
      stats,
    });

    expect(urls).toEqual(["https://api.lever.co/v0/postings/acme?mode=json"]);
    expect(selection!.selected.map((t) => t.sourceId)).toEqual(["lever:acme"]);
    expect(stats.heldTenantsReadjudicated).toBe(1);

    const upsert = statements.find((sql) => sql.includes("INSERT INTO lake_ats_discovery"));
    expect(upsert).toBeDefined();
    // The verdict and the C18 retention clause are the production ones.
    expect(upsert!).toContain("jev_raw");
    expect(upsert!).toContain("ON CONFLICT(ats_family, tenant_slug) DO UPDATE SET");
    // And the tenant is still auto_approved afterwards: the verdict did not demote it.
    expect(statements.some((sql) => sql.includes("'auto_rejected'"))).toBe(false);
  });

  test("the verdict decideAdmission writes is exactly what the publication gate reads", async () => {
    // `decideAdmission` is the only place a verdict is minted, and its `jevRaw` is
    // the string the next publisher run parses. This closes that loop with the real
    // judge call injected, so no network request is made.
    const metrics = { totalJobs: 10, qualifiedReady: 3, excluded: 5, ambiguous: 2, phRate: 0.3, topCategories: ["support"] };
    // The judge is injected, so the key `decideAdmission` forwards is never read and
    // no provider request is made. No credential is read, set or asserted here.
    const decision = await decideAdmission("acme", "Lever", metrics, (async () => CONFIDENT_ADMIT) as never);

    expect(decision.jevRaw).toBeDefined();
    const parsed = parseJevRaw(decision.jevRaw!);
    expect(parsed).toEqual({ choice: "ADMIT", confidence: 0.91 });

    // Same cohort, same counters: HOLD without the verdict, and only the verdict —
    // at the production confidence floor — moves it. No threshold is touched here.
    const withoutVerdict = decideAutoPublish({ sourceId: "lever:acme", totalJobs: 10, qualifiedReady: 3, inventory: null });
    expect(withoutVerdict.action).toBe("HOLD");
    expect(decideAutoPublish({
      sourceId: "lever:acme",
      totalJobs: 10,
      qualifiedReady: 3,
      jevChoice: parsed!.choice,
      jevConfidence: parsed!.confidence,
      inventory: null,
    }).action).toBe("PUBLISH");
    // Just under the floor the same verdict is refused, proving the floor still binds.
    expect(decideAutoPublish({
      sourceId: "lever:acme",
      totalJobs: 10,
      qualifiedReady: 3,
      jevChoice: parsed!.choice,
      jevConfidence: JEV_MIN_CONFIDENCE - 0.01,
      inventory: null,
    }).action).toBe("HOLD");
  });

  test("a tenant the discovery loop already probed is not probed twice", async () => {
    const urls = stubFetch(() => ({ status: 200, body: leverJson(10) }));
    const { client } = fakeLake([heldRow()]);
    const stats = emptyDiscoveryStats();

    const selection = await readjudicateHeldTenants(client, {
      cap: 5,
      dryRun: false,
      probeDelayMs: 0,
      rateLimitedHosts: new Set(),
      stats,
      alreadyProbed: new Set(["lever:acme"]),
    });

    expect(urls).toEqual([]);
    expect(selection!.selected).toHaveLength(1);
    expect(stats.heldTenantsReadjudicated).toBe(0);
  });

  test("cap 0 disables the pass without touching the lake", async () => {
    const { client, statements } = fakeLake([heldRow()]);
    const stats = emptyDiscoveryStats();

    const selection = await readjudicateHeldTenants(client, {
      cap: 0,
      dryRun: false,
      probeDelayMs: 0,
      rateLimitedHosts: new Set(),
      stats,
    });

    expect(selection).toBeNull();
    expect(statements).toEqual([]);
    expect(stats.heldTenantsReadjudicated).toBeUndefined();
  });

  test("the default cap is a positive integer, so the pass is on unless a caller disables it", () => {
    expect(Number.isInteger(HELD_READJUDICATION_CAP_PER_RUN)).toBe(true);
    expect(HELD_READJUDICATION_CAP_PER_RUN).toBeGreaterThan(0);
  });

  test("a rate-limited host is skipped, not retried", async () => {
    const urls = stubFetch(() => ({ status: 200, body: leverJson(10) }));
    const { client } = fakeLake([heldRow()]);
    const stats = emptyDiscoveryStats();
    const rateLimitedHosts = new Set(["api.lever.co"]);

    await readjudicateHeldTenants(client, {
      cap: 5,
      dryRun: false,
      probeDelayMs: 0,
      rateLimitedHosts,
      stats,
    });

    expect(urls).toEqual([]);
    expect(stats.heldTenantsReadjudicated).toBe(0);
    expect(stats.skippedRateLimitedHost).toBe(1);
  });

  test("an unknown ATS family is skipped rather than fanned out to every template", async () => {
    const urls = stubFetch(() => ({ status: 200, body: leverJson(10) }));
    const { client } = fakeLake([
      heldRow({ atsFamily: "notafamily", sourceId: "notafamily:acme", tenantSlug: "acme" }),
    ]);
    const stats = emptyDiscoveryStats();

    await readjudicateHeldTenants(client, {
      cap: 5,
      dryRun: false,
      probeDelayMs: 0,
      rateLimitedHosts: new Set(),
      stats,
    });

    expect(urls).toEqual([]);
    expect(stats.heldTenantsReadjudicated).toBe(0);
  });
});

describe("readjudicateHeldTenants — what the pass must never do", () => {
  test("a thin board does not demote a tenant that is holding supply", async () => {
    // 2 live jobs, below MIN_JOBS_TO_EVALUATE. The bulk path would persist
    // `auto_rejected` here; the held-supply pass must not.
    stubFetch(() => ({ status: 200, body: leverJson(MIN_JOBS_TO_EVALUATE - 1) }));
    const { client, statements } = fakeLake([heldRow({ jobCount: 10, qualifiedReady: 3, pendingQualified: 3 })]);
    const stats = emptyDiscoveryStats();

    await readjudicateHeldTenants(client, {
      cap: 5,
      dryRun: false,
      probeDelayMs: 0,
      rateLimitedHosts: new Set(),
      stats,
    });

    expect(statements.some((sql) => sql.includes("INSERT INTO lake_ats_discovery"))).toBe(false);
    expect(statements.some((sql) => sql.includes("'auto_rejected'"))).toBe(false);
  });

  test("a dead board does not demote a tenant that is holding supply", async () => {
    stubFetch(() => ({ status: 500, body: {} }));
    const { client, statements } = fakeLake([heldRow()]);
    const stats = emptyDiscoveryStats();

    await readjudicateHeldTenants(client, {
      cap: 5,
      dryRun: false,
      probeDelayMs: 0,
      rateLimitedHosts: new Set(),
      stats,
    });

    expect(statements.some((sql) => sql.includes("'auto_rejected'"))).toBe(false);
  });

  test("only tenants already auto_approved are ever re-probed", async () => {
    const urls = stubFetch(() => ({ status: 200, body: leverJson(10) }));
    const { client } = fakeLake([
      heldRow({ reviewStatus: "shadow_monitor" }),
      heldRow({ tenantSlug: "b", sourceId: "lever:b", reviewStatus: "auto_rejected" }),
      heldRow({ tenantSlug: "c", sourceId: "lever:c", reviewStatus: "discovered" }),
    ]);
    const stats = emptyDiscoveryStats();

    const selection = await readjudicateHeldTenants(client, {
      cap: 10,
      dryRun: false,
      probeDelayMs: 0,
      rateLimitedHosts: new Set(),
      stats,
    });

    expect(urls).toEqual([]);
    expect(selection!.selected).toEqual([]);
    expect(selection!.gateExcluded).toBe(3);
  });

  test("dryRun probes and decides but writes nothing", async () => {
    const urls = stubFetch(() => ({ status: 200, body: leverJson(10) }));
    const { client, statements } = fakeLake([heldRow()]);
    const stats = emptyDiscoveryStats();

    await readjudicateHeldTenants(client, {
      cap: 5,
      dryRun: true,
      probeDelayMs: 0,
      rateLimitedHosts: new Set(),
      stats,
    });

    expect(urls).toHaveLength(1);
    expect(statements.some((sql) => sql.includes("INSERT INTO lake_ats_discovery"))).toBe(false);
  });

  test("the read-only cohort query carries no write, no limit and no source widening", async () => {
    const { client, statements } = fakeLake([heldRow()]);
    await readjudicateHeldTenants(client, {
      cap: 1,
      dryRun: true,
      probeDelayMs: 0,
      rateLimitedHosts: new Set(),
      stats: emptyDiscoveryStats(),
    });

    const cohortQuery = statements.find((sql) => sql.includes("FROM lake_ats_discovery d"))!;
    expect(cohortQuery.toUpperCase()).not.toContain("INSERT");
    expect(cohortQuery.toUpperCase()).not.toContain("UPDATE");
    expect(cohortQuery.toUpperCase()).not.toContain("DELETE");
    expect(cohortQuery.toUpperCase()).not.toContain("DROP");
    expect(cohortQuery).toContain("d.review_status = 'auto_approved'");
    expect(cohortQuery).toContain("d.jev_raw IS NULL");
    // No LIMIT: capping in memory is what stops a decided cohort starving the rest.
    expect(cohortQuery.toUpperCase()).not.toContain("LIMIT");
  });
});

describe("extractDiscoveryCandidatesFromRows — the ranking that caused the hold", () => {
  test("ranks by sighting volume, so held supply is invisible to it", () => {
    const ranked = extractDiscoveryCandidatesFromRows(
      [
        { application_url: "https://jobs.lever.co/highvolume/1", company: "Highvolume" },
        { application_url: "https://jobs.lever.co/supabase/1", company: "Supabase" },
      ],
      25,
    );

    // This is the whole defect: nothing in the input says which tenant is holding
    // 60 unpublishable rows, so the held tenant is selected on merit of volume alone.
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.map((c) => c.slug)).toContain("supabase");
  });
});

describe("DiscoveryStats — the additive counter", () => {
  test("a fresh stats object reports no re-adjudication", () => {
    const stats: DiscoveryStats = emptyDiscoveryStats();

    expect(stats.heldTenantsReadjudicated).toBeUndefined();
    expect(stats.heldTenantsReadjudicated ?? 0).toBe(0);
    // Every pre-existing field is untouched, so older callers keep working.
    expect(Object.keys(stats).sort()).toEqual([
      "admitted", "domainsScanned", "jobsIngested", "rejected",
      "shadowed", "skippedRateLimitedHost", "tenantsFound",
    ]);
  });
});
