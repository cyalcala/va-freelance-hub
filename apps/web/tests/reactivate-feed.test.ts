import { describe, expect, test } from "bun:test";
import { reactivateFeedConfirmedJobs } from "../src/pages/api/cron/scrape";
import { FakePublicationDatabase } from "./publication-db-fake";

const OBSERVED = "2026-09-06T12:00:00.000Z";

function fakeDb(rows: Array<{ id: number; sourceId: string | null }>, changes = rows.length, fail = false) {
  const captured: { sets: any[]; selected: boolean } = { sets: [], selected: false };
  const db: any = {
    select() {
      captured.selected = true;
      const builder: any = {
        from: () => builder,
        where: () => Promise.resolve(rows),
      };
      return builder;
    },
    update() {
      return {
        set: (vals: any) => {
          captured.sets.push(vals);
          return {
            where: () => fail
              ? Promise.reject(new Error("D1 write rejected"))
              : Promise.resolve({ meta: { changes } }),
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
      registry: [{
        sourceId: "greenhouse:test",
        compliance: "allowed",
        operational: "shadow",
        optOut: 0,
        policyExpiry: null,
        canaryMaxNewItemsPerTick: null,
      }],
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
});
