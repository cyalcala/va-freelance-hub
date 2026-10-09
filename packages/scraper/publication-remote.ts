/** An explicit existing workplace enum can contradict remote eligibility.
 * Absence of a contradiction is not independent evidence of remote work. */
export function hasExplicitNonRemoteLocationType(value: unknown): value is "onsite" | "hybrid" {
  return value === "onsite" || value === "hybrid";
}
