import { expect, test } from "bun:test";
import { assessSuccessfulScrapeResponse } from "./scrape-response";

test("accepts a normal completed scrape and an intentional lock skip", () => {
  expect(assessSuccessfulScrapeResponse(JSON.stringify({
    inserted: 3,
    actualChanges: 3,
    attemptedInsert: 3,
    insertFailedBatches: 0,
    rejectedInsertFailedBatches: 0,
    triageFailures: 0,
    triageAiUnavailable: 0,
  }))).toEqual("inserted=3 actualChanges=3");

  expect(assessSuccessfulScrapeResponse(JSON.stringify({
    skipped: true,
    reason: "run-lock-held",
  }))).toEqual("skipped=run-lock-held");
});

test("rejects HTTP-200 scrape results with unresolved ingestion work", () => {
  expect(() => assessSuccessfulScrapeResponse(JSON.stringify({
    inserted: 0,
    insertFailedBatches: 1,
    triageAiUnavailable: 2,
  }))).toThrow("incomplete ingestion");
});

test("rejects malformed or error-shaped HTTP-200 bodies", () => {
  expect(() => assessSuccessfulScrapeResponse("not json")).toThrow("valid JSON");
  expect(() => assessSuccessfulScrapeResponse(JSON.stringify({ error: "D1 unavailable" }))).toThrow("D1 unavailable");
});
