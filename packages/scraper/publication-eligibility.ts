import type { PhEligibility } from "./geoGate";

/** Existing public serving states; this grants no source or publication authority. */
export const PUBLIC_PH_ELIGIBILITIES = Object.freeze(
  ["eligible_verified", "eligible_likely"] as const satisfies readonly PhEligibility[],
);

export function isPublicPhEligibility(value: unknown): value is typeof PUBLIC_PH_ELIGIBILITIES[number] {
  return PUBLIC_PH_ELIGIBILITIES.some((accepted) => value === accepted);
}
