import { describe, expect, test } from "bun:test";
import { publishGroupedActivations } from "../src/lib/publish-opportunities";
import { FakePublicationDatabase } from "./publication-db-fake";

const NOW = "2026-09-06T12:00:00.000Z";

const CANARY_ROW = {
  sourceId: "breezy:test",
  compliance: "allowed",
  operational: "canary",
  optOut: 0,
  policyExpiry: "2026-10-01T00:00:00.000Z",
  canaryMaxNewItemsPerTick: 2,
};

describe("publishGroupedActivations", () => {
  test("persistence receives the immutable authorized source despite caller mutation during policy lookup", async () => {
    const target = { id: 1, sourceId: "remotive" };
    const db = new FakePublicationDatabase({ ownership: [{ ownedCount: 1, postingRows: JSON.stringify([{ id: 1, postedAt: NOW }]) }] });
    const prepare = db.prepare.bind(db);
    db.prepare = query => {
      if (query.includes("FROM source_registry")) target.sourceId = "remote-ok";
      return prepare(query);
    };
    const sources: string[] = [];
    const result = await publishGroupedActivations(db, [target], NOW, "scrape-gate", { isActive: true },
      async (ids, _patch, sourceId) => { sources.push(sourceId); return { publishedCount: ids.length, ids }; });
    expect(result).toEqual({ published: 1, failed: false });
    expect(target.sourceId).toBe("remote-ok");
    expect(sources).toEqual(["remotive"]);
    expect(db.runs.find(run => run.query.includes("INSERT INTO source_publication_ledger"))?.values[0]).toBe("remotive");
  });
  test("duplicate exact targets become one publication target before count and persistence", async () => {
    const db = new FakePublicationDatabase({ ownership: [{ ownedCount: 1, postingRows: JSON.stringify([{ id: 1, postedAt: NOW }]) }] });
    const selected: number[][] = [];
    const result = await publishGroupedActivations(db, [{ id: 1, sourceId: "remotive" }, { id: 1, sourceId: "remotive" }],
      NOW, "scrape-gate", { isActive: true }, async ids => { selected.push(ids); return { publishedCount: ids.length, ids }; });
    expect(result).toEqual({ published: 1, failed: false });
    expect(selected).toEqual([[1]]);
    expect(db.runs.find(run => run.query.includes("INSERT INTO source_publication_ledger"))?.values[4]).toBe(1);
  });

  test("invalid IDs and conflicting attribution reject before any target callback", async () => {
    for (const rows of [[{ id: 0, sourceId: "remotive" }], [{ id: Number.MAX_SAFE_INTEGER + 1, sourceId: "remotive" }],
      [{ id: 1, sourceId: "remotive" }, { id: 1, sourceId: "remote-ok" }]]) {
      const db = new FakePublicationDatabase();
      let calls = 0;
      await expect(publishGroupedActivations(db, rows, NOW, "scrape-gate", { isActive: true }, async ids => {
        calls++; return { publishedCount: ids.length, ids };
      })).rejects.toThrow("activation target");
      expect(calls).toBe(0);
      expect(db.runs).toHaveLength(0);
    }
  });

  test("same targets with changed patch or action receive distinct full identities", async () => {
    const keys: unknown[] = [];
    const patches: object[] = [];
    for (const [channel, patch] of [["scrape-gate", { isActive: true, inactiveReason: null, geoEvidence: "first" }],
      ["scrape-gate", { isActive: true, inactiveReason: null, geoEvidence: "changed" }],
      ["scrape-reactivate", { isActive: true, inactiveReason: null, geoEvidence: "first" }]] as const) {
      const db = new FakePublicationDatabase({ ownership: [{ ownedCount: 1, postingRows: JSON.stringify([{ id: 1, postedAt: NOW }]) }] });
      await publishGroupedActivations(db, [{ id: 1, sourceId: "remotive" }], NOW, channel, patch, async (ids, actualPatch) => {
        patches.push(actualPatch);
        return { publishedCount: ids.length, ids };
      });
      keys.push(db.runs.find(run => run.query.includes("INSERT INTO source_publication_ledger"))?.values[2]);
    }
    expect(new Set(keys).size).toBe(3);
    expect(patches).toEqual([{ isActive: true, inactiveReason: null, geoEvidence: "first" },
      { isActive: true, inactiveReason: null, geoEvidence: "changed" }, { isActive: true, inactiveReason: null, geoEvidence: "first" }]);
  });

  test("publishes attributed exact-six rows and holds rows without a source identity", async () => {
    const db = new FakePublicationDatabase({ ownership: [{ ownedCount: 2,
      postingRows: JSON.stringify([{ id: 1, postedAt: NOW }, { id: 2, postedAt: NOW }]) }] });
    const persisted: number[][] = [];
    const result = await publishGroupedActivations(
      db,
      [
        { id: 2, sourceId: "we-work-remotely" },
        { id: 1, sourceId: "we-work-remotely" },
        { id: 9, sourceId: null },
      ],
      NOW,
      "scrape-gate",
      { isActive: true, inactiveReason: null },
      async (ids) => {
        persisted.push(ids);
        return { publishedCount: ids.length, ids };
      },
    );
    expect(result).toEqual({ published: 2, failed: false });
    expect(persisted).toEqual([[1, 2]]);
    expect(persisted.flat()).not.toContain(9);
    expect(db.runs.filter(run => run.query.includes("INSERT INTO source_publication_ledger"))
      .map(run => [run.values[0], run.values[3], run.values[5], run.values[6]]))
      .toEqual([["we-work-remotely", "unlimited", 2, "[1,2]"], ["unattributed", "blocked", 0, "[]"]]);
  });

  test("does not persist when the gateway blocks the source", async () => {
    const db = new FakePublicationDatabase({
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
    let persisted = 0;
    const result = await publishGroupedActivations(
      db,
      [{ id: 4, sourceId: "greenhouse:test" }],
      NOW,
      "scrape-reactivate",
      { isActive: true, inactiveReason: null },
      async (ids) => {
        persisted += ids.length;
        return { publishedCount: ids.length, ids };
      },
    );
    expect(result).toEqual({ published: 0, failed: false });
    expect(persisted).toBe(0);
  });

  test("empty candidate list is a no-op and does not touch the ledger", async () => {
    const db = new FakePublicationDatabase();
    const result = await publishGroupedActivations(db, [], NOW, "scrape-gate", { isActive: true }, async () => {
      throw new Error("persist must not run");
    });
    expect(result).toEqual({ published: 0, failed: false });
    expect(db.runs).toHaveLength(0);
  });

  test("clamps canary activations to the per-tick cap so the gateway never rolls back", async () => {
    const db = new FakePublicationDatabase({ registry: [CANARY_ROW, CANARY_ROW], ownership: [{ ownedCount: 2,
      postingRows: JSON.stringify([{ id: 3, postedAt: NOW }, { id: 4, postedAt: NOW }]) }] });
    const persisted: number[][] = [];
    const result = await publishGroupedActivations(
      db,
      [
        { id: 5, sourceId: "breezy:test" },
        { id: 4, sourceId: "breezy:test" },
        { id: 3, sourceId: "breezy:test" },
      ],
      NOW,
      "scrape-gate",
      { isActive: true, inactiveReason: null },
      async (ids) => {
        persisted.push(ids);
        return { publishedCount: ids.length, ids };
      },
    );
    expect(result).toEqual({ published: 2, failed: false });
    expect(persisted).toEqual([[3, 4]]);
  });
});
