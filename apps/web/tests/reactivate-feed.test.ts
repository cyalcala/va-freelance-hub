import { describe, expect, test } from "bun:test";
import { reactivateFeedConfirmedJobs } from "../src/pages/api/cron/scrape";
import { FakePublicationDatabase } from "./publication-db-fake";

const OBSERVED = "2026-09-06T12:00:00.000Z";

function fakeDb(rows: Array<{ id: number; sourceId: string | null }>, changes = rows.length, fail = false) {
  const captured: { sets: any[]; selected: boolean; whereClauses: any[] } = { sets: [], selected: false, whereClauses: [] };
  const db: any = {
    select() {
      captured.selected = true;
      const builder: any = {
        from: () => builder,
        where: (c: any) => {
          captured.whereClauses.push(c);
          return Promise.resolve(rows);
        },
      };
      return builder;
    },
    update() {
      return {
        set: (vals: any) => {
          captured.sets.push(vals);
          return {
            where: (c: any) => {
              captured.whereClauses.push(c);
              return fail
                ? Promise.reject(new Error("D1 write rejected"))
                : Promise.resolve({ meta: { changes } });
            },
          };
        },
      };
    },
  };
  return { db, captured };
}

describe("reactivateFeedConfirmedJobs", () => {
  test("without a publication db, bulk-reactivates feed-confirmed stale/link rows", async () => {
    const { db, captured } = fakeDb([{ id: 1, sourceId: "we-work-remotely" }], 2);
    const n = await reactivateFeedConfirmedJobs(db, ["https://example.com/a", "https://example.com/b"], OBSERVED);
    expect(n).toBe(2);
    expect(captured.selected).toBe(false);
    expect(captured.sets[0].isActive).toBe(true);
    expect(captured.sets[0].inactiveReason).toBe(null);
    expect(captured.sets[0].failedVerificationCount).toBe(0);
  });

  test("with a publication db, reserves exposure before flipping rows active", async () => {
    const { db, captured } = fakeDb(
      [{ id: 11, sourceId: "we-work-remotely" }, { id: 12, sourceId: null }],
      1,
    );
    const publicationDb = new FakePublicationDatabase();
    const n = await reactivateFeedConfirmedJobs(
      db,
      ["https://example.com/a", "https://example.com/b"],
      OBSERVED,
      publicationDb,
    );
    expect(n).toBe(2);
    expect(captured.selected).toBe(true);
    expect(captured.sets.length).toBe(2);
    expect(publicationDb.runs.some((run) => run.query.includes("INSERT INTO source_publication_ledger"))).toBe(true);
  });

  test("blocked publication leaves archived rows inactive", async () => {
    const { db, captured } = fakeDb([{ id: 11, sourceId: "greenhouse:test" }]);
    const publicationDb = new FakePublicationDatabase({
      registry: [
        {
          sourceId: "greenhouse:test",
          compliance: "allowed",
          operational: "shadow",
          optOut: 0,
          policyExpiry: null,
          canaryMaxNewItemsPerTick: null,
        },
        {
          sourceId: "greenhouse:test",
          compliance: "allowed",
          operational: "shadow",
          optOut: 0,
          policyExpiry: null,
          canaryMaxNewItemsPerTick: null,
        },
      ],
      optOut: [null],
    });
    const n = await reactivateFeedConfirmedJobs(db, ["https://example.com/a"], OBSERVED, publicationDb);
    expect(n).toBe(0);
    expect(captured.sets.length).toBe(0);
  });

  test("fail-soft: a rejected write returns 0 and never throws", async () => {
    const { db } = fakeDb([{ id: 1, sourceId: "we-work-remotely" }], 0, true);
    const n = await reactivateFeedConfirmedJobs(db, ["https://example.com/a"], OBSERVED);
    expect(n).toBe(0);
  });

  // Characterization of the 2026-10-04 supply-freeze mechanism: 51 of 51 scrape
  // ticks fetched unchanged feed payloads (we-work-remotely 89-90 items,
  // remotive exactly 18, real-work-from-anywhere 50, remote-ok 42) while D1
  // stored zero new rows, because every fetched URL was already present. The
  // only writer that path still touches is reactivation. These two assertions
  // lock the two properties that keep a re-seen row from being counted as fresh
  // supply: reactivation must not write a storage/posting date, and it must
  // never cover a policy/quality rejection reason.
  test("reactivation never writes a storage or posting date (no rediscovery freshness reset)", async () => {
    const { db, captured } = fakeDb([{ id: 1, sourceId: "we-work-remotely" }], 1);
    await reactivateFeedConfirmedJobs(db, ["https://example.com/a"], OBSERVED);
    const set = captured.sets[0] as Record<string, unknown>;
    // A re-seen URL may only refresh liveness and the modification stamp.
    expect(set.lastSeenInFeedAt).toBe(OBSERVED);
    expect(set.updatedAt).toBe(OBSERVED);
    const forbidden = [
      "scrapedAt",
      "postedAt",
      "firstSeenAt",
      "publishedAt",
      "firstPublishedAt",
      "lastPublishedAt",
      "createdAt",
    ];
    for (const column of forbidden) {
      expect(set).not.toHaveProperty(column);
    }
    const writtenColumns = Object.keys(set).sort();
    expect(writtenColumns).toEqual(
      ["failedVerificationCount", "inactiveReason", "isActive", "lastSeenInFeedAt", "updatedAt"],
    );
  });

  test("reactivation covers only stale-feed/link-unavailable, never a policy rejection", async () => {
    const { SQLiteSyncDialect } = await import("drizzle-orm/sqlite-core");
    const { db, captured } = fakeDb([{ id: 1, sourceId: "we-work-remotely" }], 1);
    await reactivateFeedConfirmedJobs(db, ["https://example.com/a"], OBSERVED);
    expect(captured.whereClauses.length).toBeGreaterThan(0);
    const query = new SQLiteSyncDialect().sqlToQuery(captured.whereClauses[0]);
    expect(query.sql).toContain('"inactive_reason" in (?, ?)');
    expect(query.params).toContain("stale-feed");
    expect(query.params).toContain("link-unavailable");
    for (const policyReason of ["policy-rejected", "ineligible", "scam", "duplicate"]) {
      expect(query.params).not.toContain(policyReason);
    }
  });

  test("enforces phEligibility in reactivation predicate", async () => {
    const { SQLiteSyncDialect } = await import("drizzle-orm/sqlite-core");
    const { db, captured } = fakeDb([{ id: 1, sourceId: "we-work-remotely" }], 1);
    await reactivateFeedConfirmedJobs(db, ["https://example.com/a"], OBSERVED);
    expect(captured.whereClauses.length).toBeGreaterThan(0);
    const query = new SQLiteSyncDialect().sqlToQuery(captured.whereClauses[0]);
    expect(query.sql).toContain('"ph_eligibility" in (?, ?)');
    expect(query.params).toContain("eligible_verified");
    expect(query.params).toContain("eligible_likely");
  });
});

