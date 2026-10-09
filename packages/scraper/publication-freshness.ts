import { isAdmissionInstant } from "./admission-evidence";

export interface PostingFreshnessAssessment {
  state: "UNKNOWN" | "INVALID" | "FUTURE" | "STALE" | "WITHIN_WINDOW";
  postedAt: string | null;
}

// Accepted freshness.max_days_since_post; evaluation uses the original posting
// instant only. Acquisition/update clocks do not establish a posting date.
const MAX_POSTING_AGE_MS = 30 * 86_400_000;
const ORIGINAL_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

export function assessPostingFreshness(originalPostedAt: unknown, observedAt: string): PostingFreshnessAssessment {
  if (!isAdmissionInstant(observedAt)) return { state: "INVALID", postedAt: null };
  if (originalPostedAt == null || (typeof originalPostedAt === "string" && originalPostedAt.trim() === "")) {
    return { state: "UNKNOWN", postedAt: null };
  }
  if (typeof originalPostedAt !== "string" || !ORIGINAL_INSTANT.test(originalPostedAt)) {
    return { state: "INVALID", postedAt: null };
  }
  // Validate the unshifted calendar before Date can repair impossible dates or
  // hour 24. A timezone conversion must not conceal an invalid source date.
  const wallClock = `${originalPostedAt.slice(0, 19)}.000Z`;
  if (!isAdmissionInstant(wallClock)) return { state: "INVALID", postedAt: null };
  const postedMs = Date.parse(originalPostedAt);
  if (!Number.isFinite(postedMs)) return { state: "INVALID", postedAt: null };
  const postedAt = new Date(postedMs).toISOString();
  // Date truncates supported fractional precision to milliseconds. Compare
  // the original remainder too, so a nanosecond in the future stays withheld.
  const fraction = originalPostedAt.match(/\.(\d{1,9})/)?.[1] ?? "";
  const subMillisecondNs = BigInt(fraction.padEnd(9, "0").slice(3));
  const ageNs = BigInt(Date.parse(observedAt) - postedMs) * 1_000_000n - subMillisecondNs;
  return { state: ageNs < 0n ? "FUTURE" : ageNs > BigInt(MAX_POSTING_AGE_MS) * 1_000_000n ? "STALE" : "WITHIN_WINDOW", postedAt };
}
