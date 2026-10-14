export const WORKABLE_ROTATION_LIMIT = 2;
export const WORKABLE_MIN_INTERVAL_MS = 60 * 60_000;
export interface WorkableAgency {
  companyName: string;
  atsPlatform: string | null;
  atsToken: string | null;
  verifiedAt?: string | null;
}
export type WorkableRotationReason = "POLICY_DISABLED" | "POLICY_UNAVAILABLE" | "INVALID_SOURCE_ID"
  | "STATE_UNAVAILABLE" | "INVALID_ATTEMPT_TIME" | "FUTURE_ATTEMPT_TIME" | "COOLDOWN"
  | "DUPLICATE_SOURCE" | "ROTATION_DEFERRED" | "INVALID_OBSERVED_AT";
export interface WorkableRotationInput<T extends WorkableAgency> {
  agencies: readonly T[];
  sourceKey: (agency: T) => string;
  isPolicyEnabled: (agency: T) => boolean;
  states: ReadonlyMap<string, { readonly lastAttemptAt: unknown }>;
  statesAvailable: boolean;
  observedAt: unknown;
}
export interface WorkableRotationResult<T extends WorkableAgency> {
  selected: T[];
  selectedSourceIds: ReadonlySet<string>;
  diagnostics: Array<{ agency: T; sourceId: string | null; reason: WorkableRotationReason; nextAllowedAt?: string }>;
  unavailableReason: "INVALID_OBSERVED_AT" | "STATE_UNAVAILABLE" | null;
}

function utcTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || value !== value.trim()) return null;
  // Route clocks and durable attempt writes are UTC ISO. Do not interpret a
  // timezone-ambiguous string in the executor's local timezone or normalize an
  // impossible calendar date into a different valid date.
  const parts = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/.exec(value);
  if (!parts) return null;
  const normalized = `${parts[1]}.${(parts[2] ?? "").padEnd(3, "0")}Z`;
  const timestamp = Date.parse(normalized);
  return Number.isSafeInteger(timestamp) && new Date(timestamp).toISOString() === normalized ? timestamp : null;
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Allocate the existing two Workable slots only among canonical, policy-enabled
 * tenants whose durable attempts are due. Callbacks retain policy and identity
 * ownership; this selector admits no source and performs no fetch or write.
 * Directory verification dates and IDs never act as collection clocks.
 */
export function selectWorkableRotation<T extends WorkableAgency>(input: WorkableRotationInput<T>): WorkableRotationResult<T> {
  const rows = input.agencies.filter(row => row.atsPlatform === "workable");
  const selected: T[] = [];
  const ids = new Set<string>();
  const diagnostics: WorkableRotationResult<T>["diagnostics"] = [];
  const now = utcTimestamp(input.observedAt);
  const unavailableReason = now === null ? "INVALID_OBSERVED_AT"
    : input.statesAvailable !== true ? "STATE_UNAVAILABLE" : null;
  if (unavailableReason) {
    return { selected, selectedSourceIds: ids, unavailableReason,
      diagnostics: rows.map(agency => ({ agency, sourceId: null, reason: unavailableReason })) };
  }
  const due: Array<{ agency: T; sourceId: string; lastAttempt: number | null; index: number }> = [];
  const skip = (agency: T, sourceId: string | null, reason: WorkableRotationReason, nextAllowedAt?: string) => {
    diagnostics.push({ agency, sourceId, reason, ...(nextAllowedAt ? { nextAllowedAt } : {}) });
  };
  for (const row of rows) {
    let sourceId: string;
    try {
      sourceId = input.sourceKey(row);
      if (typeof sourceId !== "string" || !sourceId.startsWith("workable:") || sourceId === "workable:"
        || sourceId !== sourceId.trim() || sourceId.includes("\0")) throw new Error("invalid canonical source identity");
    } catch {
      skip(row, null, "INVALID_SOURCE_ID");
      continue;
    }
    try {
      const enabled = input.isPolicyEnabled(row);
      if (enabled !== true) {
        skip(row, sourceId, enabled === false ? "POLICY_DISABLED" : "POLICY_UNAVAILABLE");
        continue;
      }
    } catch {
      skip(row, sourceId, "POLICY_UNAVAILABLE");
      continue;
    }
    let lastAttempt: number | null = null;
    try {
      if (input.states.has(sourceId)) {
        lastAttempt = utcTimestamp(input.states.get(sourceId)?.lastAttemptAt);
        if (lastAttempt === null) {
          skip(row, sourceId, "INVALID_ATTEMPT_TIME");
          continue;
        }
      }
    } catch {
      skip(row, sourceId, "STATE_UNAVAILABLE");
      continue;
    }
    if (lastAttempt !== null && lastAttempt > now!) {
      skip(row, sourceId, "FUTURE_ATTEMPT_TIME");
      continue;
    }
    if (lastAttempt !== null && now! - lastAttempt < WORKABLE_MIN_INTERVAL_MS) {
      skip(row, sourceId, "COOLDOWN", new Date(lastAttempt + WORKABLE_MIN_INTERVAL_MS).toISOString());
      continue;
    }
    due.push({ agency: row, sourceId, lastAttempt, index: due.length });
  }
  due.sort((a, b) => {
    const aTime = a.lastAttempt ?? Number.NEGATIVE_INFINITY;
    const bTime = b.lastAttempt ?? Number.NEGATIVE_INFINITY;
    return (aTime === bTime ? 0 : aTime < bTime ? -1 : 1)
      || compareText(a.sourceId, b.sourceId) || compareText(a.agency.companyName, b.agency.companyName) || a.index - b.index;
  });
  const seen = new Set<string>();
  for (const candidate of due) {
    const { agency, sourceId } = candidate;
    if (seen.has(sourceId)) {
      skip(agency, sourceId, "DUPLICATE_SOURCE");
    } else {
      seen.add(sourceId);
      if (selected.length < WORKABLE_ROTATION_LIMIT) {
        selected.push(agency);
        ids.add(sourceId);
      } else {
        skip(agency, sourceId, "ROTATION_DEFERRED");
      }
    }
  }
  return { selected, selectedSourceIds: ids, diagnostics, unavailableReason: null };
}
