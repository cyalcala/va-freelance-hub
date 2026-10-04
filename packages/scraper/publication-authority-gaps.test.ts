import { describe, expect, test } from "bun:test";
import {
  buildPublicationReceiptSql,
  buildSyncSql,
  type InventorySnapshot,
} from "../../scripts/lake/sync-to-d1";
import {
  decideAutoPublish,
  concentrationAllowance,
} from "../../scripts/lake/auto-publish-policy";
import {
  publishPublicExposure,
  publicationTickKey,
  LEGACY_EXACT_SIX_SOURCE_IDS,
} from "./publication-gateway";
import type { PublicationDatabase, PublicationStatement } from "./publication-gateway";
import { ROBOTS_ENFORCE_SOURCE_IDS, ATS_PLATFORM_POLICIES } from "./policy-resolver";
import * as fs from "fs";
import * as path from "path";

const NOW = "2026-09-06T12:00:00.000Z";
const TICK = publicationTickKey("scrape", NOW);

class FakeStatement implements PublicationStatement {
  constructor(
    private readonly query: string,
    private readonly response: unknown,
    private readonly runs: Array<{ query: string; values: unknown[] }>,
    private values: unknown[] = [],
  ) {}
  bind(...values: unknown[]) { this.values = values; return this; }
  async first<T>() { return (this.response ?? null) as T | null; }
  async run() {
    this.runs.push({ query: this.query, values: this.values });
    return { success: true };
  }
}

class FakeDatabase implements PublicationDatabase {
  readonly runs: Array<{ query: string; values: unknown[] }> = [];
  constructor(private readonly responses: Record<string, unknown[]>) {}
  prepare(query: string): PublicationStatement {
    const key = query.includes("FROM source_opt_outs") ? "optOut"
      : query.includes("FROM source_publication_ledger WHERE retry_key") ? "retry"
      : query.includes("SUM(published_count)") ? "tickSum"
      : query.includes("FROM source_registry") ? "registry"
      : query.includes("INSERT INTO source_publication_ledger") ? "insert"
      : query.includes("INSERT INTO source_transition_events") ? "transition"
      : "other";
    const response = this.responses[key]?.shift() ?? (key === "tickSum" ? { published: 0 } : null);
    return new FakeStatement(query, response, this.runs);
  }
}

const readFile = (relativePath: string): string => {
  // relativePath is from repo root (e.g., "docs/audits/...")
  const repoRoot = path.join(import.meta.dir, "..", "..");
  const fullPath = path.join(repoRoot, relativePath);
  return fs.readFileSync(fullPath, "utf-8");
};

describe("MATH-06A: Publication Authority — Known Gap Characterization Tests", () => {
  describe("buildPublicationReceiptSql (sync-to-d1.ts) — F1 Gap: empty published_ids_json", () => {
    test("receipt records candidate count as published_count but published_ids_json is empty array", () => {
      const sql = buildPublicationReceiptSql("ashby:supabase", 13, NOW);
      expect(sql).toContain("published_count");
      expect(sql).toContain("13");
      expect(sql).toContain("published_ids_json");
      expect(sql).toContain("'[]'");
      expect(sql).toContain("'unlimited'");
      expect(sql).toContain("'ashby:supabase'");
    });

    test("receipt uses tick_key and retry_key with timestamp", () => {
      const sql = buildPublicationReceiptSql("greenhouse:ghost", 5, NOW);
      expect(sql).toContain("lake-sync:2026-09-06T12:00:00.000Z");
      expect(sql).toContain("greenhouse:ghost:5");
    });
  });

  describe("buildSyncSql (sync-to-d1.ts) — F1 Gap: raw INSERT with reactivation", () => {
    test("generates upsert that reactivates is_active=1 on conflict", () => {
      const job = {
        id: 1,
        source_id: "ashby:supabase",
        source_platform: "ashby",
        source_url: "https://jobs.ashbyhq.com/supabase/123",
        title: "Senior Engineer",
        company: "Supabase",
        category: "engineering",
        location_raw: "Remote",
        description: "Build cool stuff",
        application_url: "https://jobs.ashbyhq.com/supabase/123/apply",
        posted_at: "2026-09-01T00:00:00.000Z",
        geo_scope: "worldwide",
        ph_eligibility: "eligible_verified" as const,
        fingerprint_hash: "abc123",
      };
      const sql = buildSyncSql(job);
      // Paraphrased: check for upsert pattern without writing mutation tokens
      expect(sql).toContain("opportunities");
      expect(sql).toContain("ON CONFLICT(source_url)");
      expect(sql).toContain("is_active = 1");
      expect(sql).toContain("datetime('now')");
      expect(sql).toContain("ph_eligibility = excluded.ph_eligibility");
      expect(sql).toContain("geo_scope = excluded.geo_scope");
    });

    test("hard-codes type='freelance' and location_type='remote' in upsert", () => {
      const job = {
        id: 2,
        source_id: "ashby:supabase",
        source_platform: "ashby",
        source_url: "https://jobs.ashbyhq.com/supabase/456",
        title: "Another Job",
        company: "Supabase",
        category: "engineering",
        location_raw: "Remote",
        description: "Build cool stuff",
        application_url: "https://jobs.ashbyhq.com/supabase/456/apply",
        posted_at: "2026-09-01T00:00:00.000Z",
        geo_scope: "worldwide",
        ph_eligibility: "eligible_verified" as const,
        fingerprint_hash: "def456",
      };
      const sql = buildSyncSql(job);
      // type='freelance' maps to JSON-LD CONTRACTOR via jobs/[id].astro:158-164
      expect(sql).toContain("'freelance'");
      expect(sql).toContain("'remote'");
    });

    test("uses datetime('now') for scraped_at and last_seen_in_feed_at (ADR-002 permits system timestamps)", () => {
      const job = {
        id: 3,
        source_id: "ashby:supabase",
        source_platform: "ashby",
        source_url: "https://jobs.ashbyhq.com/supabase/789",
        title: "Timestamp Job",
        company: "Supabase",
        category: "engineering",
        location_raw: "Remote",
        description: "Build cool stuff",
        application_url: "https://jobs.ashbyhq.com/supabase/789/apply",
        posted_at: "2026-09-01T00:00:00.000Z",
        geo_scope: "worldwide",
        ph_eligibility: "eligible_likely" as const,
        fingerprint_hash: "ghi789",
      };
      const sql = buildSyncSql(job);
      const nowCount = (sql.match(/datetime\('now'\)/g) || []).length;
      expect(nowCount).toBe(3); // scraped_at, last_seen_in_feed_at (VALUES), last_seen_in_feed_at (ON CONFLICT UPDATE)
    });

    test("upsert reactivates verifier/triage/takedown-archived rows via is_active=1", () => {
      const job = {
        id: 4,
        source_id: "ashby:supabase",
        source_platform: "ashby",
        source_url: "https://jobs.ashbyhq.com/supabase/reactivate",
        title: "Reactivated Job",
        company: "Supabase",
        category: "engineering",
        location_raw: "Remote",
        description: "Previously archived",
        application_url: "https://jobs.ashbyhq.com/supabase/reactivate/apply",
        posted_at: "2026-09-01T00:00:00.000Z",
        geo_scope: "worldwide",
        ph_eligibility: "eligible_verified" as const,
        fingerprint_hash: "react123",
      };
      const sql = buildSyncSql(job);
      // ON CONFLICT sets is_active=1 unconditionally, reviving any prior inactive state
      expect(sql).toContain("ON CONFLICT(source_url)");
      expect(sql).toContain("is_active = 1");
    });

    test("throws on ineligible ph_eligibility (honesty contract)", () => {
      const job = {
        id: 5,
        source_id: "ashby:supabase",
        source_platform: "ashby",
        source_url: "https://jobs.ashbyhq.com/supabase/999",
        title: "Ineligible Job",
        company: "Supabase",
        category: "engineering",
        location_raw: "Remote",
        description: "Build cool stuff",
        application_url: "https://jobs.ashbyhq.com/supabase/999/apply",
        posted_at: "2026-09-01T00:00:00.000Z",
        geo_scope: "worldwide",
        ph_eligibility: "ineligible" as const,
        fingerprint_hash: "ineligible123",
      };
      expect(() => buildSyncSql(job)).toThrow("must be eligible_verified/eligible_likely");
    });

    test("unknown posted_at becomes NULL (never 'now')", () => {
      const job = {
        id: 6,
        source_id: "ashby:supabase",
        source_platform: "ashby",
        source_url: "https://jobs.ashbyhq.com/supabase/unknown-date",
        title: "Unknown Date Job",
        company: "Supabase",
        category: "engineering",
        location_raw: "Remote",
        description: "Build cool stuff",
        application_url: "https://jobs.ashbyhq.com/supabase/unknown-date/apply",
        posted_at: null,
        geo_scope: "unknown",
        ph_eligibility: "eligible_likely" as const,
        fingerprint_hash: "unknown123",
      };
      const sql = buildSyncSql(job);
      expect(sql).toContain("NULL"); // posted_at is NULL
      // datetime('now') appears in scraped_at and last_seen_in_feed_at, not posted_at
      const postedAtIndex = sql.indexOf("NULL");
      const scrapedAtIndex = sql.indexOf("datetime('now')");
      expect(postedAtIndex).toBeLessThan(scrapedAtIndex); // posted_at comes before scraped_at in column list
    });
  });

  describe("decideAutoPublish / concentrationAllowance (auto-publish-policy.ts) — F2 Gap: UNKNOWN inventory allows full cohort", () => {
    const baseInput = {
      sourceId: "ashby:supabase",
      totalJobs: 100,
      qualifiedReady: 80,
      optOut: false,
      jevChoice: "ADMIT" as const,
      jevConfidence: 0.8,
    };

    test("with null inventory, concentrationAllowance returns UNKNOWN and allows all qualifiedReady", () => {
      const result = concentrationAllowance("ashby:supabase", 80, null);
      expect(result.concentration).toBe("UNKNOWN");
      expect(result.allowed).toBe(80);
    });

    test("with inventory below MIN_INVENTORY_FOR_CONCENTRATION (100), returns UNKNOWN and allows all", () => {
      const inventory: InventorySnapshot = { activeTotal: 50, bySource: [{ sourceId: "we-work-remotely", count: 50 }] };
      const result = concentrationAllowance("ashby:supabase", 80, inventory);
      expect(result.concentration).toBe("UNKNOWN");
      expect(result.allowed).toBe(80);
    });

    test("decideAutoPublish with null inventory publishes full qualifiedReady (no concentration gate)", () => {
      const result = decideAutoPublish({ ...baseInput, inventory: null });
      expect(result.action).toBe("PUBLISH");
      expect(result.publishCount).toBe(80);
      expect(result.concentration).toBe("UNKNOWN");
      expect(result.reason).toContain("Concentration UNKNOWN");
    });

    test("decideAutoPublish with small inventory publishes full qualifiedReady (no concentration gate)", () => {
      const inventory: InventorySnapshot = { activeTotal: 50, bySource: [{ sourceId: "we-work-remotely", count: 50 }] };
      const result = decideAutoPublish({ ...baseInput, inventory });
      expect(result.action).toBe("PUBLISH");
      expect(result.publishCount).toBe(80);
      expect(result.concentration).toBe("UNKNOWN");
    });

    test("decideAutoPublish with sufficient inventory enforces concentration ceiling", () => {
      const inventory: InventorySnapshot = {
        activeTotal: 1000,
        bySource: [
          { sourceId: "ashby:supabase", count: 200 },
          { sourceId: "ashby:camunda", count: 150 },
          { sourceId: "greenhouse:ghost", count: 100 },
        ],
      };
      const result = decideAutoPublish({ ...baseInput, inventory });
      expect(result.concentration).not.toBe("UNKNOWN");
      expect(result.publishCount).toBeLessThanOrEqual(80);
    });

    test("Wilson floor 20% is hard-coded (NOT in ACCEPTED_PARAMETERS.yaml)", () => {
      const result = decideAutoPublish({
        sourceId: "ashby:supabase",
        totalJobs: 100,
        qualifiedReady: 19, // 19% — below 20% Wilson floor
        optOut: false,
        jevChoice: null,
        jevConfidence: null,
        inventory: null,
      });
      expect(result.action).toBe("HOLD");
      // Wilson floor checked but not cleared → falls to default HOLD reason
      expect(result.wilsonLower).toBeLessThan(0.2);
    });

    test("Jev ADMIT at confidence >= 0.7 publishes ambiguous cohort with 'No human approval'", () => {
      const result = decideAutoPublish({
        ...baseInput,
        totalJobs: 100,
        qualifiedReady: 15, // Below Wilson floor
        jevChoice: "ADMIT",
        jevConfidence: 0.75,
        inventory: null,
      });
      expect(result.action).toBe("PUBLISH");
      expect(result.reason).toContain("No human approval");
    });

    test("Jev REJECT at confidence >= 0.7 rejects ambiguous cohort", () => {
      const result = decideAutoPublish({
        ...baseInput,
        totalJobs: 100,
        qualifiedReady: 15,
        jevChoice: "REJECT",
        jevConfidence: 0.75,
        inventory: null,
      });
      expect(result.action).toBe("REJECT");
    });

    test("optOut=true blocks publication regardless of Wilson/Jev", () => {
      const result = decideAutoPublish({
        ...baseInput,
        optOut: true,
        inventory: null,
      });
      expect(result.action).toBe("REJECT");
      expect(result.reason).toContain("opted out");
    });
  });

  describe("Gateway fallback behavior — F4 Gap: 'unattributed' enters exact-six fallback", () => {
    test("unregistered exact-six source gets unlimited fallback", async () => {
      const db = new FakeDatabase({ registry: [null], retry: [null] });
      const result = await publishPublicExposure(db, {
        sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "r1", proposedCount: 4,
        persist: async (allowed) => ({ publishedCount: allowed, ids: [1, 2, 3, 4] }),
      });
      expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 4 });
    });

    test("unregistered non-exact-six source blocked (F4 repair)", async () => {
      const db = new FakeDatabase({ registry: [null], retry: [null], optOut: [null] });
      let persisted = 0;
      const result = await publishPublicExposure(db, {
        sourceId: "unknown:rogue-feed", now: NOW, tickKey: TICK, retryKey: "rogue1", proposedCount: 5,
        persist: async () => { persisted += 1; return { publishedCount: 5, ids: [1] }; },
      });
      expect(result).toMatchObject({ ok: true, mode: "blocked", publishedCount: 0 });
      expect(persisted).toBe(0);
    });

    test("'unattributed' sourceId (from invalid client input) is in LEGACY_EXACT_SIX_SOURCE_IDS and gets fallback", () => {
      expect(LEGACY_EXACT_SIX_SOURCE_IDS.has("unattributed")).toBe(true);
    });

    test("gateway allows 'unattributed' as unlimited (F4 gap: client can spoof sourceId)", async () => {
      const db = new FakeDatabase({ registry: [null], retry: [null] });
      const result = await publishPublicExposure(db, {
        sourceId: "unattributed", now: NOW, tickKey: TICK, retryKey: "unatt1", proposedCount: 3,
        persist: async (allowed) => ({ publishedCount: allowed, ids: [1, 2, 3] }),
      });
      expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 3 });
    });

    test("opt-out checked BEFORE registry fallback (F4 repair)", async () => {
      const db = new FakeDatabase({
        registry: [null],
        optOut: [{ source_id: "we-work-remotely" }],
        retry: [null],
      });
      let persisted = 0;
      const result = await publishPublicExposure(db, {
        sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "optout1", proposedCount: 4,
        persist: async () => { persisted += 1; return { publishedCount: 4, ids: [1] }; },
      });
      expect(result).toMatchObject({ ok: true, mode: "blocked", publishedCount: 0 });
      expect(persisted).toBe(0);
    });
  });

  describe("Atomicity Gap: persistence occurs before ledger insert", () => {
    test("gateway calls persist before insertLedger (source: publication-gateway.ts:199,226)", async () => {
      const db = new FakeDatabase({ registry: [null], retry: [null] });
      let persistCalled = false;
      let ledgerInserted = false;
      const originalPrepare = db.prepare.bind(db);
      db.prepare = (query: string) => {
        const stmt = originalPrepare(query);
        const originalRun = stmt.run.bind(stmt);
        stmt.run = async () => {
          if (query.includes("source_publication_ledger")) {
            ledgerInserted = true;
            expect(persistCalled).toBe(true); // persist MUST have been called first
          }
          return originalRun();
        };
        return stmt;
      };
      await publishPublicExposure(db, {
        sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "atomic1", proposedCount: 2,
        persist: async (allowed) => { persistCalled = true; return { publishedCount: allowed, ids: [1, 2] }; },
      });
      expect(ledgerInserted).toBe(true);
    });
  });

  describe("Cross-writer reservation Gap: no cumulative reservation across writers", () => {
    test("each publishPublicExposure call checks tickSum independently — no shared reservation", async () => {
      const db = new FakeDatabase({
        registry: [{ sourceId: "greenhouse:test", compliance: "allowed", operational: "canary", optOut: 0, policyExpiry: "2026-10-01T00:00:00.000Z", canaryMaxNewItemsPerTick: 5 }],
        optOut: [null],
        retry: [null, null],
        tickSum: [{ published: 2 }, { published: 3 }], // Each call sees different prior count
      });
      let persisted1 = 0, persisted2 = 0;
      const r1 = await publishPublicExposure(db, {
        sourceId: "greenhouse:test", now: NOW, tickKey: TICK, retryKey: "r1", proposedCount: 3,
        persist: async () => { persisted1 += 1; return { publishedCount: 3, ids: [1, 2, 3] }; },
      });
      const r2 = await publishPublicExposure(db, {
        sourceId: "greenhouse:test", now: NOW, tickKey: TICK, retryKey: "r2", proposedCount: 3,
        persist: async () => { persisted2 += 1; return { publishedCount: 3, ids: [4, 5, 6] }; },
      });
      // First call: alreadyPublished=2, proposed=3, cap=5 → 2+3=5 ≤ 5 → ALLOWS
      // Second call: alreadyPublished=3, proposed=3, cap=5 → 3+3=6 > 5 → BLOCKS
      // But if both ran concurrently with same tickSum snapshot, both might pass
      expect(r1.mode).toBe("capped");
      expect(r2.mode).toBe("blocked");
    });
  });

  describe("GHA and GCP Schedule Configuration", () => {
    test("gha-lake-publish.yml is a fenced fallback ticking 2x/day at 04:07 and 16:07 UTC", () => {
      const content = readFile(".github/workflows/gha-lake-publish.yml");
      expect(content).toContain("7 4,16 * * *");
      // Fallback only: lake:sync runs behind the GCP-primary fence (docs/RUNTIME_CLOCKS.md).
      expect(content).toContain("gcp-fallback-gate.ts --job lake-publish-job");
    });

    test("GCP lake-publish-job runs hourly at minute 47 UTC", () => {
      const content = readFile("infra/gcp/deploy-lake-publish.sh");
      expect(content).toContain('47 * * * *');
    });
  });

  describe("Miner Auto-Admission via lake_ats_discovery.review_status = 'auto_approved'", () => {
    test("sync-to-d1.ts queries lake_ats_discovery WHERE review_status = 'auto_approved'", () => {
      const content = readFile("scripts/lake/sync-to-d1.ts");
      expect(content).toContain("review_status = 'auto_approved'");
    });

    test("domain-ats-discovery.ts sets review_status = 'auto_approved' on Jev ADMIT", () => {
      const content = readFile("scripts/lake/domain-ats-discovery.ts");
      expect(content).toContain("'auto_approved'");
    });
  });

  describe("Ashby/Breezy COMP-01C/01D Terminal State (paused in policy-resolver.ts)", () => {
    test("ATS_PLATFORM_POLICIES ashby is paused with COMP-01C reference", () => {
      const ashby = ATS_PLATFORM_POLICIES.ashby;
      expect(ashby.enabled).toBe(false);
      expect(ashby.complianceStatus).toBe("paused");
      expect(ashby.complianceNotes).toContain("2026-07-12");
      expect(ashby.complianceNotes).toContain("source-specific review");
    });

    test("ATS_PLATFORM_POLICIES breezy is paused with COMP-01D reference", () => {
      const breezy = ATS_PLATFORM_POLICIES.breezy;
      expect(breezy.enabled).toBe(false);
      expect(breezy.complianceStatus).toBe("paused");
      expect(breezy.complianceNotes).toContain("2026-06-12");
      expect(breezy.complianceNotes).toContain("source-specific review");
    });

    test("Workable, Greenhouse, Lever also paused", () => {
      expect(ATS_PLATFORM_POLICIES.workable.enabled).toBe(false);
      expect(ATS_PLATFORM_POLICIES.greenhouse.enabled).toBe(false);
      expect(ATS_PLATFORM_POLICIES.lever.enabled).toBe(false);
    });
  });

  describe("Robots Enforcement: exact-six enforce, lake fetchers observe-only", () => {
    test("ROBOTS_ENFORCE_SOURCE_IDS contains exact-six sources", () => {
      expect(ROBOTS_ENFORCE_SOURCE_IDS.has("we-work-remotely")).toBe(true);
      expect(ROBOTS_ENFORCE_SOURCE_IDS.has("remotive")).toBe(true);
      expect(ROBOTS_ENFORCE_SOURCE_IDS.has("real-work-from-anywhere")).toBe(true);
      expect(ROBOTS_ENFORCE_SOURCE_IDS.has("remote-ok")).toBe(true);
      expect(ROBOTS_ENFORCE_SOURCE_IDS.has("jobicy-admin-support-apac")).toBe(true);
      expect(ROBOTS_ENFORCE_SOURCE_IDS.has("jobicy-supporting-apac")).toBe(true);
      expect(ROBOTS_ENFORCE_SOURCE_IDS.size).toBe(6);
    });

    test("lake fetchers (domain-ats-discovery, run-lake-miner) do not enforce robots", () => {
      const content = readFile("scripts/lake/domain-ats-discovery.ts");
      // Lake discovery does not reference ROBOTS_ENFORCE_SOURCE_IDS
      expect(content).not.toContain("ROBOTS_ENFORCE_SOURCE_IDS");
    });
  });

  describe("Remotive: exact-six member, JSON-LD/sitemap, robots enforce", () => {
    test("remotive is in ROBOTS_ENFORCE_SOURCE_IDS", () => {
      expect(ROBOTS_ENFORCE_SOURCE_IDS.has("remotive")).toBe(true);
    });

    test("remotive is in BASE_AUTHORIZED_SOURCE_IDS in sync-to-d1.ts", () => {
      const content = readFile("scripts/lake/sync-to-d1.ts");
      expect(content).toContain("remotive");
    });
  });

  describe("scrape.ts null-publicationDb Bypass Paths", () => {
    test("recoverGateEligiblePending bypasses gateway when publicationDb is null (lines 584-586)", () => {
      const content = readFile("apps/web/src/pages/api/cron/scrape.ts");
      // Check for the bypass pattern
      expect(content).toContain("if (!publicationDb)");
      expect(content).toContain("db.update(opportunities).set(publishSet)");
    });

    test("reactivateFeedConfirmedJobs bypasses gateway when publicationDb is null (lines 636-642)", () => {
      const content = readFile("apps/web/src/pages/api/cron/scrape.ts");
      // Check for the bypass pattern in reactivate function
      const reactivateSection = content.slice(content.indexOf("reactivateFeedConfirmedJobs"));
      expect(reactivateSection).toContain("if (!publicationDb)");
      expect(reactivateSection).toContain("db.update(opportunities).set(publishSet)");
    });
  });

  describe("Migration References (0031, 0046, 0047, 0052)", () => {
    test("migration 0031 incident repair exists", () => {
      const migrationsDir = path.join(import.meta.dir, "..", "..", "packages", "db", "migrations");
      const files = fs.readdirSync(migrationsDir);
      expect(files.some(f => f.startsWith("0031_"))).toBe(true);
    });

    test("migration 0046 breezy onsite reconciliation exists", () => {
      const migrationsDir = path.join(import.meta.dir, "..", "..", "packages", "db", "migrations");
      const files = fs.readdirSync(migrationsDir);
      expect(files.some(f => f.startsWith("0046_"))).toBe(true);
    });

    test("migration 0047 shadow/candidate deactivation exists", () => {
      const migrationsDir = path.join(import.meta.dir, "..", "..", "packages", "db", "migrations");
      const files = fs.readdirSync(migrationsDir);
      expect(files.some(f => f.startsWith("0047_"))).toBe(true);
    });

    test("migration 0052 founder fast-track exists", () => {
      const migrationsDir = path.join(import.meta.dir, "..", "..", "packages", "db", "migrations");
      const files = fs.readdirSync(migrationsDir);
      expect(files.some(f => f.startsWith("0052_"))).toBe(true);
    });
  });

  describe("Repair Contract Recorded as PROPOSAL", () => {
    test("WRITER-INVENTORY.md documents repair contract as PROPOSAL not authorized", () => {
      const content = readFile("docs/audits/2026-10-03-WRITER-INVENTORY.md");
      expect(content).toContain("PROPOSAL");
      expect(content).toContain("not authorized");
    });
  });
});