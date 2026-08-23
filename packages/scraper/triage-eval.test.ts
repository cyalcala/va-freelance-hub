import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decideTriage, mapTriageCategoryToUiCategory } from "./triage-decision";
import type { GeoScope } from "./geoGate";

// DATA-06 taxonomy convergence gate.
//
// The three NEW-item ingestion decision paths — the inline scrape loop, the
// inline pending-triage drain, and the Inngest durable drain — all route their
// verdict + category mapping through the SAME `decideTriage` /
// `mapTriageCategoryToUiCategory`. This file locks that contract two ways:
//
//   1. A labelled corpus (fixtures/triage-eval.json) is run END-TO-END through
//      `decideTriage` with a mocked AI provider, asserting the expected verdict
//      kind and (for eligible listings) the mapped board category. Because the
//      corpus flows through triageJob's validator, it reflects the real pipeline
//      — including that any non-slug AI category (healthcare/teaching/sales, and
//      even the mapper's own creative/social-media/customer-support aliases) is
//      coerced to "other" before it can leak into a board category.
//   2. An anti-drift guard asserts the private duplicate mapper is gone from the
//      scrape route and that both the scrape route and the Inngest drain import
//      the shared verdict/mapper, so a future edit cannot silently re-fork them.

type EvalCase = {
  id: string;
  input: {
    title: string;
    description?: string | null;
    company?: string | null;
    tags?: string[] | null;
    locationRaw?: string | null;
  };
  geoScope: GeoScope;
  triage: Record<string, unknown> | "unavailable";
  skeptic: Record<string, unknown> | null;
  expect: { kind: string; category?: string };
};

const corpus = JSON.parse(
  readFileSync(join(import.meta.dir, "fixtures", "triage-eval.json"), "utf8"),
) as { version: number; cases: EvalCase[] };

function jsonResponse(obj: unknown) {
  return { response: JSON.stringify(obj) };
}

/**
 * Mock Workers AI env. `triage: "unavailable"` returns an env with no AI binding
 * so triageJob fails closed (aiUnavailable). Otherwise the mock routes the
 * triage prompt vs. the skeptic prompt (the skeptic system prompt contains
 * "skeptical reviewer") and returns the case's canned JSON verdicts.
 */
function makeEnv(triage: EvalCase["triage"], skeptic: EvalCase["skeptic"]) {
  if (triage === "unavailable") return {};
  return {
    AI: {
      run: async (_model: string, request: any) => {
        const userMsg = String(
          request?.messages?.find((m: any) => m.role === "user")?.content ?? "",
        );
        if (userMsg.includes("skeptical reviewer")) {
          return jsonResponse(skeptic ?? { eligible: true, reason: "ok" });
        }
        return jsonResponse(triage);
      },
    },
  };
}

describe("DATA-06 triage/taxonomy eval corpus", () => {
  test("corpus is large enough and well-formed", () => {
    expect(corpus.cases.length).toBeGreaterThanOrEqual(25);
    const ids = new Set(corpus.cases.map((c) => c.id));
    expect(ids.size).toBe(corpus.cases.length); // no duplicate ids
  });

  const verdictTally: Record<string, number> = {};
  const categoryTally: Record<string, number> = {};

  for (const c of corpus.cases) {
    test(`${c.id} → ${c.expect.kind}${c.expect.category ? "/" + c.expect.category : ""}`, async () => {
      const env = makeEnv(c.triage, c.skeptic);
      const decision = await decideTriage(c.input, { geoScope: c.geoScope }, env);
      verdictTally[decision.kind] = (verdictTally[decision.kind] ?? 0) + 1;

      expect(decision.kind).toBe(c.expect.kind);

      if (decision.kind === "eligible") {
        const ui = mapTriageCategoryToUiCategory(decision.triage.category);
        categoryTally[ui] = (categoryTally[ui] ?? 0) + 1;
        expect(ui).toBe(c.expect.category);
      }
    });
  }

  test("corpus covers every verdict kind and all nine board categories", () => {
    // Re-run deterministically so the summary is independent of test ordering.
    const kinds: Record<string, number> = {};
    const cats: Record<string, number> = {};
    // These are computed from the labels, not re-invoked, so this stays a pure
    // coverage assertion over the fixture itself.
    for (const c of corpus.cases) {
      kinds[c.expect.kind] = (kinds[c.expect.kind] ?? 0) + 1;
      if (c.expect.category) cats[c.expect.category] = (cats[c.expect.category] ?? 0) + 1;
    }
    for (const kind of ["eligible", "ineligible", "consensus-split", "ai-unavailable"]) {
      expect(kinds[kind] ?? 0).toBeGreaterThan(0);
    }
    for (const cat of [
      "admin",
      "design",
      "tech",
      "marketing",
      "customer-service",
      "finance",
      "writing",
      "ai",
      "other",
    ]) {
      expect(cats[cat] ?? 0).toBeGreaterThan(0);
    }
    // Human-readable confusion-style summary in the test log.
    console.log("[DATA-06 eval] verdict distribution:", JSON.stringify(kinds));
    console.log("[DATA-06 eval] eligible→board category distribution:", JSON.stringify(cats));
  });
});

describe("DATA-06 cross-path anti-drift guard", () => {
  const repoRoot = join(import.meta.dir, "..", "..");
  const scrapeSrc = readFileSync(
    join(repoRoot, "apps", "web", "src", "pages", "api", "cron", "scrape.ts"),
    "utf8",
  );
  const drainSrc = readFileSync(
    join(repoRoot, "apps", "web", "src", "lib", "inngest", "functions", "triage-drain.ts"),
    "utf8",
  );

  test("scrape route no longer defines a private category mapper", () => {
    expect(scrapeSrc).not.toMatch(/function\s+mapTriageCategoryToUiCategory/);
  });

  test("scrape route imports the shared verdict and mapper", () => {
    expect(scrapeSrc).toMatch(/decideTriage/);
    expect(scrapeSrc).toMatch(/mapTriageCategoryToUiCategory/);
    expect(scrapeSrc).toMatch(/from\s+["']@va-hub\/scraper["']/);
  });

  test("Inngest drain imports the shared verdict and mapper", () => {
    expect(drainSrc).toMatch(/decideTriage/);
    expect(drainSrc).toMatch(/mapTriageCategoryToUiCategory/);
    expect(drainSrc).toMatch(/from\s+["']@va-hub\/scraper["']/);
  });
});
