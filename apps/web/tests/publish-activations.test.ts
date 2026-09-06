import { describe, expect, test } from "bun:test";
import { publishGroupedActivations } from "../src/lib/publish-opportunities";
import { FakePublicationDatabase } from "./publication-db-fake";

const NOW = "2026-09-06T12:00:00.000Z";

describe("publishGroupedActivations", () => {
  test("reserves unlimited exact-six exposure grouped by source identity", async () => {
    const db = new FakePublicationDatabase();
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
      async (ids) => {
        persisted.push(ids);
        return { publishedCount: ids.length, ids };
      },
    );
    expect(result).toEqual({ published: 3, failed: false });
    expect(persisted).toEqual([[1, 2], [9]]);
    expect(db.runs.filter((run) => run.query.includes("INSERT INTO source_publication_ledger"))).toHaveLength(2);
  });

  test("does not persist when the gateway blocks the source", async () => {
    const db = new FakePublicationDatabase({
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
    let persisted = 0;
    const result = await publishGroupedActivations(
      db,
      [{ id: 4, sourceId: "greenhouse:test" }],
      NOW,
      "scrape-reactivate",
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
    const result = await publishGroupedActivations(db, [], NOW, "scrape-gate", async () => {
      throw new Error("persist must not run");
    });
    expect(result).toEqual({ published: 0, failed: false });
    expect(db.runs).toHaveLength(0);
  });
});
