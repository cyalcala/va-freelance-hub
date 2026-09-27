/** Scheduling state only: a host hold never supplies observation or authority evidence. */
export interface ShadowHostBackoff {
  host: string;
  sourceId: string;
  limitedAt: string;
  nextEligibleAt: string;
  reason: "default_cadence" | "retry_after";
}

/** RFC 9110 section 10.2.3: delay-seconds or HTTP-date, never parseInt prefixes. */
export function retryAfterInstant(value: string | null | undefined, receivedAt: string): string | null {
  if (value == null) return null;
  const raw = value.trim();
  const received = Date.parse(receivedAt);
  if (!Number.isFinite(received)) return null;
  let retryAt: number;
  if (/^\d+$/.test(raw)) {
    const seconds = Number(raw);
    if (!Number.isSafeInteger(seconds)) return null;
    retryAt = received + seconds * 1000;
  } else {
    // HTTP-date accepts IMF-fixdate plus the two obsolete recipient formats.
    // Exclude Date.parse's permissive interpretation of values like '-1' or '1.5'.
    const httpDate = /^(?:[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT|[A-Z][a-z]+, \d{2}-[A-Z][a-z]{2}-\d{2} \d{2}:\d{2}:\d{2} GMT|[A-Z][a-z]{2} [A-Z][a-z]{2} [ \d]\d \d{2}:\d{2}:\d{2} \d{4})$/;
    if (!httpDate.test(raw)) return null;
    retryAt = Date.parse(raw);
  }
  // Store canonical, four-digit-year UTC values for stable SQLite comparisons.
  if (!Number.isSafeInteger(retryAt) || retryAt < 0 || retryAt > 253402300799999) return null;
  return new Date(Math.max(received, retryAt)).toISOString();
}
