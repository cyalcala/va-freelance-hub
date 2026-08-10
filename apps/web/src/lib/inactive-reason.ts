/** System-owned inactive states that a healthy source feed may safely reverse. */
export const RECOVERABLE_INACTIVE_REASONS = ["stale-feed", "link-unavailable"] as const;

export type RecoverableInactiveReason = (typeof RECOVERABLE_INACTIVE_REASONS)[number];

export function isFeedRecoverableInactiveReason(
  reason: string | null | undefined,
): reason is RecoverableInactiveReason {
  return RECOVERABLE_INACTIVE_REASONS.some((candidate) => candidate === reason);
}
