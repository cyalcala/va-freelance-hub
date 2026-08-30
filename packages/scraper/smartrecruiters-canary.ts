/**
 * SP-13 — SmartRecruiters public Posting API canary (pure helpers, no I/O).
 *
 * Uses the new `packages/scraper/smartrecruiters.ts` adapter (this unit's
 * own contribution — SmartRecruiters was not previously supported anywhere
 * in this project). Promotion decision reuses SP-12's shared,
 * provider-agnostic `decidePromotionToShadow` from `./source-promotion`.
 *
 * Official docs: https://developers.smartrecruiters.com/docs/posting-api
 */

import { computeReviewDeadline, computePolicyExpiry } from "./source-lifecycle";
import { SMARTRECRUITERS_API_HOST, SMARTRECRUITERS_JOBS_HOST, smartRecruitersListUrl } from "./smartrecruiters";

export const SMARTRECRUITERS_PROVIDER_ID = "smartrecruiters";
export const SMARTRECRUITERS_EVIDENCE_URL = "https://developers.smartrecruiters.com/docs/posting-api";
export const SMARTRECRUITERS_ALLOWED_HOSTS = `${SMARTRECRUITERS_API_HOST}`;
export const SMARTRECRUITERS_EVIDENCE_LEASE_DAYS = 180;

export interface SmartRecruitersProviderProfileRow {
  id: string;
  displayName: string;
  providerFamily: string;
  mechanism: "ats_api";
  authClass: "none";
  endpointPattern: string;
  allowedHosts: string;
  evidenceUrl: string;
  evidenceLeaseDays: number;
  visibilityFilter: "published";
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

export function buildSmartRecruitersProviderProfile(): SmartRecruitersProviderProfileRow {
  return {
    id: SMARTRECRUITERS_PROVIDER_ID,
    displayName: "SmartRecruiters",
    providerFamily: "smartrecruiters",
    mechanism: "ats_api",
    authClass: "none",
    endpointPattern: "https://api.smartrecruiters.com/v1/companies/{companyIdentifier}/postings",
    allowedHosts: SMARTRECRUITERS_ALLOWED_HOSTS,
    evidenceUrl: SMARTRECRUITERS_EVIDENCE_URL,
    evidenceLeaseDays: SMARTRECRUITERS_EVIDENCE_LEASE_DAYS,
    visibilityFilter: "published",
    contentScope: "minimal",
    cadenceMinMinutes: 60,
    cadenceMaxMinutes: 1440,
    rateGuidance: "Public Posting API GET is unauthenticated with no documented per-minute limit; this project's own 60-minute ATS cadence guard applies regardless. Not every customer has the public feed enabled — a 200 with totalFound:0 does not by itself distinguish 'no open roles' from 'feed not enabled for this customer.'",
    robotsHandling: "observe",
    removalSemantics: "Deactivate within one successful reconciliation cycle once a posting disappears from a complete list pull.",
    defaultComplianceState: "needs_review",
    defaultOperationalState: "candidate",
    notes: `List endpoint (${smartRecruitersListUrl("{companyIdentifier}")}) returns visibility per posting ("PUBLIC" filtered in) and no description/jobAd content at all — genuinely minimal by API shape, nothing to actively strip. Canonical postingUrl is not present in the list response; it is deterministically derived from id+slugified name (verified against real live postings, not officially documented) rather than fetched via an N+1 per-posting detail call. Public job board host: ${SMARTRECRUITERS_JOBS_HOST}.`,
  };
}

export interface SmartRecruitersCompanyInput {
  companyIdentifier: string;
  companyName: string;
  nowIso: string;
  reviewDeadlineDays?: number;
}

export interface SmartRecruitersCandidateRow {
  sourceId: string;
  providerId: string;
  displayName: string;
  endpointUrl: string;
  companyToken: string;
  discoveryProvenance: string;
  complianceState: "conditional";
  operationalState: "candidate";
  reviewDeadline: string;
  policyExpiry: string;
  owner: string;
  lastDecision: string;
  lastDecisionAt: string;
  optOut: 0;
}

export function buildSmartRecruitersCandidateRow(input: SmartRecruitersCompanyInput): SmartRecruitersCandidateRow {
  const sourceId = `smartrecruiters:${input.companyIdentifier}`;
  const endpointUrl = smartRecruitersListUrl(input.companyIdentifier);
  const provenance = JSON.stringify({
    companyName: input.companyName,
    companyIdentifier: input.companyIdentifier,
    decidedAt: input.nowIso,
    provenance: "sp-13-curated-company",
    complianceBasis: "documented public/no-auth Posting API GET (developers.smartrecruiters.com/docs/posting-api); minimal-content conditional decision per Source Perpetuity strategy operating posture",
  });
  return {
    sourceId,
    providerId: SMARTRECRUITERS_PROVIDER_ID,
    displayName: input.companyName,
    endpointUrl,
    companyToken: input.companyIdentifier,
    discoveryProvenance: provenance,
    complianceState: "conditional",
    operationalState: "candidate",
    reviewDeadline: computeReviewDeadline(input.nowIso, input.reviewDeadlineDays ?? 14),
    policyExpiry: computePolicyExpiry(input.nowIso, SMARTRECRUITERS_EVIDENCE_LEASE_DAYS),
    owner: "sp-13",
    lastDecision: "conditional minimal-content decision (documented public/no-auth Posting API GET)",
    lastDecisionAt: input.nowIso,
    optOut: 0,
  };
}
