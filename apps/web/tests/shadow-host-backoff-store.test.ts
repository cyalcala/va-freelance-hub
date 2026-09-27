import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { createShadowHostBackoffStore } from "../src/lib/shadow-host-backoff-store";

describe("host cooldown D1 SQL contract", () => {
  test("migration and production upsert preserve the longest hold under reordered writes", async () => {
    const sqlite = new Database(":memory:");
    try {
      sqlite.exec(readFileSync(new URL("../../../packages/db/migrations/0051_shadow_host_backoff.sql", import.meta.url), "utf8"));
      const localDb = drizzle(sqlite);
      const store = createShadowHostBackoffStore({
        select: () => localDb.select(),
        insert: (table: any) => ({ values: (record: any) => ({ onConflictDoUpdate: (options: any) => {
          const query = localDb.insert(table).values(record).onConflictDoUpdate(options).toSQL();
          sqlite.query(query.sql).run(...query.params as any[]);
          return { success: true };
        } }) }),
      });
      const initial = { host: "apply.workable.com", sourceId: "workable:one", limitedAt: "2026-09-27T12:00:00.000Z", nextEligibleAt: "2026-09-28T12:00:00.000Z", reason: "default_cadence" as const };
      await store.put(initial);
      const extended = { ...initial, sourceId: "workable:two", nextEligibleAt: "2026-09-29T12:00:00.000Z", reason: "retry_after" as const };
      await store.put(extended);
      await store.put(initial);
      expect(await store.get(initial.host)).toEqual(extended);
      expect(await store.get("unrelated.example.com")).toBeNull();
      expect(() => sqlite.exec("UPDATE source_shadow_host_backoff SET next_eligible_at = 'not-a-date'")).toThrow();
      expect(() => sqlite.exec("UPDATE source_shadow_host_backoff SET next_eligible_at = '2026-09-26T12:00:00.000Z'")).toThrow();
    } finally { sqlite.close(); }
  });
});
