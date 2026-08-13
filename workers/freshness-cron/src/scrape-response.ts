type ScrapeResponse = Record<string, unknown>;

const UNRESOLVED_WORK_FIELDS = [
  "insertFailedBatches",
  "rejectedInsertFailedBatches",
  "triageFailures",
  "triageAiUnavailable",
  "droppedNoUrl",
] as const;

function asRecord(value: unknown): ScrapeResponse | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as ScrapeResponse
    : null;
}

function positiveCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

/**
 * Distinguishes an intentional no-op (for example a concurrent run holding the
 * scrape lock) from a 200 response that still contains unpersisted work. The
 * freshness Worker must make the latter observable so Cloudflare records a
 * failed scheduled invocation instead of falsely reporting a healthy pulse.
 */
export function assessSuccessfulScrapeResponse(body: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("scrape endpoint returned HTTP 200 without valid JSON");
  }

  const response = asRecord(parsed);
  if (!response) throw new Error("scrape endpoint returned HTTP 200 with an invalid response shape");

  if (typeof response.error === "string" && response.error.trim()) {
    throw new Error(`scrape endpoint reported an error: ${response.error.slice(0, 300)}`);
  }

  const unresolved = UNRESOLVED_WORK_FIELDS
    .map((field) => [field, positiveCount(response[field])] as const)
    .filter(([, count]) => count > 0);
  if (unresolved.length > 0) {
    throw new Error(`scrape endpoint reported incomplete ingestion: ${unresolved.map(([field, count]) => `${field}=${count}`).join(", ")}`);
  }

  if (response.skipped === true) {
    if (response.reason !== "run-lock-held") {
      throw new Error("scrape endpoint returned HTTP 200 without a recognized terminal response");
    }
    return "skipped=run-lock-held";
  }

  if (typeof response.inserted !== "number" || !Number.isFinite(response.inserted) || response.inserted < 0
      || typeof response.actualChanges !== "number" || !Number.isFinite(response.actualChanges) || response.actualChanges < 0) {
    throw new Error("scrape endpoint returned HTTP 200 without a recognized terminal response");
  }

  const inserted = positiveCount(response.inserted);
  const actualChanges = positiveCount(response.actualChanges);
  return `inserted=${inserted} actualChanges=${actualChanges}`;
}
