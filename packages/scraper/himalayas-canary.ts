/**
 * Himalayas Public Remote Jobs API Canary & Provider Profile definitions.
 *
 * Implements the registry specifications for the Himalayas candidate reservoir
 * under ADR-006 / ADR-007 / Masterplan §7 balanced-access policy.
 */

import { computeReviewDeadline, computePolicyExpiry } from "./source-lifecycle";
import {
  HIMALAYAS_PROVIDER_ID,
  HIMALAYAS_SOURCE_ID,
  HIMALAYAS_SEARCH_API,
} from "./himalayas";

export { HIMALAYAS_PROVIDER_ID, HIMALAYAS_SOURCE_ID, HIMALAYAS_SEARCH_API };

export const HIMALAYAS_DEFAULT_ENDPOINT = `${HIMALAYAS_SEARCH_API}?country=Philippines&limit=50`;
export const HIMALAYAS_EVIDENCE_URL = "https://himalayas.app/docs/remote-jobs-api";
export const HIMALAYAS_ALLOWED_HOSTS = "himalayas.app";
export const HIMALAYAS_EVIDENCE_LEASE_DAYS = 180;

export interface HimalayasProviderProfileRow {
  id: string;
  displayName: string;
  providerFamily: string;
  mechanism: "public_api";
  authClass: "none";
  endpointPattern: string;
  allowedHosts: string;
  evidenceUrl: string;
  evidenceLeaseDays: number;
  visibilityFilter: "public";
  contentScope: "minimal";
  cadenceMinMinutes: number;
  cadenceMaxMinutes: number;
  rateGuidance: string;
  robotsHandling: "observe";
  removalSemantics: string;
  defaultComplianceState: "needs_review";
  defaultOperationalState: "candidate";
  notes: string;
}

export function buildHimalayasProviderProfile(): HimalayasProviderProfileRow {
  return {
    id: HIMALAYAS_PROVIDER_ID,
    displayName: "Himalayas",
    providerFamily: "himalayas",
    mechanism: "public_api",
    authClass: "none",
    endpointPattern: HIMALAYAS_DEFAULT_ENDPOINT,
    allowedHosts: HIMALAYAS_ALLOWED_HOSTS,
    evidenceUrl: HIMALAYAS_EVIDENCE_URL,
    evidenceLeaseDays: HIMALAYAS_EVIDENCE_LEASE_DAYS,
    visibilityFilter: "public",
    contentScope: "minimal",
    cadenceMinMinutes: 60,
    cadenceMaxMinutes: 1440,
    rateGuidance:
      "Public REST API GET is unauthenticated; 60-minute cadence guard applies with respectful polling.",
    robotsHandling: "observe",
    removalSemantics:
      "Deactivate within one successful reconciliation cycle once a posting disappears from a complete feed pull.",
    defaultComplianceState: "needs_review",
    defaultOperationalState: "candidate",
    notes:
      "Himalayas public /jobs/api endpoint. Captures minimal discovery metadata (title, company, URL, location restrictions, salary, published date). Never scrapes full description HTML. Canonical linkback to original application.",
  };
}

export interface HimalayasCandidateRow {
  sourceId: string;
  providerId: string;
  displayName: string;
  endpointUrl: string;
  companyToken: null;
  discoveryProvenance: string;
  complianceState: "conditional";
  operationalState: "candidate";
  reviewDeadline: string;
  policyExpiry: string;
  canaryMaxNewItemsPerTick: number;
  owner: string;
  lastDecision: string;
  lastDecisionAt: string;
  optOut: 0;
}

export interface HimalayasCandidateInput {
  nowIso: string;
  reviewDeadlineDays?: number;
  endpointUrl?: string;
}

export function buildHimalayasCandidateRow(
  input: HimalayasCandidateInput,
): HimalayasCandidateRow {
  const endpointUrl = input.endpointUrl || HIMALAYAS_DEFAULT_ENDPOINT;
  const provenance = JSON.stringify({
    decidedAt: input.nowIso,
    provenance: "reservoir-himalayas-public-api",
    complianceBasis:
      "documented public/no-auth Himalayas jobs API GET (himalayas.app/docs/remote-jobs-api); minimal discovery metadata conditional decision per Source Perpetuity strategy operating posture",
  });

  return {
    sourceId: HIMALAYAS_SOURCE_ID,
    providerId: HIMALAYAS_PROVIDER_ID,
    displayName: "Himalayas (Remote Jobs)",
    endpointUrl,
    companyToken: null,
    discoveryProvenance: provenance,
    complianceState: "conditional",
    operationalState: "candidate",
    reviewDeadline: computeReviewDeadline(
      input.nowIso,
      input.reviewDeadlineDays ?? 14,
    ),
    policyExpiry: computePolicyExpiry(
      input.nowIso,
      HIMALAYAS_EVIDENCE_LEASE_DAYS,
    ),
    canaryMaxNewItemsPerTick: 2,
    owner: "reservoir-himalayas",
    lastDecision:
      "conditional minimal-content decision (documented public/no-auth Himalayas jobs API GET)",
    lastDecisionAt: input.nowIso,
    optOut: 0,
  };
}
