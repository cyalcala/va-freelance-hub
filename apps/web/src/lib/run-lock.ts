type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function positiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

/**
 * Converts the D1/Drizzle mutation result into an explicit lock state. An
 * unknown driver shape is not evidence that the lock was acquired, so callers
 * must fail closed rather than risk overlapping expensive scrape runs.
 */
export function runLockOutcome(result: unknown): "acquired" | "held" | "unavailable" {
  const row = asRecord(result);
  if (!row) return "unavailable";

  const meta = asRecord(row.meta);
  const changes = positiveInteger(meta?.changes) ?? positiveInteger(row.rowsAffected);
  if (changes === null) return "unavailable";
  return changes > 0 ? "acquired" : "held";
}
