export const MAX_SCRAPE_RESPONSE_BYTES = 1_048_576;
const MAX_DIAGNOSTIC_ENTRIES = 128;
const FAILURE_FIELDS = ["insertFailedBatches", "rejectedInsertFailedBatches", "pendingInsertFailedBatches",
  "triageFailures", "triageAiUnavailable", "triageBudgetDeferred", "pendingDrainDeferred",
  "stateWriteFailed", "droppedNoUrl"] as const;

type JsonRecord = Record<string, unknown>;
type BodyValidity = "JSON_OBJECT" | "MALFORMED" | "OVERSIZED" | "UNREADABLE";
type ServerFailureClass = "REGISTRY_POLICY_UNAVAILABLE" | "RUN_LOCK_UNAVAILABLE" | "UNCLASSIFIED_SERVER_ERROR";
type Reason = "INVALID_ACKNOWLEDGEMENT" | "PUBLICATION_OUTCOME_UNKNOWN" | "TRANSPORT_INCOMPLETE"
  | "HTTP_RESPONSE_REJECTED" | "RESPONSE_TOO_LARGE" | "SERVER_REPORTED_ERROR"
  | "CONTRADICTORY_LOCK_ACKNOWLEDGEMENT" | "RUN_LOCK_HELD" | "DIAGNOSTICS_INCOMPLETE"
  | "INGESTION_DEGRADED" | "VALID_REPORTED_COUNTERS";

export interface ScrapeReceipt {
  publicationOutcome: "UNKNOWN" | "REPORTED" | "SKIPPED";
  reconciliationRequired: boolean;
  inserted: number | null;
  actualChanges: number | null;
  confirmedPublishedLowerBound: number | null;
  diagnosticsComplete: boolean;
  failureCounts: Record<typeof FAILURE_FIELDS[number] | "failedSources" | "sourceFailures"
    | "insertErrorCount" | "fetchEventFailedBatches", number | null>;
  cadenceStateAvailable: boolean | null;
  responseEvidence: {
    version: 1;
    operation: "scrape";
    httpStatus: number | null;
    transport: "COMPLETE" | "INCOMPLETE";
    bodyValidity: BodyValidity;
    terminalState: "unknown" | "error" | "lock-held" | "completed" | "degraded";
    reason: Reason;
    /** Exact upstream response signature, never an underlying D1 diagnosis. */
    serverFailureClass?: ServerFailureClass;
  };
}

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}
function count(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function classifyServerFailure(body: JsonRecord | null, httpStatus: number,
  transport: "COMPLETE" | "INCOMPLETE", bodyValidity: BodyValidity): ServerFailureClass {
  if (httpStatus === 503 && transport === "COMPLETE" && bodyValidity === "JSON_OBJECT" && body) {
    const keys = Object.keys(body);
    // These exact endpoint shapes contain no publication evidence or private
    // diagnostics. Additional or contradictory fields withhold the stage class.
    if (keys.length === 3 && keys.every(key => ["error", "reason", "runDurationMs"].includes(key))
      && body.error === "Source policy verification is temporarily unavailable. Retry shortly."
      && body.reason === "registry-policy-unavailable" && count(body.runDurationMs) !== null) {
      return "REGISTRY_POLICY_UNAVAILABLE";
    }
    if (keys.length === 1 && keys[0] === "error"
      && body.error === "Scrape coordination is temporarily unavailable. Retry shortly.") {
      return "RUN_LOCK_UNAVAILABLE";
    }
  }
  return "UNCLASSIFIED_SERVER_ERROR";
}

function diagnostics(body: JsonRecord, required: boolean) {
  let complete = true;
  const counts = Object.fromEntries(FAILURE_FIELDS.map(key => [key, count(body[key])])) as ScrapeReceipt["failureCounts"];
  for (const key of FAILURE_FIELDS) {
    if ((body[key] !== undefined || (required && key === "insertFailedBatches")) && counts[key] === null) complete = false;
  }
  function entries(key: string): unknown[] | null {
    if (body[key] === undefined && !required) return null;
    if (!Array.isArray(body[key])) { complete = false; return null; }
    if (body[key].length > MAX_DIAGNOSTIC_ENTRIES) complete = false;
    return body[key];
  }
  const failedSources = entries("failedSources");
  counts.failedSources = failedSources?.length ?? null;
  if (failedSources?.slice(0, MAX_DIAGNOSTIC_ENTRIES).some(value => typeof value !== "string")) complete = false;
  const insertErrors = entries("insertErrors");
  counts.insertErrorCount = insertErrors?.length ?? null;
  for (const value of insertErrors?.slice(0, MAX_DIAGNOSTIC_ENTRIES) ?? []) {
    const entry = record(value);
    if (!entry || count(entry.batchStart) === null || count(entry.batchSize) === null) complete = false;
  }
  const sources = entries("sourceResults");
  counts.sourceFailures = sources ? 0 : null;
  for (const value of sources?.slice(0, MAX_DIAGNOSTIC_ENTRIES) ?? []) {
    const source = record(value);
    if (!source || typeof source.ok !== "boolean"
      || (source.skipped !== undefined && typeof source.skipped !== "boolean")
      || (source.count !== undefined && count(source.count) === null)
      || (source.ok === true && source.skipped !== true && count(source.count) === null)) complete = false;
    if (source?.ok === false) counts.sourceFailures!++;
  }
  const event = record(body.fetchEventLog);
  if (required || body.fetchEventLog !== undefined) {
    if (!event || ["attempted", "recorded", "failedBatches"].some(key => count(event[key]) === null)) complete = false;
  }
  counts.fetchEventFailedBatches = count(event?.failedBatches);
  const cadence = record(body.cadenceGuards)?.stateAvailable;
  if ((required || body.cadenceGuards !== undefined) && typeof cadence !== "boolean") complete = false;
  return { complete, counts, cadence: typeof cadence === "boolean" ? cadence : null,
    degraded: Object.values(counts).some(value => value !== null && value > 0) || cadence === false };
}

/** API-reported evidence only: counts are not certified first unique public flow. */
export function assessScrapeResponse(raw: string, status: number | null,
  transport: "COMPLETE" | "INCOMPLETE" = "COMPLETE",
  bodyValidityOverride?: "OVERSIZED" | "UNREADABLE"): ScrapeReceipt {
  const httpStatus = typeof status === "number" && Number.isInteger(status) && status >= 100 && status <= 599 ? status : null;
  let body: JsonRecord | null = null;
  let bodyValidity: BodyValidity = bodyValidityOverride ?? "MALFORMED";
  if (!bodyValidityOverride) {
    if (new TextEncoder().encode(raw).byteLength > MAX_SCRAPE_RESPONSE_BYTES) bodyValidity = "OVERSIZED";
    else {
      try { body = record(JSON.parse(raw)); } catch { /* Discard parse errors and private input. */ }
      if (body) bodyValidity = "JSON_OBJECT";
    }
  }
  const health = diagnostics(body ?? {}, false);
  const receipt: ScrapeReceipt = {
    publicationOutcome: "UNKNOWN", reconciliationRequired: true,
    inserted: null, actualChanges: null,
    confirmedPublishedLowerBound: count(body?.confirmedPublishedLowerBound),
    diagnosticsComplete: false, failureCounts: health.counts, cadenceStateAvailable: health.cadence,
    responseEvidence: { version: 1, operation: "scrape", httpStatus, transport,
      bodyValidity, terminalState: "unknown", reason: "INVALID_ACKNOWLEDGEMENT",
      ...(httpStatus !== null && httpStatus >= 500
        ? { serverFailureClass: classifyServerFailure(body, httpStatus, transport, bodyValidity) } : {}) },
  };
  const reject = (reason: Reason, terminalState: "unknown" | "error" = "unknown") => {
    receipt.responseEvidence.reason = reason;
    receipt.responseEvidence.terminalState = terminalState;
    return receipt;
  };
  if (body?.publicationOutcome === "UNKNOWN" || body?.exposure === "UNKNOWN"
    || body?.code === "POST_PERSISTENCE_FAILURE" || body?.reconciliationRequired === true) {
    return reject("PUBLICATION_OUTCOME_UNKNOWN");
  }
  if (transport !== "COMPLETE") return reject("TRANSPORT_INCOMPLETE");
  if (httpStatus === null || httpStatus < 200 || httpStatus >= 300) return reject("HTTP_RESPONSE_REJECTED", "error");
  if (!body) return reject(bodyValidity === "OVERSIZED" ? "RESPONSE_TOO_LARGE" : "INVALID_ACKNOWLEDGEMENT");
  if (body.error) return reject("SERVER_REPORTED_ERROR", "error");
  if (body.publicationOutcome !== undefined || body.exposure !== undefined
    || (body.reconciliationRequired !== undefined && body.reconciliationRequired !== false)) return reject("INVALID_ACKNOWLEDGEMENT");
  if (body.skipped === true || body.reason === "run-lock-held" || body.lockState !== undefined) {
    if (body.skipped !== true || body.reason !== "run-lock-held" || body.lockState !== "held"
      || "inserted" in body || "actualChanges" in body || "confirmedPublishedLowerBound" in body
      || (body.backlogRemaining !== undefined && count(body.backlogRemaining) === null)
      || !health.complete || health.degraded) return reject("CONTRADICTORY_LOCK_ACKNOWLEDGEMENT");
    receipt.publicationOutcome = "SKIPPED";
    receipt.reconciliationRequired = false;
    // Complete acknowledgement of the no-op, not an ingestion health sample.
    receipt.diagnosticsComplete = true;
    receipt.responseEvidence.terminalState = "lock-held";
    receipt.responseEvidence.reason = "RUN_LOCK_HELD";
    return receipt;
  }
  const inserted = count(body.inserted);
  const actualChanges = count(body.actualChanges);
  if (inserted === null || actualChanges === null || inserted !== actualChanges
    || (body.skipped !== undefined && count(body.skipped) === null)
    || (inserted > 0 && count(body.backlogRemaining) === null)
    || (body.backlogRemaining !== undefined && count(body.backlogRemaining) === null)
    || body.confirmedPublishedLowerBound !== undefined) return reject("INVALID_ACKNOWLEDGEMENT");
  const ingestionHealth = diagnostics(body, true);
  receipt.publicationOutcome = "REPORTED";
  receipt.reconciliationRequired = false;
  receipt.inserted = inserted;
  receipt.actualChanges = actualChanges;
  receipt.confirmedPublishedLowerBound = null;
  receipt.failureCounts = ingestionHealth.counts;
  receipt.cadenceStateAvailable = ingestionHealth.cadence;
  receipt.diagnosticsComplete = ingestionHealth.complete;
  receipt.responseEvidence.terminalState = !ingestionHealth.complete || ingestionHealth.degraded ? "degraded" : "completed";
  receipt.responseEvidence.reason = !ingestionHealth.complete ? "DIAGNOSTICS_INCOMPLETE"
    : ingestionHealth.degraded ? "INGESTION_DEGRADED" : "VALID_REPORTED_COUNTERS";
  return receipt;
}

/** No raw response or transport exception is included in this rejection. */
export class ScrapeResponseError extends Error {
  constructor(readonly receipt: ScrapeReceipt) {
    super(`SCRAPE_RESPONSE_REJECTED: ${receipt.responseEvidence.reason}`);
    this.name = "ScrapeResponseError";
  }
}

/** Bound actual streamed bytes, including unknown-length and decompressed bodies.
 * https://developers.cloudflare.com/workers/runtime-apis/streams/readablestream/
 */
export async function readScrapeResponseBody(response: Response): Promise<{
  raw: string; bodyValidity?: "OVERSIZED" | "UNREADABLE";
}> {
  if (!response.body) return { raw: "" };
  const reader = response.body.getReader();
  // A fixed buffer also bounds overhead when a response delivers tiny chunks.
  const buffer = new Uint8Array(MAX_SCRAPE_RESPONSE_BYTES);
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.byteLength > MAX_SCRAPE_RESPONSE_BYTES - bytes) {
        // Cancellation cleanup must not turn an oversized receipt into a hang.
        void reader.cancel().catch(() => {});
        return { raw: "", bodyValidity: "OVERSIZED" };
      }
      buffer.set(value, bytes);
      bytes += value.byteLength;
    }
    return { raw: new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(buffer.subarray(0, bytes)) };
  } catch {
    void reader.cancel().catch(() => {});
    return { raw: "", bodyValidity: "UNREADABLE" };
  } finally { reader.releaseLock(); }
}
