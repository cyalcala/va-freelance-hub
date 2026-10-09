import { describe, expect, test } from "bun:test";
import { reactivateFeedConfirmedJobs } from "../src/pages/api/cron/scrape";
import { FakePublicationDatabase } from "./publication-db-fake";
import { getDb, opportunities } from "@va-hub/db";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";

const OBSERVED = "2026-09-06T12:00:00.000Z";

function fakeDb(rows: Array<{ id: number; sourceId: string | null; sourceUrl: string }>, changes = rows.length, fail = false) {
  const captured: { sets: any[]; selected: boolean; whereClauses: any[] } = { sets: [], selected: false, whereClauses: [] };
  // Use the production Drizzle builder for query introspection; only actual
  // execution is replaced. Empty toSQL probes must not fabricate writes.
  const queryDb = getDb({ DB: { prepare() { throw new Error("fixture cannot execute its query introspection binding"); } } as any });
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
          return {
            where: (c: any) => {
              return { returning: () => {
                const query = queryDb.update(opportunities).set(vals).where(c).returning({ id: opportunities.id });
                return {
                  toSQL: () => query.toSQL(),
                  then: (resolve: any, reject: any) => Promise.resolve().then(() => {
                    captured.sets.push(vals);
                    captured.whereClauses.push(c);
                    if (fail) throw new Error("D1 write rejected");
                    const params = new SQLiteSyncDialect().sqlToQuery(c).params;
                    return rows.filter(row => params.includes(row.id)).slice(0, changes).map(row => ({ id: row.id }));
                  }).then(resolve, reject),
                };
              } };
            },
          };
        },
      };
    },
  };
  return { db, captured };
}

describe("reactivateFeedConfirmedJobs", () => {
  test("without a publication db, snapshots and reactivates feed-confirmed stale/link rows", async () => {
    const { db, captured } = fakeDb([{ id: 1, sourceId: "we-work-remotely", sourceUrl: "https://example.com/a" },
      { id: 2, sourceId: "we-work-remotely", sourceUrl: "https://example.com/b" }]);
    const n = await reactivateFeedConfirmedJobs(db, ["https://example.com/a", "https://example.com/b"], OBSERVED);
    expect(n).toBe(2);
    expect(captured.selected).toBe(true);
    expect(captured.whereClauses).toHaveLength(2); // executed SELECT + UPDATE
    expect(captured.sets[0].isActive).toBe(true);
    expect(captured.sets[0].inactiveReason).toBe(null);
    expect(captured.sets[0].failedVerificationCount).toBe(0);
  });

  test("with a publication db, reactivates attributed rows and holds missing source identities", async () => {
    const { db, captured } = fakeDb(
      [{ id: 11, sourceId: "we-work-remotely", sourceUrl: "https://example.com/a" },
        { id: 12, sourceId: null, sourceUrl: "https://example.com/b" }],
      1,
    );
    const publicationDb = new FakePublicationDatabase({ ownership: [{ ownedCount: 1 }] });
    const n = await reactivateFeedConfirmedJobs(
      db,
      ["https://example.com/a", "https://example.com/b"],
      OBSERVED,
      publicationDb,
    );
    expect(n).toBe(1);
    expect(captured.selected).toBe(true);
    expect(captured.sets.length).toBe(1);
    expect(captured.sets[0].isActive).toBe(true);
    const { SQLiteSyncDialect } = await import("drizzle-orm/sqlite-core");
    expect(captured.whereClauses).toHaveLength(2);
    const params = new SQLiteSyncDialect().sqlToQuery(captured.whereClauses[1]).params;
    expect(params).toContain(11);
    expect(params).toContain("we-work-remotely");
    expect(params).toContain("https://example.com/a");
    expect(params).toContain("eligible_verified");
    expect(params).toContain("eligible_likely");
    expect(publicationDb.runs.filter(run => run.query.includes("INSERT INTO source_publication_ledger"))
      .map(run => [run.values[0], run.values[3], run.values[5], run.values[6]]))
      .toEqual([["we-work-remotely", "unlimited", 1, "[11]"], ["unattributed", "blocked", 0, "[]"]]);
  });

  test("blocked publication leaves archived rows inactive", async () => {
    const { db, captured } = fakeDb([{ id: 11, sourceId: "greenhouse:test", sourceUrl: "https://example.com/a" }]);
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

  test("a thrown update acknowledgement reports UNKNOWN instead of known zero", async () => {
    const { db } = fakeDb([{ id: 1, sourceId: "we-work-remotely", sourceUrl: "https://example.com/a" }], 0, true);
    await expect(reactivateFeedConfirmedJobs(db, ["https://example.com/a"], OBSERVED))
      .rejects.toMatchObject({ publicationOutcome: "UNKNOWN" });
  });

  test("enforces phEligibility in reactivation predicate", async () => {
    const { SQLiteSyncDialect } = await import("drizzle-orm/sqlite-core");
    const { db, captured } = fakeDb([{ id: 1, sourceId: "we-work-remotely", sourceUrl: "https://example.com/a" }], 1);
    await reactivateFeedConfirmedJobs(db, ["https://example.com/a"], OBSERVED);
    expect(captured.whereClauses.length).toBeGreaterThan(0);
    const query = new SQLiteSyncDialect().sqlToQuery(captured.whereClauses[0]);
    expect(query.sql).toContain('"ph_eligibility" in (?, ?)');
    expect(query.params).toContain("eligible_verified");
    expect(query.params).toContain("eligible_likely");
    const updateQuery = new SQLiteSyncDialect().sqlToQuery(captured.whereClauses[1]);
    expect(updateQuery.sql).toContain('"ph_eligibility" in (?, ?)');
    expect(updateQuery.params).toContain("eligible_verified");
    expect(updateQuery.params).toContain("eligible_likely");
  });
});

