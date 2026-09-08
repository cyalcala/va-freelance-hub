/** Shared by both clocks: HTTP success is insufficient for a healthy shadow run. */
export function assessShadowResponse(body: string): string {
  const value = JSON.parse(body);
  const counters = ["totalRegistryRows", "eligible", "dispatched", "skippedIneligible", "skippedInvalidProvider", "skippedInvalidEvidence", "skippedRunCap", "probeFailures", "rejectedProbeResults"];
  if (!value || counters.some(key => !Number.isSafeInteger(value[key]) || value[key] < 0)
    || value.totalRegistryRows < 1 || !Array.isArray(value.evidenceErrors)
    || !Array.isArray(value.invalidProviderErrors) || !value.outcomes || typeof value.outcomes !== "object") {
    throw new Error("Invalid shadow dispatch summary");
  }
  if (value.probeFailures || value.rejectedProbeResults || value.skippedInvalidProvider
    || value.skippedInvalidEvidence || value.evidenceErrors.length || value.invalidProviderErrors.length) {
    throw new Error("Shadow dispatch has unresolved probe or evidence failures");
  }
  let total = 0;
  for (const [outcome, count] of Object.entries(value.outcomes)) {
    if (!Number.isSafeInteger(count) || (count as number) < 0
      || !["HEALTHY_WITH_RESULTS", "HEALTHY_EMPTY"].includes(outcome)) {
      throw new Error("Shadow dispatch contains unhealthy or unknown outcomes");
    }
    total += count as number;
  }
  if (total !== value.dispatched || value.dispatched !== value.eligible) {
    throw new Error("Shadow dispatch counts do not reconcile");
  }
  return `shadow dispatched=${value.dispatched}, eligible=${value.eligible}`;
}
