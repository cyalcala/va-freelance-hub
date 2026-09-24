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
  const nonHealthy: Array<[string, number]> = [];
  for (const [outcome, count] of Object.entries(value.outcomes)) {
    if (!Number.isSafeInteger(count) || (count as number) < 0) {
      throw new Error("Shadow dispatch counts do not reconcile");
    }
    if (!["HEALTHY_WITH_RESULTS", "HEALTHY_EMPTY"].includes(outcome)) nonHealthy.push([outcome, count as number]);
    total += count as number;
  }
  if (total !== value.dispatched || value.dispatched !== value.eligible) {
    throw new Error("Shadow dispatch counts do not reconcile");
  }

  // Verdict-aware path (2026-09-24): the route may attach an adjudication
  // verdict that deterministically reclassifies bounded anomalies (chronic
  // known-limit boundary conditions, Jev-accepted transients) into run notes.
  // Without a verdict the strict contract below is unchanged, so an older
  // deployed route still fails assessment exactly as before.
  if (value.verdict !== undefined) {
    const verdict = value.verdict;
    if (!verdict || typeof verdict !== "object" || Array.isArray(verdict)
      || !["healthy", "healthy_with_notes", "failed"].includes(verdict.status)
      || !Array.isArray(verdict.notes)
      || !Array.isArray(verdict.classifications)
      || !Array.isArray(verdict.reasons)) {
      throw new Error("Invalid shadow dispatch verdict");
    }
    if (verdict.status === "failed") {
      throw new Error("Shadow dispatch verdict failed: " + verdict.reasons.join("; "));
    }
    const noteKeys = new Set<string>();
    const allowedClassifications = new Set(["known_limit_over_budget", "candidate_over_budget", "transient_rate_limit"]);
    for (const note of verdict.notes) {
      if (!note || typeof note !== "object" || typeof note.sourceId !== "string"
        || !allowedClassifications.has(note.classification)) {
        throw new Error("Invalid shadow dispatch verdict note");
      }
      noteKeys.add(`${note.sourceId}`);
    }
    const nonHealthyTotal = nonHealthy.reduce((sum, [, count]) => sum + count, 0);
    if (verdict.status === "healthy" && nonHealthyTotal > 0) {
      throw new Error("Shadow dispatch counts do not reconcile");
    }
    if (verdict.status === "healthy_with_notes") {
      if (verdict.reasons.length < 1 || noteKeys.size !== verdict.notes.length) {
        throw new Error("Invalid shadow dispatch verdict notes");
      }
      const anomalies = value.anomalies ?? [];
      const nonHealthyOutcomes = new Set(nonHealthy.map(([outcome]) => outcome));
      for (const anomaly of anomalies) {
        if (!anomaly || typeof anomaly !== "object" || typeof anomaly.sourceId !== "string"
          || typeof anomaly.outcome !== "string" || !nonHealthyOutcomes.has(anomaly.outcome)) {
          throw new Error("Shadow dispatch verdict anomalies are malformed");
        }
      }
      // Every non-healthy outcome must be covered by exactly one note.
      if (nonHealthyTotal > 0) {
        for (const [outcome, count] of nonHealthy) {
          const covered = anomalies.filter((a: any) => a.outcome === outcome && noteKeys.has(a.sourceId)).length;
          if (covered !== count) throw new Error("Shadow dispatch verdict does not cover all anomalous outcomes");
        }
        const coveredTotal = anomalies.filter((a: any) => noteKeys.has(a.sourceId)).length;
        if (coveredTotal !== nonHealthyTotal || noteKeys.size !== nonHealthyTotal) {
          throw new Error("Shadow dispatch verdict does not cover all anomalous outcomes");
        }
      } else if (verdict.notes.length > 0) {
        throw new Error("Invalid shadow dispatch verdict notes");
      }
      const decision = verdict.decision;
      if (decision !== undefined) {
        if (!decision || typeof decision !== "object" || typeof decision.model !== "string"
          || !["ACCEPT_NOTES", "FAIL_CONSERVATIVE", "ABSTAIN"].includes(decision.recommendation)
          || typeof decision.confidence !== "number" || decision.confidence < 0 || decision.confidence > 1
          || decision.enforced !== verdict.status
          || decision.ok !== true) {
          throw new Error("Invalid shadow dispatch verdict decision record");
        }
      }
    }
    const notesPart = verdict.status === "healthy_with_notes" ? `, notes=${verdict.notes.length}` : "";
    return `shadow dispatched=${value.dispatched}, eligible=${value.eligible}, verdict=${verdict.status}${notesPart}`;
  }

  if (nonHealthy.length) {
    throw new Error("Shadow dispatch contains unhealthy or unknown outcomes");
  }
  return `shadow dispatched=${value.dispatched}, eligible=${value.eligible}`;
}
