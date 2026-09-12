import type { APIRoute } from "astro";
import { isAuthorized } from "@/lib/auth";
import { nowUtcIso } from "@/lib/time";
import { fetchPrimaryEvidence } from "@/lib/primary-evidence";
import {
  admitReviewedSourceToShadow,
  buildGreenhouseCandidateRow,
  buildGreenhouseProviderProfile,
  buildRecruiteeCandidateRow,
  buildRecruiteeProviderProfile,
  buildTeamtailorCandidateRow,
  buildTeamtailorProviderProfile,
  defaultRunProbe,
  sha256Hex,
  wrapD1Binding,
  GREENHOUSE_EVIDENCE_LEASE_DAYS,
  GREENHOUSE_PROVIDER_ID,
  RECRUITEE_EVIDENCE_LEASE_DAYS,
  RECRUITEE_PROVIDER_ID,
  TEAMTAILOR_EVIDENCE_LEASE_DAYS,
  TEAMTAILOR_PROVIDER_ID,
  buildBreezyCandidateRow,
  buildBreezyProviderProfile,
  BREEZY_EVIDENCE_LEASE_DAYS,
  BREEZY_PROVIDER_ID,
  buildWorkableAtsCandidateRow,
  buildWorkableAtsProviderProfile,
  WORKABLE_EVIDENCE_LEASE_DAYS,
  WORKABLE_PROVIDER_ID,
  type AdmissionDatabase,
  type AdmissionProviderSnapshot,
  type TransitionGatewayDatabase,
} from "@va-hub/scraper";

export const prerender = false;
export const SOURCE_ADMIT_ALLOWLIST = [
  "greenhouse:grafanalabs",
  "recruitee:myjewellery",
  "teamtailor:career.teamtailor.com",
  "greenhouse:gitlab",
  "greenhouse:remotecom",
  "greenhouse:nearform",
  "greenhouse:ghost",
  "greenhouse:canonical",
  "greenhouse:wikimedia",
  "breezy:20four7va",
  "breezy:sourcefit",
  "breezy:time-etc",
  "breezy:vaaphilippines-recruitment",
  "breezy:yokly",
  "breezy:remote-craft",
  "breezy:value-virtual-assistants",
  "workable:coconutva",
  "workable:crewbloom",
  "workable:pearltalent",
  "workable:rocketams",
  "workable:hunt-st",
  "workable:hello-rache",
] as const;

type HandlerDependencies = {
  admit?: typeof admitReviewedSourceToShadow;
  runProbe?: typeof defaultRunProbe;
  wrapDb?: typeof wrapD1Binding;
  hash?: typeof sha256Hex;
  now?: () => string;
  fetchEvidence?: typeof fetchPrimaryEvidence;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function admitTarget(sourceId: string, clock: string) {
  if (sourceId.startsWith("greenhouse:")) {
    const token = sourceId.replace("greenhouse:", "");
    const names: Record<string, string> = {
      grafanalabs: "Grafana Labs",
      gitlab: "GitLab",
      remotecom: "Remote.com",
      nearform: "Nearform",
      ghost: "Ghost Foundation",
      canonical: "Canonical",
      wikimedia: "Wikimedia Foundation",
    };
    const companyName = names[token] ?? token;
    const profile = buildGreenhouseProviderProfile();
    const candidate = buildGreenhouseCandidateRow({
      token,
      companyName,
      nowIso: clock,
    });
    return {
      profile,
      candidate,
      providerId: GREENHOUSE_PROVIDER_ID,
      leaseDays: GREENHOUSE_EVIDENCE_LEASE_DAYS,
      adjudicationRef: token === "grafanalabs"
        ? "ex-02-owner-approved-approach-b-sp12-review-ready"
        : `ex-08-greenhouse-${token}-tier-a-fast-track`,
    };
  }
  if (sourceId === "recruitee:myjewellery") {
    const profile = buildRecruiteeProviderProfile("myjewellery");
    const candidate = buildRecruiteeCandidateRow({
      companySubdomain: "myjewellery",
      companyName: "My Jewellery",
      nowIso: clock,
    });
    return {
      profile,
      candidate,
      providerId: RECRUITEE_PROVIDER_ID,
      leaseDays: RECRUITEE_EVIDENCE_LEASE_DAYS,
      adjudicationRef: "ex-04-owner-approved-approach-b-sp15-review-ready",
    };
  }
  if (sourceId.startsWith("breezy:")) {
    const token = sourceId.replace("breezy:", "");
    const names: Record<string, string> = {
      "20four7va": "20Four7VA",
      "sourcefit": "Sourcefit",
      "time-etc": "Time Etc",
      "vaaphilippines-recruitment": "VAA Philippines",
      "yokly": "Yokly",
      "remote-craft": "Remote Craft",
      "value-virtual-assistants": "VALUE Virtual Assistants",
    };
    const companyName = names[token] ?? token;
    const profile = buildBreezyProviderProfile(token);
    const candidate = buildBreezyCandidateRow({
      token,
      companyName,
      nowIso: clock,
    });
    return {
      profile,
      candidate,
      providerId: BREEZY_PROVIDER_ID,
      leaseDays: BREEZY_EVIDENCE_LEASE_DAYS,
      adjudicationRef: `ex-ph-agency-breezy-${token}-tier-a-fast-track`,
    };
  }
  if (sourceId.startsWith("workable:")) {
    const token = sourceId.replace("workable:", "");
    const names: Record<string, string> = {
      "coconutva": "Coconut VA",
      "crewbloom": "CrewBloom",
      "pearltalent": "Pearl Talent",
      "rocketams": "RocketAMS",
      "hunt-st": "Hunt St",
      "hello-rache": "Hello Rache",
    };
    const companyName = names[token] ?? token;
    const profile = buildWorkableAtsProviderProfile();
    const candidate = buildWorkableAtsCandidateRow({
      token,
      companyName,
      nowIso: clock,
    });
    return {
      profile,
      candidate,
      providerId: WORKABLE_PROVIDER_ID,
      leaseDays: WORKABLE_EVIDENCE_LEASE_DAYS,
      adjudicationRef: `ex-ph-agency-workable-${token}-tier-a-fast-track`,
    };
  }
  const profile = buildTeamtailorProviderProfile("career.teamtailor.com");
  const candidate = buildTeamtailorCandidateRow({
    careerDomain: "career.teamtailor.com",
    companyName: "Teamtailor",
    nowIso: clock,
  });
  return {
    profile,
    candidate,
    providerId: TEAMTAILOR_PROVIDER_ID,
    leaseDays: TEAMTAILOR_EVIDENCE_LEASE_DAYS,
    adjudicationRef: "ex-05-owner-approved-approach-b-sp14-review-ready",
  };
}

export function createSourceAdmitHandler(dependencies: HandlerDependencies = {}): APIRoute {
  const admit = dependencies.admit ?? admitReviewedSourceToShadow;
  const runProbe = dependencies.runProbe ?? defaultRunProbe;
  const wrapDb = dependencies.wrapDb ?? wrapD1Binding;
  const hash = dependencies.hash ?? sha256Hex;
  const nowFn = dependencies.now ?? nowUtcIso;
  const fetchEvidence = dependencies.fetchEvidence ?? fetchPrimaryEvidence;

  return async ({ request, locals }) => {
    const env = (locals.runtime?.env ?? (import.meta as any).env) as any;
    if (!isAuthorized(request, env.PROXY_SECRET || env.CRON_SECRET)) {
      return json(401, { error: "Unauthorized" });
    }
    let sourceId = "";
    try {
      const body = await request.json() as { sourceId?: string };
      sourceId = typeof body.sourceId === "string" ? body.sourceId : "";
    } catch {
      return json(400, { error: "JSON body with sourceId is required" });
    }
    if (!(SOURCE_ADMIT_ALLOWLIST as readonly string[]).includes(sourceId)) {
      return json(400, { error: "sourceId is not on the admission allowlist", sourceId });
    }
    if (!env.DB?.prepare) return json(503, { error: "Cloudflare D1 binding is required" });

    const clock = nowFn();
    const { profile, candidate, providerId, leaseDays, adjudicationRef } = admitTarget(sourceId, clock);
    try {
      const probe = await runProbe({
        sourceId: candidate.sourceId,
        providerId: candidate.providerId,
        displayName: candidate.displayName,
        endpointUrl: candidate.endpointUrl,
        companyToken: candidate.companyToken,
        discoveryProvenance: candidate.discoveryProvenance,
        complianceState: candidate.complianceState,
        operationalState: "candidate",
        reviewDeadline: candidate.reviewDeadline,
        policyExpiry: candidate.policyExpiry,
        provider: {
          id: providerId,
          providerFamily: profile.providerFamily,
          mechanism: profile.mechanism,
          authClass: profile.authClass,
          endpointPattern: profile.endpointPattern,
          allowedHosts: profile.allowedHosts,
          evidenceUrl: profile.evidenceUrl,
          evidenceLeaseDays: leaseDays,
          visibilityFilter: profile.visibilityFilter,
          contentScope: profile.contentScope,
          cadenceMinMinutes: profile.cadenceMinMinutes,
          cadenceMaxMinutes: profile.cadenceMaxMinutes,
          rateGuidance: profile.rateGuidance,
          robotsHandling: profile.robotsHandling,
        },
      });
      const now = probe.timestamp;
      const db = wrapDb(env.DB) as TransitionGatewayDatabase & AdmissionDatabase;
      let evidenceHash = "";
      let evidenceCapturedAt = now;
      try {
        const existingProvider = await db.prepare(
          `SELECT id, evidence_url AS evidenceUrl, evidence_hash AS evidenceHash,
            evidence_captured_at AS evidenceCapturedAt, evidence_lease_days AS evidenceLeaseDays
          FROM provider_profiles WHERE id=?`
        ).bind(providerId).first<AdmissionProviderSnapshot>();

        const existingLease = existingProvider?.evidenceCapturedAt && existingProvider.evidenceLeaseDays
          ? Date.parse(existingProvider.evidenceCapturedAt) + existingProvider.evidenceLeaseDays * 86_400_000
          : 0;

        if (existingProvider && existingProvider.evidenceUrl === profile.evidenceUrl && existingProvider.evidenceHash && existingProvider.evidenceCapturedAt && existingLease > Date.parse(now)) {
          evidenceHash = existingProvider.evidenceHash;
          evidenceCapturedAt = existingProvider.evidenceCapturedAt;
        }
      } catch {
        // DB read error or unmocked in unit test - fall through to fresh fetch
      }

      if (!evidenceHash) {
        // Capture actual reviewed primary-document content. A URL plus the clock
        // is not a content fingerprint and cannot support replayable evidence.
        evidenceHash = await hash(await fetchEvidence(profile.evidenceUrl));
      }
      const provider = {
        id: providerId,
        providerFamily: profile.providerFamily,
        mechanism: profile.mechanism,
        authClass: profile.authClass,
        endpointPattern: profile.endpointPattern,
        allowedHosts: profile.allowedHosts,
        evidenceUrl: profile.evidenceUrl,
        evidenceHash,
        evidenceCapturedAt,
        visibilityFilter: profile.visibilityFilter,
        contentScope: profile.contentScope,
        cadenceMinMinutes: profile.cadenceMinMinutes,
        cadenceMaxMinutes: profile.cadenceMaxMinutes,
        rateGuidance: profile.rateGuidance,
        robotsHandling: profile.robotsHandling,
        removalSemantics: profile.removalSemantics,
        evidenceLeaseDays: leaseDays,
        governanceRevision: 1,
      };
      const source = {
        sourceId: candidate.sourceId,
        providerId: candidate.providerId,
        displayName: candidate.displayName,
        endpointUrl: candidate.endpointUrl,
        companyToken: candidate.companyToken,
        discoveryProvenance: candidate.discoveryProvenance,
        complianceState: candidate.complianceState,
        operationalState: "candidate" as const,
        reviewDeadline: candidate.reviewDeadline,
        policyExpiry: candidate.policyExpiry,
        canaryMaxNewItemsPerTick: candidate.canaryMaxNewItemsPerTick ?? 1,
        optOut: false,
        governanceRevision: 1,
        lastTransitionHash: null,
      };
      const result = await admit(db, {
        now,
        source,
        provider,
        probe,
        primaryEvidence: [{ url: provider.evidenceUrl!, contentSha256: evidenceHash, capturedAt: evidenceCapturedAt }],
        adjudicationRef,
      });
      if (!result.ok) {
        return json(409, {
          outcome: "rejected",
          reason: result.reason,
          sourceId,
          probeOutcome: probe.diagnostic.outcome,
          stopReason: probe.stopReason,
          probes: probe.diagnostic.probes,
        });
      }
      return json(200, { outcome: "shadow", sourceId: result.sourceId, published: 0, probeOutcome: probe.diagnostic.outcome });
    } catch (err) {
      return json(500, { outcome: "error", sourceId, reason: err instanceof Error ? err.message : String(err) });
    }
  };
}

export const POST = createSourceAdmitHandler();
