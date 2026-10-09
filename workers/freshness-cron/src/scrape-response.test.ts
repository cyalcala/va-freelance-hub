import { expect, test } from "bun:test";
import { assessScrapeResponse, MAX_SCRAPE_RESPONSE_BYTES, readScrapeResponseBody } from "./scrape-response";

// All actual non-lock terminal API paths include these fields. Triage is absent
// on the no-jobs/dedup paths; missing optional counters must remain null.
function completed(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { inserted: 0, actualChanges: 0, insertFailedBatches: 0, insertErrors: [],
    failedSources: [], sourceResults: [],
    fetchEventLog: { attempted: 0, recorded: 0, failedBatches: 0 },
    cadenceGuards: { stateAvailable: true }, ...extra };
}
function assess(extra: Record<string, unknown>, status = 200) {
  return assessScrapeResponse(JSON.stringify(completed(extra)), status);
}

test("completed and backlog counts stay API-reported rather than certified public flow", () => {
  const result = assess({ inserted: 3, actualChanges: 3, backlogRemaining: 8 });
  expect(result).toMatchObject({ publicationOutcome: "REPORTED", inserted: 3,
    actualChanges: 3, confirmedPublishedLowerBound: null, reconciliationRequired: false,
    diagnosticsComplete: true, responseEvidence: { terminalState: "completed" } });
  expect(JSON.stringify(result)).not.toContain("certified");
});

test("actual no-jobs and dedup shapes remain valid without optional triage counters", () => {
  for (const skipped of [0, 12]) {
    const result = assess({ skipped, droppedNoUrl: 0, stateWriteFailed: 0 });
    expect(result.responseEvidence.terminalState).toBe("completed");
    expect(result.inserted).toBe(0);
    expect(result.failureCounts.triageFailures).toBeNull();
    expect(result.failureCounts.triageAiUnavailable).toBeNull();
  }
});

test("held lock requires the actual tuple and omits publication counter evidence", () => {
  const result = assessScrapeResponse(JSON.stringify({ skipped: true, reason: "run-lock-held",
    lockState: "held", backlogRemaining: 1 }), 200);
  expect(result).toMatchObject({ publicationOutcome: "SKIPPED", reconciliationRequired: false,
    inserted: null, actualChanges: null, confirmedPublishedLowerBound: null,
    responseEvidence: { terminalState: "lock-held", reason: "RUN_LOCK_HELD" } });
});

for (const contradiction of [{}, { lockState: "unavailable" }, { lockState: "held", inserted: 0 },
  { lockState: "held", actualChanges: null }, { lockState: "held", confirmedPublishedLowerBound: 2 },
  { lockState: "held", triageFailures: "1" }, { lockState: "held", droppedNoUrl: 1 },
  { lockState: "held", backlogRemaining: "invalid" }]) {
  test(`held lock rejects contradictory evidence ${JSON.stringify(contradiction)}`, () => {
    const result = assessScrapeResponse(JSON.stringify({ skipped: true, reason: "run-lock-held", ...contradiction }), 200);
    expect(result.publicationOutcome).toBe("UNKNOWN");
    expect(result.reconciliationRequired).toBe(true);
    expect(result.inserted).toBeNull();
  });
}

for (const signal of [{ publicationOutcome: "UNKNOWN" }, { exposure: "UNKNOWN" },
  { code: "POST_PERSISTENCE_FAILURE" }, { reconciliationRequired: true }]) {
  for (const status of [200, 500]) {
    test(`uncertainty overrides counts on HTTP ${status}: ${JSON.stringify(signal)}`, () => {
      const result = assess({ ...signal, inserted: 4, actualChanges: 4,
        confirmedPublishedLowerBound: 2 }, status);
      expect(result).toMatchObject({ publicationOutcome: "UNKNOWN", reconciliationRequired: true,
        inserted: null, actualChanges: null, confirmedPublishedLowerBound: 2,
        responseEvidence: { operation: "scrape", httpStatus: status, transport: "COMPLETE",
          bodyValidity: "JSON_OBJECT", terminalState: "unknown", reason: "PUBLICATION_OUTCOME_UNKNOWN" } });
    });
  }
}

test("only a validated nonnegative safe integer prefix can survive unknown publication", () => {
  for (const prefix of [-1, 0.5, "2", null, Number.MAX_SAFE_INTEGER + 1]) {
    expect(assess({ publicationOutcome: "UNKNOWN", confirmedPublishedLowerBound: prefix }, 500)
      .confirmedPublishedLowerBound).toBeNull();
  }
  expect(assess({ publicationOutcome: "UNKNOWN", confirmedPublishedLowerBound: 0 }, 500)
    .confirmedPublishedLowerBound).toBe(0);
});

test("ordinary HTTP failures retain status but cannot certify no publication", () => {
  for (const status of [401, 429, 500, 503, 307, 308]) {
    const result = assess({ inserted: 4, actualChanges: 4, error: "PRIVATE_RESPONSE_MARKER" }, status);
    expect(result).toMatchObject({ publicationOutcome: "UNKNOWN", inserted: null,
      actualChanges: null, reconciliationRequired: true, responseEvidence: { httpStatus: status,
        terminalState: "error", reason: "HTTP_RESPONSE_REJECTED" } });
    expect(JSON.stringify(result)).not.toContain("PRIVATE_RESPONSE_MARKER");
  }
});

test("transport and interrupted body are explicit uncertainty without exception text", () => {
  expect(assessScrapeResponse("", null, "INCOMPLETE", "UNREADABLE")).toMatchObject({
    publicationOutcome: "UNKNOWN", inserted: null, confirmedPublishedLowerBound: null,
    responseEvidence: { httpStatus: null, transport: "INCOMPLETE", bodyValidity: "UNREADABLE",
      reason: "TRANSPORT_INCOMPLETE" },
  });
  expect(assessScrapeResponse("{", 200, "INCOMPLETE", "UNREADABLE").actualChanges).toBeNull();
});

test("malformed JSON and non-object acknowledgements are never successful zeroes", () => {
  for (const raw of ["not json", "null", "[]", "1", '"ok"', "{}"]) {
    const result = assessScrapeResponse(raw, 200);
    expect(result.publicationOutcome).toBe("UNKNOWN");
    expect(result.reconciliationRequired).toBe(true);
    expect(result.inserted).toBeNull();
  }
});

test("unsafe, fractional, unequal or incomplete publication totals stay unknown", () => {
  for (const extra of [{ inserted: 0.5, actualChanges: 0.5 }, { inserted: -1 },
    { actualChanges: "0" }, { inserted: Number.MAX_SAFE_INTEGER + 1 },
    { inserted: 2, actualChanges: 1, backlogRemaining: 0 },
    { inserted: 2, actualChanges: 2 }, { skipped: true },
    { publicationOutcome: "REPORTED" }, { reconciliationRequired: "false" }]) {
    expect(assess(extra).publicationOutcome).toBe("UNKNOWN");
  }
});

for (const field of ["insertFailedBatches", "rejectedInsertFailedBatches", "pendingInsertFailedBatches",
  "triageFailures", "triageAiUnavailable", "triageBudgetDeferred", "pendingDrainDeferred",
  "stateWriteFailed", "droppedNoUrl"]) {
  test(`unresolved ${field} fails health while preserving reported publication totals`, () => {
    const result = assess({ [field]: 3 });
    expect(result).toMatchObject({ publicationOutcome: "REPORTED", inserted: 0, actualChanges: 0,
      reconciliationRequired: false, diagnosticsComplete: true,
      responseEvidence: { terminalState: "degraded", reason: "INGESTION_DEGRADED" } });
    expect(result.failureCounts[field as keyof typeof result.failureCounts]).toBe(3);
  });
}

test("malformed supplied failure counters cannot become healthy zeroes", () => {
  for (const invalid of ["1", null, -1, 0.5, {}, Number.MAX_SAFE_INTEGER + 1]) {
    const result = assess({ triageFailures: invalid });
    expect(result.responseEvidence.terminalState).toBe("degraded");
    expect(result.diagnosticsComplete).toBe(false);
    expect(result.failureCounts.triageFailures).toBeNull();
  }
});

test("missing required diagnostics stay incomplete; optional absent counts stay null", () => {
  for (const field of ["insertFailedBatches", "insertErrors", "failedSources", "sourceResults",
    "fetchEventLog", "cadenceGuards"]) {
    const body = completed(); delete body[field];
    const result = assessScrapeResponse(JSON.stringify(body), 200);
    expect(result.responseEvidence.terminalState).toBe("degraded");
    expect(result.diagnosticsComplete).toBe(false);
  }
});

test("failed source, insert and fetch-event evidence degrades without raw text", () => {
  for (const extra of [{ failedSources: ["PRIVATE_RESPONSE_MARKER"] },
    { sourceResults: [{ ok: false, error: "PRIVATE_RESPONSE_MARKER" }] },
    { insertErrors: [{ batchStart: 0, batchSize: 1, error: "PRIVATE_RESPONSE_MARKER" }] },
    { fetchEventLog: { attempted: 1, recorded: 0, failedBatches: 1 } },
    { cadenceGuards: { stateAvailable: false, stateError: "PRIVATE_RESPONSE_MARKER" } }]) {
    const result = assess(extra);
    expect(result.responseEvidence.terminalState).toBe("degraded");
    expect(JSON.stringify(result)).not.toContain("PRIVATE_RESPONSE_MARKER");
  }
});

test("invalid diagnostic arrays, nested counts and truncation cannot certify health", () => {
  for (const extra of [{ failedSources: "failed" }, { failedSources: [null] },
    { sourceResults: [{ ok: true, count: 0.5 }] }, { sourceResults: [{ ok: "true", count: 0 }] },
    { insertErrors: [{ batchStart: "0", batchSize: 1 }] },
    { fetchEventLog: { attempted: 1, recorded: 0, failedBatches: "1" } },
    { cadenceGuards: { stateAvailable: "true" } },
    { sourceResults: Array.from({ length: 129 }, () => ({ ok: true, count: 0 })) }]) {
    expect(assess(extra).diagnosticsComplete).toBe(false);
    expect(assess(extra).responseEvidence.terminalState).toBe("degraded");
  }
});

test("unknown acknowledgement preserves only allowlisted metadata", () => {
  const result = assess({ publicationOutcome: "UNKNOWN", confirmedPublishedLowerBound: 1,
    error: "PRIVATE_RESPONSE_MARKER", message: "PRIVATE_RESPONSE_MARKER",
    url: "https://PRIVATE_RESPONSE_MARKER", headers: { Authorization: "PRIVATE_RESPONSE_MARKER" },
    receipt: { secret: "PRIVATE_RESPONSE_MARKER" } }, 500);
  expect(result.confirmedPublishedLowerBound).toBe(1);
  expect(JSON.stringify(result)).not.toContain("PRIVATE_RESPONSE_MARKER");
});

test("server error acknowledgement is fixed and cannot leak its message", () => {
  const result = assess({ error: "PRIVATE_RESPONSE_MARKER" });
  expect(result.responseEvidence.reason).toBe("SERVER_REPORTED_ERROR");
  expect(JSON.stringify(result)).not.toContain("PRIVATE_RESPONSE_MARKER");
});

test("pure assessment bounds UTF-8 bytes rather than JavaScript characters", () => {
  const raw = JSON.stringify({ error: "é".repeat(MAX_SCRAPE_RESPONSE_BYTES / 2) });
  expect(assessScrapeResponse(raw, 200).responseEvidence.bodyValidity).toBe("OVERSIZED");
});

test("bounded stream stops and cancels without a Content-Length header", async () => {
  let canceled = false;
  let reads = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) { reads++; controller.enqueue(new Uint8Array(65_536)); },
    cancel() { canceled = true; },
  });
  expect(await readScrapeResponseBody(new Response(body))).toEqual({ raw: "", bodyValidity: "OVERSIZED" });
  expect(canceled).toBe(true);
  expect(reads).toBeLessThanOrEqual(18);
});

test("exact byte bound allows completion and preserves split UTF-8 chunks", async () => {
  const raw = JSON.stringify({ padding: "x".repeat(MAX_SCRAPE_RESPONSE_BYTES - 14) });
  expect(new TextEncoder().encode(raw).byteLength).toBe(MAX_SCRAPE_RESPONSE_BYTES);
  expect(await readScrapeResponseBody(new Response(raw))).toMatchObject({ raw });
  const bytes = new TextEncoder().encode(JSON.stringify({ message: "é" }));
  const stream = new ReadableStream<Uint8Array>({ start(controller) {
    const at = bytes.indexOf(0xc3) + 1;
    controller.enqueue(bytes.slice(0, at)); controller.enqueue(bytes.slice(at)); controller.close();
  } });
  expect((await readScrapeResponseBody(new Response(stream))).raw).toBe(JSON.stringify({ message: "é" }));
});

test("body read failure withholds partial private bytes and exception text", async () => {
  const stream = new ReadableStream<Uint8Array>({ start(controller) {
    controller.enqueue(new TextEncoder().encode("PRIVATE_RESPONSE_MARKER"));
    controller.error(new Error("PRIVATE_RESPONSE_MARKER"));
  } });
  expect(await readScrapeResponseBody(new Response(stream))).toEqual({ raw: "", bodyValidity: "UNREADABLE" });
});
