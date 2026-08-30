/**
 * SP-14 — Teamtailor public `/jobs.rss` canary (pure helpers, no I/O).
 *
 * Uses the new `packages/scraper/teamtailor.ts` adapter (this unit's own
 * contribution — Teamtailor was not previously supported anywhere in this
 * project). Promotion decision reuses SP-12's shared, provider-agnostic
 * `decidePromotionToShadow` from `./source-promotion`.
 *
 * Official docs: https://support.teamtailor.com/en/articles/11171756-rss-feed-how-to-guide
 */

import { computeReviewDeadline, computePolicyExpiry } from "./source-lifecycle";
import { teamtailorFeedUrl } from "./teamtailor";

export const TEAMTAILOR_PROVIDER_ID = "teamtailor";
export const TEAMTAILOR_EVIDENCE_URL = "https://support.teamtailor.com/en/articles/11171756-rss-feed-how-to-guide";
export const TEAMTAILOR_EVIDENCE_LEASE_DAYS = 180;

export interface TeamtailorProviderProfileRow {
  id: string;
  displayName: string;
  providerFamily: string;
  mechanism: "rss";
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

/** Each Teamtailor company has its own career domain (either the default
 * `{company}.teamtailor.com` or a fully custom domain) — `allowedHosts` is
 * per-source, not a shared platform host list, unlike the other adapters
 * built this session. This is set per candidate row in the actual registry
 * profile; the provider-level profile below documents the mechanism only. */
export function buildTeamtailorProviderProfile(careerDomain: string): TeamtailorProviderProfileRow {
  return {
    id: TEAMTAILOR_PROVIDER_ID,
    displayName: "Teamtailor",
    providerFamily: "teamtailor",
    mechanism: "rss",
    authClass: "none",
    endpointPattern: "https://{careerDomain}/jobs.rss",
    allowedHosts: careerDomain,
    evidenceUrl: TEAMTAILOR_EVIDENCE_URL,
    evidenceLeaseDays: TEAMTAILOR_EVIDENCE_LEASE_DAYS,
    visibilityFilter: "published",
    contentScope: "minimal",
    cadenceMinMinutes: 60,
    cadenceMaxMinutes: 1440,
    rateGuidance: "Public /jobs.rss GET is unauthenticated with no documented per-minute limit; this project's own 60-minute ATS cadence guard applies regardless.",
    robotsHandling: "observe",
    removalSemantics: "Deactivate within one successful reconciliation cycle once a posting disappears from a complete feed pull.",
    defaultComplianceState: "needs_review",
    defaultOperationalState: "candidate",
    notes: "The RSS <description> field carries the full HTML job description (verified live), not a summary — actively discarded by the adapter, matching fetchGreenhouse's minimal-content precedent. <link> is a real, direct canonical URL (no derivation needed, unlike SP-13's SmartRecruiters adapter). No total-count field exists; pagination uses the standard full-page heuristic. Each candidate row's endpoint/allowedHosts is per-career-domain — a custom domain requires durable provenance (this project's plan explicitly warns against suffix-guessing), not an assumption that any given domain is Teamtailor-powered.",
  };
}

export interface TeamtailorCareerSiteInput {
  careerDomain: string;
  companyName: string;
  nowIso: string;
  reviewDeadlineDays?: number;
}

export interface TeamtailorCandidateRow {
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

export function buildTeamtailorCandidateRow(input: TeamtailorCareerSiteInput): TeamtailorCandidateRow {
  const sourceId = `teamtailor:${input.careerDomain}`;
  const endpointUrl = teamtailorFeedUrl(input.careerDomain);
  const provenance = JSON.stringify({
    companyName: input.companyName,
    careerDomain: input.careerDomain,
    decidedAt: input.nowIso,
    provenance: "sp-14-curated-career-domain",
    complianceBasis: "documented public/no-auth /jobs.rss (support.teamtailor.com/en/articles/11171756-rss-feed-how-to-guide); minimal-content conditional decision per Source Perpetuity strategy operating posture",
  });
  return {
    sourceId,
    providerId: TEAMTAILOR_PROVIDER_ID,
    displayName: input.companyName,
    endpointUrl,
    companyToken: input.careerDomain,
    discoveryProvenance: provenance,
    complianceState: "conditional",
    operationalState: "candidate",
    reviewDeadline: computeReviewDeadline(input.nowIso, input.reviewDeadlineDays ?? 14),
    policyExpiry: computePolicyExpiry(input.nowIso, TEAMTAILOR_EVIDENCE_LEASE_DAYS),
    owner: "sp-14",
    lastDecision: "conditional minimal-content decision (documented public/no-auth /jobs.rss)",
    lastDecisionAt: input.nowIso,
    optOut: 0,
  };
}
