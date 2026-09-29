import { expect, test } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { publicOpportunityFilters, PUBLIC_PH_ELIGIBILITIES } from "../src/lib/public-opportunities";
import { buildOpportunityFtsQueries } from "../src/lib/opportunity-fts-query";

// F5 parity lock (2026-09-27 audit): list, search, detail, sitemap,
// categories and homepage must all compose the SAME public eligibility
// contract. The parity is implemented once in
// src/lib/public-opportunities.ts; these tests lock it so a future
// refactor cannot silently diverge one route again.

const ROUTE_SURFACES = [
  "src/pages/opportunities.astro",
  "src/pages/jobs/[id].astro",
  "src/pages/sitemap.xml.ts",
  "src/pages/categories/[category].astro",
  "src/lib/homepage-data.ts",
  "src/lib/opportunity-fts-query.ts",
];

test("the shared predicate compiles to is_active + both eligibilities", () => {
  const { sql, params } = new SQLiteSyncDialect().sqlToQuery(publicOpportunityFilters());
  const lowered = sql.toLowerCase();
  expect(lowered).toContain("is_active");
  expect(lowered).toContain("ph_eligibility");
  expect(lowered).toContain("in (?, ?)");
  expect(params).toContain("eligible_verified");
  expect(params).toContain("eligible_likely");
  expect(PUBLIC_PH_ELIGIBILITIES).toEqual(["eligible_verified", "eligible_likely"]);
});

test("the FTS search path embeds the same eligibility contract", () => {
  const queries = buildOpportunityFtsQueries({ ftsMatch: "assistant", limit: 10, offset: 0 });
  expect(queries.countSql).toContain("o.is_active = 1");
  expect(queries.countSql).toContain(
    "o.ph_eligibility IN ('eligible_verified', 'eligible_likely')",
  );
  expect(queries.pageSql).toContain("o.is_active = 1");
  expect(queries.pageSql).toContain(
    "o.ph_eligibility IN ('eligible_verified', 'eligible_likely')",
  );
});

test("every public route surface references the shared predicate", () => {
  for (const surface of ROUTE_SURFACES) {
    const source = readFileSync(resolve(import.meta.dir, "../", surface), "utf8");
    const usesSharedContract =
      source.includes("publicOpportunityFilters") || source.includes("PUBLIC_PH_ELIGIBILITY_SQL");
    expect({ surface, usesSharedContract }).toEqual({
      surface,
      usesSharedContract: true,
    });
  }
});
