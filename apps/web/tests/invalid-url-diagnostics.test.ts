import { expect, test } from "bun:test";
import type { NewOpportunity } from "@va-hub/db";
import { buildNoJobsScrapedOutcome, normalizeScrapedItems } from "../src/pages/api/cron/scrape";
import { summarizeRunDiagnostics } from "../src/lib/run-diagnostics";

function item(title: string, sourceUrl: string): NewOpportunity {
  return { title, sourceUrl, applicationUrl: sourceUrl } as NewOpportunity;
}

test("an all-invalid parser result preserves the dropped count", () => {
  const result = normalizeScrapedItems([
    item("Missing", ""),
    item("Script", "javascript:alert(1)"),
  ]);

  expect(result.items).toEqual([]);
  expect(result.droppedNoUrl).toBe(2);
});

test("mixed parser output retains valid items and reports invalid ones", () => {
  const result = normalizeScrapedItems([
    item("Valid", "https://example.com/jobs/1"),
    item("Missing", ""),
  ]);

  expect(result.items).toHaveLength(1);
  expect(result.items[0]?.sourceUrl).toBe("https://example.com/jobs/1");
  expect(result.droppedNoUrl).toBe(1);
});

test("quarantines cross-host apply links, reports repeated hosts, and preserves attributable external sources", () => {
  const poisoned = ["Alpaca", "Xapo Bank", "Metabase"].map((company, index) => ({
    ...item(company, `https://remoteok.com/remote-jobs/${index}`),
    company,
    applicationUrl: `https://remotephjobs.com/apply/${index}`,
  }));
  const attributable = {
    ...item("External source", "https://remotephjobs.com/jobs/9"),
    company: "External source",
    applicationUrl: "https://remotephjobs.com/apply/9",
  };

  const result = normalizeScrapedItems([...poisoned, attributable] as NewOpportunity[]);

  expect(result.quarantinedApplicationUrls).toBe(3);
  expect(result.anomalousApplicationHosts).toEqual(["remotephjobs.com"]);
  expect(result.items.slice(0, 3).every((row) => row.applicationUrl === row.sourceUrl)).toBe(true);
  expect(result.items[3]?.applicationUrl).toBe("https://remotephjobs.com/apply/9");
});

test("the all-invalid early exit returns the drop count and records degradation", () => {
  const outcome = buildNoJobsScrapedOutcome({
    droppedNoUrl: 2,
    fetchEventFailedBatches: 0,
    failedSourceCount: 0,
    cadenceStateAvailable: true,
    details: { unclearRetriaged: 0 },
  });

  expect(outcome.response).toMatchObject({
    inserted: 0,
    actualChanges: 0,
    droppedNoUrl: 2,
    message: "No jobs scraped",
  });
  expect(summarizeRunDiagnostics(outcome.diagnostics)).toMatchObject({
    degraded: true,
    summary: "droppedNoUrl=2",
  });
});
