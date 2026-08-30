/**
 * SP-10 — Workable global XML feed canary (pure helpers, no I/O).
 *
 * Unlike every per-company adapter built earlier in this batch
 * (Lever/Greenhouse/SmartRecruiters/Teamtailor/Recruitee), Workable's feed
 * is ONE global, multi-employer identity, not one row per curated company —
 * SP-09's decision was about the feed itself, not a single employer's
 * board. `source_id` is therefore the single durable identity
 * `workable:global-feed`, matching the plan's "Workable global XML
 * feasibility" framing.
 *
 * Reuses SP-12's shared `decidePromotionToShadow` guard, exactly like
 * every other unit this session. Mechanism is `syndication_feed` (a
 * `provider_profiles.mechanism` value distinct from the per-company
 * `ats_api` used by Lever/Greenhouse/Recruitee — this is a bulk feed, not
 * a per-token API), matching the DB's own CHECK constraint (verified
 * directly against packages/db/migrations/0036_registry_foundation.sql —
 * `content_scope` only allows 'minimal'/'full'/'metadata_only'; this
 * profile uses the DB-valid 'minimal' directly, unlike an earlier unit
 * this session whose TS type used a non-DB-valid extended string).
 */

import { computeReviewDeadline, computePolicyExpiry } from "./source-lifecycle";
import { WORKABLE_FEED_URL } from "./workable";

export const WORKABLE_PROVIDER_ID = "workable";
export const WORKABLE_SOURCE_ID = "workable:global-feed";
export const WORKABLE_EVIDENCE_URL = "https://help.workable.com/hc/en-us/articles/4420464031767-Utilizing-the-XML-Job-Feed";
export const WORKABLE_EVIDENCE_LEASE_DAYS = 180;

export interface WorkableProviderProfileRow {
  id: string;
  displayName: string;
  providerFamily: string;
  mechanism: "syndication_feed";
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

export function buildWorkableProviderProfile(): WorkableProviderProfileRow {
  return {
    id: WORKABLE_PROVIDER_ID,
    displayName: "Workable (global XML feed)",
    providerFamily: "workable",
    mechanism: "syndication_feed",
    authClass: "none",
    endpointPattern: WORKABLE_FEED_URL,
    // hostOf() (packages/scraper/prospector.ts) strips a leading "www."
    // from the endpoint's host before comparing against allowedHosts, so
    // this must be the bare apex, not "www.workable.com" — verified live
    // (an initial "www.workable.com" value produced a false POLICY_BLOCKED
    // host mismatch before this fix).
    allowedHosts: "workable.com",
    evidenceUrl: WORKABLE_EVIDENCE_URL,
    evidenceLeaseDays: WORKABLE_EVIDENCE_LEASE_DAYS,
    visibilityFilter: "public",
    contentScope: "minimal",
    cadenceMinMinutes: 60,
    cadenceMaxMinutes: 60,
    rateGuidance: "Documented hourly update cadence; provider guidance states more frequent consumption is unnecessary. SP-09's own decision (GITHUB_ACTION_PREPROCESSING) means this must run outside the shared 10-minute Worker scrape tick, on its own hourly schedule, in a dedicated job.",
    robotsHandling: "observe",
    removalSemantics: "A posting absent from a complete hourly fetch is treated as removed within one cycle (the feed carries no explicit removal signal beyond disappearing).",
    defaultComplianceState: "needs_review",
    defaultOperationalState: "candidate",
    notes: "One global, multi-employer feed (not one row per company, unlike Lever/Greenhouse/Recruitee/Teamtailor). SP-09 (TERMINAL — KEEP) measured 14.66-44.41 MiB / 3,741-11,603 raw entries across two live probes, both requiring GITHUB_ACTION_PREPROCESSING (over the 5 MiB / 2,000-item single-source share of the shared Worker tick budget). packages/scraper/workable.ts's filterPlausibleCandidates (remote=true OR country=PH) is a coarse pre-filter only, verified live to cut the real feed by 82.5% (3,741 -> 654) — never a substitute for this project's own geoGate eligibility decision, which still runs on every surviving candidate. description (full HTML) is actively excluded from the normalized output.",
  };
}

export interface WorkableCandidateRow {
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
  owner: string;
  lastDecision: string;
  lastDecisionAt: string;
  optOut: 0;
}

export function buildWorkableCandidateRow(input: { nowIso: string; reviewDeadlineDays?: number }): WorkableCandidateRow {
  const provenance = JSON.stringify({
    decidedAt: input.nowIso,
    provenance: "sp-10-global-feed",
    complianceBasis: "documented public/no-auth global XML feed (help.workable.com feed docs); SP-09 GITHUB_ACTION_PREPROCESSING decision; minimal-content conditional decision per Source Perpetuity strategy operating posture",
  });
  return {
    sourceId: WORKABLE_SOURCE_ID,
    providerId: WORKABLE_PROVIDER_ID,
    displayName: "Workable (global XML feed)",
    endpointUrl: WORKABLE_FEED_URL,
    companyToken: null,
    discoveryProvenance: provenance,
    complianceState: "conditional",
    operationalState: "candidate",
    reviewDeadline: computeReviewDeadline(input.nowIso, input.reviewDeadlineDays ?? 14),
    policyExpiry: computePolicyExpiry(input.nowIso, WORKABLE_EVIDENCE_LEASE_DAYS),
    owner: "sp-10",
    lastDecision: "conditional minimal-content decision (documented public/no-auth global XML feed, GITHUB_ACTION_PREPROCESSING runtime)",
    lastDecisionAt: input.nowIso,
    optOut: 0,
  };
}
