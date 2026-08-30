/**
 * Provider-agnostic evidence-gated promotion decision (candidate -> shadow).
 *
 * Extracted from SP-12's Greenhouse-specific `decidePromotionToShadow`
 * (`packages/scraper/greenhouse-canary.ts`, already merged/deployed and left
 * untouched) once a second provider (SP-11 Lever) needed the identical
 * logic. Combines SP-05's lifecycle guard with SP-08 evidence-packet
 * completeness and SP-07 shadow-probe health — all three must agree,
 * regardless of which ATS/RSS/XML provider is being evaluated.
 */

import type { EvidencePacket } from "./evidence-packet";
import type { CandidateShadowResult } from "./candidate-shadow";
import { canEnterShadow, type ComplianceState, type OperationalState } from "./source-lifecycle";

export interface SourcePromotionDecision {
  ok: boolean;
  reason: string;
}

export function decidePromotionToShadow(
  registryState: { compliance: ComplianceState; operational: OperationalState; optOut: boolean },
  packet: EvidencePacket,
  shadow: CandidateShadowResult,
): SourcePromotionDecision {
  const lifecycle = canEnterShadow(registryState);
  if (!lifecycle.ok) return { ok: false, reason: `lifecycle guard: ${lifecycle.reason}` };

  if (packet.missingEvidence.length > 0) {
    return { ok: false, reason: `evidence packet incomplete: ${packet.missingEvidence.join("; ")}` };
  }
  if (shadow.diagnostic.outcome !== "HEALTHY_WITH_RESULTS" && shadow.diagnostic.outcome !== "HEALTHY_EMPTY") {
    return { ok: false, reason: `shadow probe outcome not healthy: ${shadow.diagnostic.outcome}` };
  }
  if (shadow.robots.wouldBlock) {
    return { ok: false, reason: "robots would block this endpoint" };
  }
  return { ok: true, reason: "lifecycle guard passed, evidence packet complete (review_ready), shadow probe healthy, robots allowed" };
}
