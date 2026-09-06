import type { APIRoute } from "astro";
import { isAuthorized } from "@/lib/auth";
import { nowUtcIso } from "@/lib/time";
import {
  admitReviewedSourceToShadow,
  buildGreenhouseCandidateRow,
  buildGreenhouseProviderProfile,
  defaultRunProbe,
  sha256Hex,
  wrapD1Binding,
  GREENHOUSE_EVIDENCE_LEASE_DAYS,
  GREENHOUSE_PROVIDER_ID,
  type AdmissionDatabase,
  type TransitionGatewayDatabase,
} from "@va-hub/scraper";

export const prerender = false;
export const SOURCE_ADMIT_ALLOWLIST = ["greenhouse:grafanalabs"] as const;

type HandlerDependencies = {
  admit?: typeof admitReviewedSourceToShadow;
  runProbe?: typeof defaultRunProbe;
  wrapDb?: typeof wrapD1Binding;
  hash?: typeof sha256Hex;
  now?: () => string;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export function createSourceAdmitHandler(dependencies: HandlerDependencies = {}): APIRoute {
  const admit = dependencies.admit ?? admitReviewedSourceToShadow;
  const runProbe = dependencies.runProbe ?? defaultRunProbe;
  const wrapDb = dependencies.wrapDb ?? wrapD1Binding;
  const hash = dependencies.hash ?? sha256Hex;
  const nowFn = dependencies.now ?? nowUtcIso;

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
      return json(400, { error: "sourceId is not on the EX-02 allowlist", sourceId });
    }
    if (!env.DB?.prepare) return json(503, { error: "Cloudflare D1 binding is required" });

    const clock = nowFn();
    const profile = buildGreenhouseProviderProfile();
    const candidate = buildGreenhouseCandidateRow({
      token: "grafanalabs",
      companyName: "Grafana Labs",
      nowIso: clock,
    });
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
          id: GREENHOUSE_PROVIDER_ID,
          providerFamily: profile.providerFamily,
          mechanism: profile.mechanism,
          authClass: profile.authClass,
          endpointPattern: profile.endpointPattern,
          allowedHosts: profile.allowedHosts,
          evidenceUrl: profile.evidenceUrl,
          evidenceLeaseDays: GREENHOUSE_EVIDENCE_LEASE_DAYS,
          visibilityFilter: profile.visibilityFilter,
          contentScope: profile.contentScope,
          cadenceMinMinutes: profile.cadenceMinMinutes,
          cadenceMaxMinutes: profile.cadenceMaxMinutes,
          rateGuidance: profile.rateGuidance,
          robotsHandling: profile.robotsHandling,
        },
      });
      const now = probe.timestamp;
      const evidenceHash = await hash(`${profile.evidenceUrl}\n${now}`);
      const provider = {
        id: GREENHOUSE_PROVIDER_ID,
        providerFamily: profile.providerFamily,
        mechanism: profile.mechanism,
        authClass: profile.authClass,
        endpointPattern: profile.endpointPattern,
        allowedHosts: profile.allowedHosts,
        evidenceUrl: profile.evidenceUrl,
        evidenceHash,
        evidenceCapturedAt: now,
        visibilityFilter: profile.visibilityFilter,
        contentScope: profile.contentScope,
        cadenceMinMinutes: profile.cadenceMinMinutes,
        cadenceMaxMinutes: profile.cadenceMaxMinutes,
        rateGuidance: profile.rateGuidance,
        robotsHandling: profile.robotsHandling,
        removalSemantics: profile.removalSemantics,
        evidenceLeaseDays: GREENHOUSE_EVIDENCE_LEASE_DAYS,
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
        canaryMaxNewItemsPerTick: null,
        optOut: false,
        governanceRevision: 1,
        lastTransitionHash: null,
      };
      const db = wrapDb(env.DB) as TransitionGatewayDatabase & AdmissionDatabase;
      const result = await admit(db, {
        now,
        source,
        provider,
        probe,
        primaryEvidence: [{ url: provider.evidenceUrl!, contentSha256: evidenceHash, capturedAt: now }],
        adjudicationRef: "ex-02-owner-approved-approach-b-sp12-review-ready",
      });
      if (!result.ok) {
        return json(409, { outcome: "rejected", reason: result.reason, sourceId, probeOutcome: probe.diagnostic.outcome });
      }
      return json(200, { outcome: "shadow", sourceId: result.sourceId, published: 0, probeOutcome: probe.diagnostic.outcome });
    } catch (err) {
      return json(500, { outcome: "error", sourceId, reason: err instanceof Error ? err.message : String(err) });
    }
  };
}

export const POST = createSourceAdmitHandler();
