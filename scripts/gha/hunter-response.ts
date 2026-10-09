import { open, writeFile } from "node:fs/promises";

const MAX_RESPONSE_BYTES = 1_048_576;
const MAX_DIAGNOSTIC_ENTRIES = 128;
const COUNTERS = ["acceptedForInsert", "attemptedInsert", "insertFailedBatches", "backlogRemaining",
  "triageFailures", "triageAiUnavailable", "triageBudgetDeferred", "rejectedPersisted",
  "rejectedInsertFailedBatches", "pendingPersisted", "pendingInsertFailedBatches",
  "pendingDrainDeferred", "stateWriteFailed", "droppedNoUrl", "runDurationMs"] as const;

type BodyValidity = "JSON_OBJECT" | "MALFORMED" | "OVERSIZED" | "UNREADABLE";
type TerminalState = "unknown" | "error" | "lock-held" | "backlog" | "success" | "needs-rerun";
type JsonRecord = Record<string, unknown>;

export type HunterReceipt = JsonRecord & {
  publicationOutcome: "UNKNOWN" | "REPORTED" | "SKIPPED";
  reconciliationRequired: boolean;
  inserted: number | null;
  actualChanges: number | null;
  confirmedPublishedLowerBound: number | null;
  diagnosticsComplete: boolean;
  responseEvidence: {
    version: 1; operation: "scrape"; httpStatus: number | null;
    transportExitCode: number | null; bodyValidity: BodyValidity;
    terminalState: TerminalState; reason: string;
  };
};

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function diagnostics(body: JsonRecord): JsonRecord & { diagnosticsComplete: boolean } {
  let complete = true;
  const result: JsonRecord = {};
  for (const key of COUNTERS) {
    result[key] = count(body[key]);
    if (body[key] !== undefined && result[key] === null) complete = false;
  }
  for (const key of ["insertFailedBatches", "triageFailures", "triageAiUnavailable"]) {
    if (result[key] === null) complete = false;
  }
  const entries = (key: string): unknown[] => {
    if (!Array.isArray(body[key])) { complete = false; return []; }
    if (body[key].length > MAX_DIAGNOSTIC_ENTRIES) complete = false;
    return body[key].slice(0, MAX_DIAGNOSTIC_ENTRIES);
  };
  result.sourceResults = entries("sourceResults").map((value, index) => {
    const source = record(value);
    if (!source || typeof source.ok !== "boolean") complete = false;
    if (source?.count !== undefined && count(source.count) === null) complete = false;
    if (source?.ok === true && source.skipped !== true && count(source.count) === null) complete = false;
    if (source?.skipped !== undefined && typeof source.skipped !== "boolean") complete = false;
    // Original labels/errors are deliberately withheld: arbitrary text can carry secrets.
    const sourceResult: JsonRecord = {
      sourceName: `response-source-${index + 1}`, sourceType: "withheld",
      ok: typeof source?.ok === "boolean" ? source.ok : null,
      count: count(source?.count), skipped: typeof source?.skipped === "boolean" ? source.skipped : null,
    };
    if (source?.ok === false) sourceResult.error = "SOURCE_REPORTED_FAILURE";
    if (source?.skipped === true) {
      sourceResult.skipReason = "SOURCE_REPORTED_SKIP";
      sourceResult.complianceStatus = "withheld";
    }
    return sourceResult;
  });
  result.failedSources = entries("failedSources").map((value, index) => {
    if (typeof value !== "string") complete = false;
    return `response-source-failure-${index + 1}`;
  });
  result.insertErrors = entries("insertErrors").map((value) => {
    const entry = record(value);
    if (!entry || count(entry.batchStart) === null || count(entry.batchSize) === null) complete = false;
    return { batchStart: count(entry?.batchStart), batchSize: count(entry?.batchSize), error: "INSERT_REPORTED_FAILURE" };
  });
  const event = record(body.fetchEventLog);
  const fetchEventLog: JsonRecord = {};
  for (const key of ["attempted", "recorded", "failedBatches"]) {
    fetchEventLog[key] = count(event?.[key]);
    if (fetchEventLog[key] === null) complete = false;
  }
  result.fetchEventLog = fetchEventLog;
  const state = record(body.cadenceGuards)?.stateAvailable;
  if (typeof state !== "boolean") complete = false;
  result.cadenceGuards = { stateAvailable: typeof state === "boolean" ? state : null };
  if (Array.isArray(body.unmatchedPauses)) {
    if (body.unmatchedPauses.length > MAX_DIAGNOSTIC_ENTRIES) complete = false;
    result.unmatchedPauses = body.unmatchedPauses.slice(0, MAX_DIAGNOSTIC_ENTRIES).map(() => "PAUSE_LABEL_WITHHELD");
  } else if (body.unmatchedPauses !== undefined) complete = false;
  return { ...result, diagnosticsComplete: complete };
}

/** Minimal API-reported evidence, never certified total exposure or fresh-job flow. */
export function assessHunterResponse(raw: string, status: number | null, transport: number | null): HunterReceipt {
  const httpStatus = Number.isInteger(status) && status! >= 100 && status! <= 599 ? status : null;
  const transportExitCode = Number.isInteger(transport) && transport! >= 0 && transport! <= 255 ? transport : null;
  let body: JsonRecord | null = null;
  let bodyValidity: BodyValidity = "MALFORMED";
  if (Buffer.byteLength(raw, "utf8") > MAX_RESPONSE_BYTES) bodyValidity = "OVERSIZED";
  else {
    try { body = record(JSON.parse(raw)); } catch { /* No raw body or parse exception escapes. */ }
    if (body) bodyValidity = "JSON_OBJECT";
  }
  const safeDiagnostics = body ? diagnostics(body) : null;
  const receipt: HunterReceipt = {
    ...(safeDiagnostics ?? {}),
    publicationOutcome: "UNKNOWN", reconciliationRequired: true,
    inserted: null, actualChanges: null, skipped: null,
    confirmedPublishedLowerBound: count(body?.confirmedPublishedLowerBound),
    diagnosticsComplete: false,
    responseEvidence: { version: 1, operation: "scrape", httpStatus, transportExitCode,
      bodyValidity, terminalState: "unknown", reason: "INVALID_ACKNOWLEDGEMENT" },
  };
  const reject = (reason: string, state: TerminalState = "unknown"): HunterReceipt => {
    receipt.error = reason;
    receipt.responseEvidence.reason = reason;
    receipt.responseEvidence.terminalState = state;
    return receipt;
  };
  if (body?.publicationOutcome === "UNKNOWN" || body?.exposure === "UNKNOWN"
    || body?.code === "POST_PERSISTENCE_FAILURE" || body?.reconciliationRequired === true) {
    return reject("PUBLICATION_OUTCOME_UNKNOWN");
  }
  if (transportExitCode !== 0) return reject("TRANSPORT_INCOMPLETE");
  if (httpStatus === null || httpStatus < 200 || httpStatus >= 300) return reject("HTTP_RESPONSE_REJECTED", "error");
  if (!body) return reject(bodyValidity === "OVERSIZED" ? "RESPONSE_TOO_LARGE" : "INVALID_ACKNOWLEDGEMENT");
  if (body.error) return reject("SERVER_REPORTED_ERROR", "error");
  if (body.publicationOutcome !== undefined || (body.reconciliationRequired !== undefined && body.reconciliationRequired !== false)) {
    return reject("INVALID_ACKNOWLEDGEMENT");
  }
  if (body.skipped === true && body.reason === "run-lock-held" && body.lockState === "held") {
    if (body.inserted !== undefined || body.actualChanges !== undefined || body.confirmedPublishedLowerBound !== undefined) {
      return reject("CONTRADICTORY_LOCK_ACKNOWLEDGEMENT");
    }
    receipt.publicationOutcome = "SKIPPED";
    receipt.reconciliationRequired = false;
    receipt.skipped = true;
    receipt.reason = "run-lock-held";
    receipt.lockState = "held";
    receipt.confirmedPublishedLowerBound = null;
    receipt.responseEvidence.terminalState = "lock-held";
    receipt.responseEvidence.reason = "RUN_LOCK_HELD";
    return receipt;
  }
  const inserted = count(body.inserted);
  const actualChanges = count(body.actualChanges);
  if (inserted === null || actualChanges === null || (body.skipped !== undefined && count(body.skipped) === null)) {
    return reject("INVALID_ACKNOWLEDGEMENT");
  }
  if (inserted > 0 && count(body.backlogRemaining) === null) return reject("INVALID_ACKNOWLEDGEMENT");
  receipt.publicationOutcome = "REPORTED";
  receipt.reconciliationRequired = false;
  receipt.inserted = inserted;
  receipt.actualChanges = actualChanges;
  receipt.skipped = count(body.skipped);
  receipt.confirmedPublishedLowerBound = null;
  receipt.diagnosticsComplete = safeDiagnostics!.diagnosticsComplete;
  receipt.responseEvidence.terminalState = inserted > 0
    ? (count(body.backlogRemaining)! > 0 ? "backlog" : "success")
    : (count(body.skipped)! > 0 ? "success" : "needs-rerun");
  receipt.responseEvidence.reason = "VALID_REPORTED_COUNTERS";
  return receipt;
}

async function main(argv: string[]): Promise<void> {
  const [bodyPath, statusArgument, transportArgument, outputPath] = argv;
  if (!bodyPath || !outputPath) { console.error("HUNTER_RECEIPT_ARGUMENTS_REQUIRED"); process.exitCode = 1; return; }
  const status = /^\d{3}$/.test(statusArgument ?? "") ? Number(statusArgument) : null;
  const transport = /^\d{1,3}$/.test(transportArgument ?? "") ? Number(transportArgument) : null;
  let receipt: HunterReceipt;
  try {
    const file = await open(bodyPath, "r");
    let raw: string;
    try {
      // Bound actual bytes read, including a concurrently growing temporary file.
      const buffer = Buffer.alloc(MAX_RESPONSE_BYTES + 1);
      let length = 0;
      while (length < buffer.length) {
        const { bytesRead } = await file.read(buffer, length, buffer.length - length, null);
        if (bytesRead === 0) break;
        length += bytesRead;
      }
      raw = length > MAX_RESPONSE_BYTES ? "x".repeat(MAX_RESPONSE_BYTES + 1) : buffer.subarray(0, length).toString("utf8");
    } finally { await file.close(); }
    receipt = assessHunterResponse(raw, status, transport);
  } catch {
    receipt = assessHunterResponse("", status, transport);
    receipt.responseEvidence.bodyValidity = "UNREADABLE";
    receipt.responseEvidence.reason = "RESPONSE_UNREADABLE";
    receipt.error = "RESPONSE_UNREADABLE";
  }
  try { await writeFile(outputPath, `${JSON.stringify(receipt)}\n`, "utf8"); }
  catch { console.error("HUNTER_RECEIPT_WRITE_FAILED"); process.exitCode = 1; return; }
  console.log(`Hunter response: ${receipt.responseEvidence.terminalState}; ${receipt.responseEvidence.reason}`);
  if (receipt.reconciliationRequired) process.exitCode = 1;
}

if (import.meta.main) {
  main(process.argv.slice(2)).catch(() => { console.error("HUNTER_RECEIPT_FAILED"); process.exitCode = 1; });
}
