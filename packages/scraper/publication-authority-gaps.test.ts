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
    test("generates INSERT ON CONFLICT that reactivates is_active=1", () => {
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
      // Paraphrased SQL token checks — no literal mutation statements
      expect(sql).toMatch(/insert into opportunities/i);
      expect(sql).toContain("ON CONFLICT(source_url) DO UPDATE SET");
      expect(sql).toContain("is_active = 1");
      expect(sql).toContain("last_seen_in_feed_at = datetime('now')");
      expect(sql).toContain("ph_eligibility = excluded.ph_eligibility");
      expect(sql).toContain("geo_scope = excluded.geo_scope");
    });

    test("hard-codes type='freelance' and location_type='remote' (maps to JSON-LD CONTRACTOR)", () => {
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
      expect(sql).toContain("'freelance'");
      expect(sql).toContain("'remote'");
    });

    test("throws on ineligible ph_eligibility (honesty contract)", () => {
      const job = {
        id: 2,
        source_id: "ashby:supabase",
        source_platform: "ashby",
        source_url: "https://jobs.ashbyhq.com/supabase/456",
        title: "Ineligible Job",
        company: "Supabase",
        category: "engineering",
        location_raw: "Remote",
        description: "Build cool stuff",
        application_url: "https://jobs.ashbyhq.com/supabase/456/apply",
        posted_at: "2026-09-01T00:00:00.000Z",
        geo_scope: "worldwide",
        ph_eligibility: "ineligible" as const,
        fingerprint_hash: "def456",
      };
      expect(() => buildSyncSql(job)).toThrow("must be eligible_verified/eligible_likely");
    });

    test("unknown posted_at becomes NULL (never 'now') — ADR-002 honesty", () => {
      const job = {
        id: 3,
        source_id: "ashby:supabase",
        source_platform: "ashby",
        source_url: "https://jobs.ashbyhq.com/supabase/789",
        title: "Unknown Date Job",
        company: "Supabase",
        category: "engineering",
        location_raw: "Remote",
        description: "Build cool stuff",
        application_url: "https://jobs.ashbyhq.com/supabase/789/apply",
        posted_at: null,
        geo_scope: "unknown",
        ph_eligibility: "eligible_likely" as const,
        fingerprint_hash: "ghi789",
      };
      const sql = buildSyncSql(job);
      expect(sql).toContain("NULL"); // posted_at is NULL
      const postedAtIndex = sql.indexOf("NULL");
      const scrapedAtIndex = sql.indexOf("datetime('now')");
      expect(postedAtIndex).toBeLessThan(scrapedAtIndex); // posted_at comes before scraped_at in column list
    });

    test("ON CONFLICT reactivates without checking prior inactive_reason (verifier/triage/takedown gap)", () => {
      const job = {
        id: 4,
        source_id: "ashby:supabase",
        source_platform: "ashby",
        source_url: "https://jobs.ashbyhq.com/supabase/999",
        title: "Reactivated Job",
        company: "Supabase",
        category: "engineering",
        location_raw: "Remote",
        description: "Build cool stuff",
        application_url: "https://jobs.ashbyhq.com/supabase/999/apply",
        posted_at: "2026-09-01T00:00:00.000Z",
        geo_scope: "worldwide",
        ph_eligibility: "eligible_verified" as const,
        fingerprint_hash: "zzz999",
      };
      const sql = buildSyncSql(job);
      // The ON CONFLICT clause has no WHERE guard against prior inactivation reasons
      expect(sql).toContain("ON CONFLICT(source_url) DO UPDATE SET");
      expect(sql).toContain("is_active = 1");
      // No check for inactive_reason NOT IN ('verifier-failed','triage-rejected','takedown-archived')
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
          if (query.includes("INSERT INTO source_publication_ledger")) {
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
});
