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

  expect(() => assessSuccessfulScrapeResponse(JSON.stringify({
    inserted: 0,
    actualChanges: 0,
    droppedNoUrl: 3,
  }))).toThrow("droppedNoUrl=3");

  expect(() => assessSuccessfulScrapeResponse(JSON.stringify({
    inserted: 0,
    actualChanges: 0,
    triageBudgetDeferred: 34,
  }))).toThrow("triageBudgetDeferred=34");

  expect(() => assessSuccessfulScrapeResponse(JSON.stringify({
    inserted: 0,
    actualChanges: 0,
    pendingInsertFailedBatches: 1,
  }))).toThrow("pendingInsertFailedBatches=1");

  expect(() => assessSuccessfulScrapeResponse(JSON.stringify({
    inserted: 0,
    actualChanges: 0,
    stateWriteFailed: 1,
  }))).toThrow("stateWriteFailed=1");

  expect(() => assessSuccessfulScrapeResponse(JSON.stringify({
    inserted: 0,
    actualChanges: 0,
    failedSources: ["Example RSS: HTTP 503"],
  }))).toThrow("failedSources=1");

  expect(() => assessSuccessfulScrapeResponse(JSON.stringify({
    inserted: 0,
    actualChanges: 0,
    fetchEventLog: { failedBatches: 1 },
  }))).toThrow("fetchEventFailedBatches=1");
});

test("rejects malformed or error-shaped HTTP-200 bodies", () => {
  expect(() => assessSuccessfulScrapeResponse("not json")).toThrow("valid JSON");
  expect(() => assessSuccessfulScrapeResponse("{}" )).toThrow("recognized terminal response");
  expect(() => assessSuccessfulScrapeResponse(JSON.stringify({ error: "D1 unavailable" }))).toThrow("D1 unavailable");
});

test("accepts explicit zero-change and lock-held terminal responses", () => {
  expect(assessSuccessfulScrapeResponse(JSON.stringify({ inserted: 0, actualChanges: 0 })))
    .toBe("inserted=0 actualChanges=0");
  expect(assessSuccessfulScrapeResponse(JSON.stringify({ skipped: true, reason: "run-lock-held" })))
    .toBe("skipped=run-lock-held");
});

test("rejects unrecognized or degraded skipped responses", () => {
  expect(() => assessSuccessfulScrapeResponse(JSON.stringify({
    skipped: true,
    reason: "parser-failed",
  }))).toThrow("recognized terminal response");
  expect(() => assessSuccessfulScrapeResponse(JSON.stringify({
    skipped: true,
    reason: "run-lock-held",
    droppedNoUrl: 3,
  }))).toThrow("droppedNoUrl=3");
});
