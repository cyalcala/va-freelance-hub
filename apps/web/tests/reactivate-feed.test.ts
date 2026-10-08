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
              return { returning: async () => {
                if (fail) throw new Error("D1 write rejected");
                return Array.from({ length: changes }, (_, index) => ({ id: rows[index]?.id ?? index + 1 }));
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
  test("without a publication db, bulk-reactivates feed-confirmed stale/link rows", async () => {
    const { db, captured } = fakeDb([{ id: 1, sourceId: "we-work-remotely" }], 2);
    const n = await reactivateFeedConfirmedJobs(db, ["https://example.com/a", "https://example.com/b"], OBSERVED);
    expect(n).toBe(2);
    expect(captured.selected).toBe(false);
    expect(captured.sets[0].isActive).toBe(true);
    expect(captured.sets[0].inactiveReason).toBe(null);
    expect(captured.sets[0].failedVerificationCount).toBe(0);
  });

  test("with a publication db, reactivates attributed rows and holds missing source identities", async () => {
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
    expect(n).toBe(1);
    expect(captured.selected).toBe(true);
    expect(captured.sets.length).toBe(1);
    expect(captured.sets[0].isActive).toBe(true);
    const { SQLiteSyncDialect } = await import("drizzle-orm/sqlite-core");
    expect(captured.whereClauses).toHaveLength(2);
    const params = new SQLiteSyncDialect().sqlToQuery(captured.whereClauses[1]).params;
    expect(params).toContain(11);
    expect(params).toContain("eligible_verified");
    expect(params).toContain("eligible_likely");
    expect(publicationDb.runs.filter(run => run.query.includes("INSERT INTO source_publication_ledger"))
      .map(run => [run.values[0], run.values[3], run.values[5], run.values[6]]))
      .toEqual([["we-work-remotely", "unlimited", 1, "[11]"], ["unattributed", "blocked", 0, "[]"]]);
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

  test("a thrown update acknowledgement reports UNKNOWN instead of known zero", async () => {
    const { db } = fakeDb([{ id: 1, sourceId: "we-work-remotely" }], 0, true);
    await expect(reactivateFeedConfirmedJobs(db, ["https://example.com/a"], OBSERVED))
      .rejects.toMatchObject({ publicationOutcome: "UNKNOWN" });
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

