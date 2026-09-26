import { describe, expect, test } from "bun:test";
import { buildOpportunityFtsQueries } from "../src/lib/opportunity-fts-query";

const BASE = { ftsMatch: '"virtual" "assistant"', limit: 30, offset: 0 };

describe("buildOpportunityFtsQueries fresh filter", () => {
  test("default board has no recency predicate and unchanged binds", () => {
    const q = buildOpportunityFtsQueries(BASE);
    expect(q.pageSql).not.toContain("scraped_at) >=");
    expect(q.pageSql).not.toContain("+8 hours");
    expect(q.filterParams).toEqual([BASE.ftsMatch]);
    expect(q.pageParams).toEqual([BASE.ftsMatch, 30, 0]);
  });

  test("fresh=24h adds a bound-free rolling predicate to both statements", () => {
    const q = buildOpportunityFtsQueries({ ...BASE, fresh: "24h" });
    expect(q.countSql).toContain("unixepoch(o.scraped_at) >= unixepoch('now') - 86400");
    expect(q.pageSql).toContain("unixepoch(o.scraped_at) >= unixepoch('now') - 86400");
    // No user input interpolated: binds unchanged.
    expect(q.filterParams).toEqual([BASE.ftsMatch]);
  });

  test("fresh=today filters on the Manila calendar day", () => {
    const q = buildOpportunityFtsQueries({ ...BASE, fresh: "today" });
    expect(q.countSql).toContain("date(o.scraped_at, '+8 hours') = date('now', '+8 hours')");
    expect(q.pageSql).toContain("date(o.scraped_at, '+8 hours') = date('now', '+8 hours')");
  });

  test("card projection carries scrapedAt", () => {
    const q = buildOpportunityFtsQueries(BASE);
    expect(q.pageSql).toContain('o.scraped_at AS "scrapedAt"');
  });
});
