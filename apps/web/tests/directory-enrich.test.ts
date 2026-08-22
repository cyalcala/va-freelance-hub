import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import {
  buildAtsCareerUrl,
  buildEnrichmentTargetSql,
  enrichDirectory,
  type EnrichmentTarget,
} from "../src/lib/directory-enrich";

describe("buildAtsCareerUrl", () => {
  test("maps each known ATS platform to its career board URL", () => {
    expect(buildAtsCareerUrl("greenhouse", "gitlab")).toBe("https://boards.greenhouse.io/gitlab");
    expect(buildAtsCareerUrl("lever", "vaultoutsourcing")).toBe("https://jobs.lever.co/vaultoutsourcing");
    expect(buildAtsCareerUrl("ashby", "supabase")).toBe("https://jobs.ashbyhq.com/supabase");
    expect(buildAtsCareerUrl("breezy", "20four7va")).toBe("https://20four7va.breezy.hr");
    expect(buildAtsCareerUrl("workable", "rocketams")).toBe("https://apply.workable.com/rocketams");
  });

  test("returns null for an unknown platform", () => {
    expect(buildAtsCareerUrl("greenhouse-io", "gitlab")).toBeNull();
  });

  test("returns null when platform or token is missing", () => {
    expect(buildAtsCareerUrl(null, "gitlab")).toBeNull();
    expect(buildAtsCareerUrl("greenhouse", null)).toBeNull();
    expect(buildAtsCareerUrl(null, null)).toBeNull();
  });
});

/**
 * Minimal drizzle-shaped fake supporting exactly the chains enrichDirectory uses:
 *   all(sql)                -> target list (first call), then queued per-target reads
 *   update().set().where()  -> recorded
 *
 * enrichDirectory selects its targets via `db.all(buildEnrichmentTargetSql())`
 * (raw SQL) and then issues per-target `db.all(...)` reads. The fake serves the
 * `targets` array on the first all() call, then drains `allResults` in call
 * order for the per-target reads. Queue an Error instance to make the next
 * per-target `db.all` reject (used to prove the P1-2 wedge guard).
 */
function makeFakeDb(targets: EnrichmentTarget[], allResults: Array<unknown[] | Error>) {
  const allQueue = [...allResults];
  const updates: Array<Record<string, unknown>> = [];
  let targetsServed = false;

  const db: any = {
    all() {
      if (!targetsServed) {
        targetsServed = true;
        return Promise.resolve(targets);
      }
      const next = allQueue.shift();
      if (next instanceof Error) return Promise.reject(next);
      return Promise.resolve(next ?? []);
    },
    update() {
      return {
        set: (vals: Record<string, unknown>) => ({
          where: () => {
            updates.push(vals);
            return Promise.resolve();
          },
        }),
      };
    },
  };
  return { db, updates };
}

/** In-memory va_directory seeded with just the columns the selection reads. */
function seedDirectory(
  rows: Array<{
    id: number;
    website?: string | null;
    hiring_page_url?: string | null;
    ats_platform?: string | null;
    ats_token?: string | null;
    is_verified?: number;
    hires_filipinos?: number;
  }>,
): Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE va_directory (
      id INTEGER PRIMARY KEY,
      company_name TEXT NOT NULL,
      website TEXT,
      hiring_page_url TEXT,
      ats_platform TEXT,
      ats_token TEXT,
      is_verified INTEGER NOT NULL DEFAULT 0,
      hires_filipinos INTEGER NOT NULL DEFAULT 1
    );
  `);
  const stmt = db.prepare(
    `INSERT INTO va_directory
       (id, company_name, website, hiring_page_url, ats_platform, ats_token, is_verified, hires_filipinos)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const r of rows) {
    stmt.run(
      r.id,
      `Co${r.id}`,
      r.website ?? null,
      r.hiring_page_url ?? null,
      r.ats_platform ?? null,
      r.ats_token ?? null,
      r.is_verified ?? 0,
      r.hires_filipinos ?? 1,
    );
  }
  return db;
}

describe("buildEnrichmentTargetSql", () => {
  test("F1 regression: rotates targets so no candidate is starved (was ORDER BY id ASC LIMIT)", () => {
    // Four candidate rows (all missing a website → all match the predicate),
    // budget of 3. Under the old `ORDER BY id ASC LIMIT 3` the highest-id row
    // could never be selected — it sat behind the same three low-id rows on
    // every run, which is exactly how the enrichment budget stalled on the
    // lowest-id un-enrichable prospector rows. Prove that starvation for the old
    // ordering, then prove the new ordering reaches every row across runs.
    const db = seedDirectory([
      { id: 1, website: null, is_verified: 0 },
      { id: 2, website: null, is_verified: 0 },
      { id: 3, website: null, is_verified: 0 },
      { id: 4, website: null, is_verified: 0 },
    ]);
    try {
      const oldOrder = db
        .query("SELECT id FROM va_directory WHERE website IS NULL ORDER BY id ASC LIMIT 3")
        .all() as Array<{ id: number }>;
      expect(oldOrder.map((r) => r.id)).toEqual([1, 2, 3]); // id 4 permanently starved

      const seen = new Set<number>();
      for (let run = 0; run < 25; run++) {
        for (const row of db.query(buildEnrichmentTargetSql(3)).all() as Array<{ id: number }>) {
          seen.add(row.id);
        }
      }
      expect(seen.has(4)).toBe(true); // rotation reaches the previously-starved row
      expect(seen.size).toBe(4); // every candidate is reachable
    } finally {
      db.close();
    }
  });

  test("hiring-page gap is ATS-scoped: selects an ATS row missing it, skips a non-ATS row that can never get one", () => {
    const db = seedDirectory([
      // ATS row: has website + verified; its only gap is a hiring page it CAN get.
      { id: 1, website: "https://a.com", hiring_page_url: null, ats_platform: "greenhouse", ats_token: "a", is_verified: 1, hires_filipinos: 1 },
      // Non-ATS row: has website + verified; its only gap is a hiring page it can
      // NEVER get. The old `hiring_page_url IS NULL` clause kept it in the budget
      // forever; the ATS-scoped clause excludes it.
      { id: 2, website: "https://b.com", hiring_page_url: null, ats_platform: null, ats_token: null, is_verified: 1, hires_filipinos: 1 },
    ]);
    try {
      const ids = (db.query(buildEnrichmentTargetSql(40)).all() as Array<{ id: number }>).map((r) => r.id);
      expect(ids).toContain(1);
      expect(ids).not.toContain(2);
    } finally {
      db.close();
    }
  });

  test("missing website alone is not actionable; verification candidates still are", () => {
    const db = seedDirectory([
      { id: 1, website: null, is_verified: 1 }, // website-only gap: intentionally skipped
      { id: 2, website: "https://c.com", is_verified: 0, hires_filipinos: 1 }, // needs verification
      { id: 3, website: "   ", is_verified: 1 }, // blank website-only gap: skipped
      // Complete non-ATS row: website + verified + hiring page set → excluded.
      { id: 4, website: "https://d.com", hiring_page_url: "https://d.com/jobs", is_verified: 1, hires_filipinos: 1 },
    ]);
    try {
      const ids = (db.query(buildEnrichmentTargetSql(40)).all() as Array<{ id: number }>)
        .map((r) => r.id)
        .sort((a, b) => a - b);
      expect(ids).toEqual([2]);
    } finally {
      db.close();
    }
  });

  test("returns EnrichmentTarget-shaped rows (camelCase aliases the enrich loop consumes)", () => {
    const db = seedDirectory([
      { id: 7, website: null, ats_platform: "lever", ats_token: "acme", is_verified: 0, hires_filipinos: 1 },
    ]);
    try {
      const [row] = db.query(buildEnrichmentTargetSql(40)).all() as Array<Record<string, unknown>>;
      expect(row).toMatchObject({
        id: 7,
        companyName: "Co7",
        website: null,
        hiringPageUrl: null,
        atsPlatform: "lever",
        atsToken: "acme",
        isVerified: 0,
      });
    } finally {
      db.close();
    }
  });

  test("clamps the budget into [1,100] so an unvalidated caller cannot build an unsafe LIMIT", () => {
    expect(buildEnrichmentTargetSql(0)).toContain("LIMIT 1");
    expect(buildEnrichmentTargetSql(40)).toContain("LIMIT 40");
    expect(buildEnrichmentTargetSql(9999)).toContain("LIMIT 100");
    expect(buildEnrichmentTargetSql(Number.NaN)).toContain("LIMIT 1");
    // Not a whole number → floored, never interpolated verbatim.
    expect(buildEnrichmentTargetSql(3.9)).toContain("LIMIT 3");
  });
});

describe("enrichDirectory", () => {
  test("never writes a company website from opportunity URLs", async () => {
    const target: EnrichmentTarget = {
      id: 1,
      companyName: "Co",
      website: null,
      hiringPageUrl: "https://existing.careers.com",
      atsPlatform: "greenhouse",
      atsToken: "co",
      isVerified: true,
    };
    const { db, updates } = makeFakeDb([target], []);

    const result = await enrichDirectory(db, 40);

    expect(result.hiringPageSet).toBe(0);
    expect(result.websiteSet).toBe(0);
    expect(result.enriched).toBe(0);
    expect(updates.length).toBe(0);
  });

  test("sets hiringPageUrl from the ATS token when it is missing", async () => {
    const target: EnrichmentTarget = {
      id: 2,
      companyName: "Co2",
      website: "https://co2.com",
      hiringPageUrl: null,
      atsPlatform: "greenhouse",
      atsToken: "co2",
      isVerified: true,
    };
    // No db.all calls expected: needsWebsite=false, needsVerification=false.
    const { db, updates } = makeFakeDb([target], []);

    const result = await enrichDirectory(db, 40);

    expect(result.hiringPageSet).toBe(1);
    expect(result.enriched).toBe(1);
    expect(updates[0].hiringPageUrl).toBe("https://boards.greenhouse.io/co2");
  });

  test("auto-verifies a company with >=1 verified and >=2 PH-eligible active jobs", async () => {
    const target: EnrichmentTarget = {
      id: 4,
      companyName: "Co4",
      website: "https://co4.com",
      hiringPageUrl: "https://h.com",
      atsPlatform: null,
      atsToken: null,
      isVerified: false,
    };
    const { db, updates } = makeFakeDb([target], [
      [{ verified_jobs: 2, total_ph_jobs: 5 }],
    ]);

    const result = await enrichDirectory(db, 40);

    expect(result.verified).toBe(1);
    expect(updates[0].isVerified).toBe(true);
    expect(updates[0].verifiedAt).toBeTruthy();
  });

  test("does not auto-verify when the PH-eligible job count is below the threshold", async () => {
    const target: EnrichmentTarget = {
      id: 5,
      companyName: "Co5",
      website: "https://co5.com",
      hiringPageUrl: "https://h.com",
      atsPlatform: null,
      atsToken: null,
      isVerified: false,
    };
    const { db, updates } = makeFakeDb([target], [
      [{ verified_jobs: 1, total_ph_jobs: 1 }],
    ]);

    const result = await enrichDirectory(db, 40);

    expect(result.verified).toBe(0);
    expect(result.enriched).toBe(0);
    expect(updates.length).toBe(0);
  });

  test("produces no update when the company already has everything", async () => {
    const target: EnrichmentTarget = {
      id: 6,
      companyName: "Co6",
      website: "https://co6.com",
      hiringPageUrl: "https://h.com",
      atsPlatform: null,
      atsToken: null,
      isVerified: true,
    };
    const { db, updates } = makeFakeDb([target], []);

    const result = await enrichDirectory(db, 40);

    expect(result.enriched).toBe(0);
    expect(updates.length).toBe(0);
  });

  test("P1-2 regression: a throwing target does not abort the rest of the run", async () => {
    // First target's db.all rejects (transient D1 error / poison row). The old
    // code would have aborted the whole run; the fixed code records the error
    // and continues to the next target.
    const targetA: EnrichmentTarget = {
      id: 10,
      companyName: "PoisonCo",
      website: null,
      hiringPageUrl: "https://h.com",
      atsPlatform: null,
      atsToken: null,
      isVerified: false,
    };
    const targetB: EnrichmentTarget = {
      id: 11,
      companyName: "GoodCo",
      website: null,
      hiringPageUrl: "https://h2.com",
      atsPlatform: null,
      atsToken: null,
      isVerified: false,
    };
    const { db, updates } = makeFakeDb([targetA, targetB], [
      new Error("D1 read rejected"),
      [{ verified_jobs: 1, total_ph_jobs: 2 }],
    ]);

    const result = await enrichDirectory(db, 40);

    expect(result.errors).toBe(1);
    expect(result.enriched).toBe(1);
    expect(result.websiteSet).toBe(0);
    expect(updates.length).toBe(1);
    expect(updates[0].website).toBeUndefined();
    expect(result.details.some((d) => d.id === 10 && d.action.startsWith("error:"))).toBe(true);
    expect(result.details.some((d) => d.id === 11 && d.action.startsWith("auto-verified"))).toBe(true);
  });
});
