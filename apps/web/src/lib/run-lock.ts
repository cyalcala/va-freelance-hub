type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

/**
 * Only the conditional UPDATE's exact returned owner acknowledges a claim.
 * Mutation metadata and later reads cannot establish this invocation's owner.
 * Malformed/lost acknowledgements stay unavailable even if the write committed.
 */
export function runLockOutcome(result: unknown, expectedSourceId: string, observedAt: string): "acquired" | "held" | "unavailable" {
  try {
    if (typeof expectedSourceId !== "string" || !expectedSourceId || typeof observedAt !== "string" || !observedAt
      || !Array.isArray(result)) return "unavailable";
    if (result.length === 0) return "held";
    if (result.length !== 1) return "unavailable";
    const entry = Object.getOwnPropertyDescriptor(result, "0");
    if (!entry || !("value" in entry)) return "unavailable";
    const row = asRecord(entry.value);
    if (!row) return "unavailable";
    const source = Object.getOwnPropertyDescriptor(row, "sourceId");
    const timestamp = Object.getOwnPropertyDescriptor(row, "lastAttemptAt");
    return source && "value" in source && timestamp && "value" in timestamp
      && source.value === expectedSourceId && timestamp.value === observedAt ? "acquired" : "unavailable";
  } catch {
    return "unavailable";
  }
}
