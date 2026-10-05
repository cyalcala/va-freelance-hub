import { expect, test } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { publicOpportunityFilters, PUBLIC_PH_ELIGIBILITIES } from "../src/lib/public-opportunities";
import { buildOpportunityFtsQueries } from "../src/lib/opportunity-fts-query";
import { parseJobIdRequest } from "../src/lib/public-query";

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

/**
 * Job-id drift lock, and explicitly NOT a behaviour proof.
 *
 * `/jobs/[id]` is an Astro component whose frontmatter cannot be imported, so
 * unlike the click route there is no way to drive its id handling through an
 * exported function. This test therefore only proves the weaker structural
 * claim: both public surfaces that take a job id route it through the one
 * exported parser and neither re-inlines its own grammar. The behaviour itself
 * is proven in `click-route.test.ts` (real handler) and `public-query.test.ts`
 * (real parser); this exists so a future edit cannot quietly give the two
 * surfaces different id grammars again, which is the defect INCIDENT-0410(aw)
 * fixed. It is the same technique the eligibility parity test above already
 * uses for `.astro` surfaces.
 */
test("both public job-id surfaces route through the one shared id grammar", () => {
  const JOB_ID_SURFACES = [
    "src/pages/jobs/[id].astro",
    "src/pages/api/click/[id].ts",
  ];

  for (const surface of JOB_ID_SURFACES) {
    const source = readFileSync(resolve(import.meta.dir, "../", surface), "utf8");
    // The CALL, not merely the import: an import left behind by a partially
    // reverted edit must not read as compliance.
    expect({ surface, callsSharedIdParser: /parseJobIdRequest\((?:params\.)?id\)/.test(source) }).toEqual({
      surface,
      callsSharedIdParser: true,
    });
    // No surface may re-declare the grammar locally, in any spelling.
    expect({ surface, inlinesIdGrammar: /\.test\(\s*(?:params\.)?id\s*\)/.test(source) }).toEqual({
      surface,
      inlinesIdGrammar: false,
    });
  }

  // And the shared parser is the one both of them resolve to.
  expect(parseJobIdRequest("4667")).toEqual({ ok: true, id: 4667 });
  expect(parseJobIdRequest("4667abc")).toMatchObject({ ok: false, status: 400 });
});
