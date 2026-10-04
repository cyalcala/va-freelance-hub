/**
 * INCIDENT-0410(w) — publication-receipt confirmation for the lake → D1 batch.
 *
 * HONESTY CONTRACT (CONSTITUTION §3.2 #14, §1.3 #2, MASTER_OPERATING_PROMPT §7):
 * A durable `SYNCED_TO_D1` receipt is a claim that a public row exists in the serving mart. The
 * publisher used to write that receipt for every candidate id once `execSync` returned without
 * throwing, which asserts a process exit code rather than a landing. This module makes the receipt
 * conditional on evidence that D1 actually applied the statement.
 *
 * It is deliberately a pure module with no I/O: `scripts/lake/sync-to-d1.ts` supplies the wrangler
 * output text and this module answers only "how many leading statements are confirmed applied?".
 *
 * Design constraints:
 * - Fail closed on the *receipt*, never on the write. An unconfirmed row stays `QUALIFIED_READY`, and
 *   every statement in the batch is an idempotent `ON CONFLICT(source_url) DO UPDATE` upsert, so the
 *   next tick retries it safely.
 * - Take the most conservative count when the output reports more than one total. Statements execute
 *   in file order, so a short count localises the failure to the tail of the batch.
 * - Never invent a D1 row identity. Confirming that a statement ran is not the same as reading the row
 *   back, and no read-back exists on this path.
 */

export interface D1BatchConfirmation {
  /** Candidate ids this tick asked D1 to apply. */
  expected: number;
  /** Leading statements confirmed applied, never more than `expected`. */
  confirmed: number;
  /** Which evidence confirmed the count, or `unconfirmed` when nothing did. */
  method: "statement-count" | "results-array" | "unconfirmed";
}

/** Stable event token so a starved or half-applied tick is greppable in job logs. */
export const UNCONFIRMED_PUBLISH_EVENT = "PUBLICATION_CLAIMED_NOT_CONFIRMED";

const STATEMENT_COUNT_PATTERN = /Executing\s+(\d+)\s+SQL\s+statements?\s+from/gi;

/**
 * Parses `wrangler d1 execute --file` output into a confirmation.
 *
 * Prefers the banner count (`Executing N SQL statements from <file>`), then the number of result
 * entries in the returned JSON array. Any other output — including truncated or unparseable output —
 * is `unconfirmed` rather than an assumption of success.
 */
export function parseD1BatchConfirmation(
  output: string | null | undefined,
  expected: number,
): D1BatchConfirmation {
  const want = Number.isSafeInteger(expected) && expected > 0 ? expected : 0;
  const text = typeof output === "string" ? output : "";
  if (want === 0) {
    return { expected: 0, confirmed: 0, method: text.length > 0 ? "statement-count" : "unconfirmed" };
  }

  const bannerCounts: number[] = [];
  for (const match of text.matchAll(STATEMENT_COUNT_PATTERN)) {
    const parsed = Number.parseInt(match[1] ?? "", 10);
    if (Number.isSafeInteger(parsed) && parsed >= 0) bannerCounts.push(parsed);
  }
  if (bannerCounts.length > 0) {
    // Two different totals mean an unknown split; the smaller one cannot over-claim a receipt.
    const observed = Math.min(...bannerCounts);
    return { expected: want, confirmed: Math.min(observed, want), method: "statement-count" };
  }

  const resultCount = countResultEntries(text);
  if (resultCount !== null) {
    return { expected: want, confirmed: Math.min(resultCount, want), method: "results-array" };
  }

  return { expected: want, confirmed: 0, method: "unconfirmed" };
}

/**
 * Counts applied statements from the JSON wrangler prints after a batch, or null when the output has
 * no parseable array. Mirrors the tolerant slicing already used by the D1 inventory snapshot reader.
 *
 * A `--file` batch prints one `{ results: [...] }` object per statement, so the applied count is the
 * sum across the top-level entries. A `--command` run prints a single object whose `results` holds the
 * returned rows; the caller caps the count at the number of candidate statements either way.
 */
function countResultEntries(output: string): number | null {
  const start = output.indexOf("[");
  if (start === -1) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(output.slice(start));
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  let total = 0;
  let sawResults = false;
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const results = (entry as { results?: unknown }).results;
    if (!Array.isArray(results)) continue;
    sawResults = true;
    total += results.length;
  }
  return sawResults ? total : null;
}

/**
 * Returns the candidate ids that earned a durable receipt.
 *
 * Statements are emitted in file order, so a confirmed prefix is the only prefix that may be marked.
 */
export function selectConfirmedCandidateIds(
  candidateIds: number[],
  confirmation: D1BatchConfirmation,
): number[] {
  const confirmed = Math.max(0, Math.min(confirmation.confirmed, candidateIds.length));
  return candidateIds.slice(0, confirmed);
}

/** One-line, greppable warning for a batch whose receipt is being withheld. */
export function formatUnconfirmedPublishNotice(
  confirmation: D1BatchConfirmation,
  totalStatements: number,
): string {
  return (
    `  [Publish] ${UNCONFIRMED_PUBLISH_EVENT}` +
    ` confirmed_candidates=${confirmation.confirmed}/${confirmation.expected}` +
    ` d1_statements_confirmed=${confirmation.confirmed}/${totalStatements}` +
    ` method=${confirmation.method};` +
    ` unconfirmed rows stay QUALIFIED_READY for the next tick.`
  );
}