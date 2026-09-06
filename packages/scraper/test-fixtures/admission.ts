import { buildAdmissionEvidence, type AdmissionProviderSnapshot, type AdmissionSourceSnapshot, type CurrentAdmissionEvidenceResult } from "../admission-evidence";
import { SHADOW_VERSION, type CandidateShadowResult } from "../candidate-shadow";
import type { AdmissionObservation } from "../transition-gateway";
import { sha256Hex } from "../contentHash";

export const ADMISSION_TEST_NOW = "2026-09-15T00:00:00.000Z";

export async function admissionFixture(): Promise<Extract<CurrentAdmissionEvidenceResult, { ok: true }>> {
  const source: AdmissionSourceSnapshot = {
    sourceId: "greenhouse:test", providerId: "greenhouse", displayName: "Test company",
    endpointUrl: "https://boards-api.greenhouse.io/v1/boards/test/jobs", companyToken: "test",
    discoveryProvenance: "https://example.com/careers", complianceState: "conditional", operationalState: "shadow",
    reviewDeadline: "2026-09-20T00:00:00.000Z", policyExpiry: "2026-10-01T00:00:00.000Z",
    canaryMaxNewItemsPerTick: 3, optOut: false, governanceRevision: 1, lastTransitionHash: "ABCD1234",
  };
  const provider: AdmissionProviderSnapshot = {
    id: "greenhouse", providerFamily: "greenhouse", mechanism: "ats_api", authClass: "none",
    endpointPattern: "https://boards-api.greenhouse.io/v1/boards/{token}/jobs", allowedHosts: "boards-api.greenhouse.io",
    evidenceUrl: "https://developers.greenhouse.io/job-board.html", evidenceHash: "a".repeat(64),
    evidenceCapturedAt: "2026-09-01T00:00:00.000Z", visibilityFilter: "published", contentScope: "minimal",
    cadenceMinMinutes: 1440, cadenceMaxMinutes: 2880, rateGuidance: "At most daily for this shadow",
    robotsHandling: "enforce", removalSemantics: "Remove on disappearance or request", evidenceLeaseDays: 30,
    governanceRevision: 1,
  };
  const probe: CandidateShadowResult = {
    version: SHADOW_VERSION, timestamp: "2026-09-07T00:00:00.000Z", sourceId: source.sourceId, providerId: source.providerId,
    displayName: source.displayName,
    endpoint: { url: source.endpointUrl, isHttps: true, host: "boards-api.greenhouse.io", allowedHosts: provider.allowedHosts, hostValid: true },
    auth: { class: "none", supported: true }, visibility: { filter: "published", isPublic: true, ambiguous: false },
    provenance: { discoveryProvenance: source.discoveryProvenance, evidenceUrl: provider.evidenceUrl, providerFamily: provider.providerFamily, mechanism: provider.mechanism },
    cadence: { minMinutes: 1440, maxMinutes: 2880, rateGuidance: provider.rateGuidance },
    robots: { checked: true, verdict: "allowed", wouldBlock: false, evidence: "allow", fromCache: false },
    fetch: { attempted: true, status: 200, latencyMs: 1, bytesReceived: 100, contentType: "application/json" },
    parse: { attempted: true, schemaHealth: "ok", itemCount: 1 },
    sampleFunnel: { bytesReceived: 100, parsedItems: 1, plausibleItems: 1, truncated: false, budgetExceeded: false },
    diagnostic: { outcome: "HEALTHY_WITH_RESULTS", probes: [], requestCount: 2, bytesReceived: 100, durationMs: 2, mutations: 0, shadowMode: true },
  };
  const built = await buildAdmissionEvidence({
    source, provider, probe,
    primaryEvidence: [{ url: provider.evidenceUrl!, contentSha256: provider.evidenceHash!, capturedAt: provider.evidenceCapturedAt! }],
    authorityActions: ["recurrent_private_shadow", "public_minimal_metadata_canary"],
    adjudicationRef: "fixture-only-independent-review", capturedAt: probe.timestamp, expiresAt: source.policyExpiry!,
  });
  if (!built.ok) throw new Error(built.reason);
  return { ok: true, source, provider, packet: built.packet, evidence: {
    id: 1, sourceId: source.sourceId, providerId: provider.id, sourceGovernanceRevision: 1, providerGovernanceRevision: 1,
    endpointUrl: source.endpointUrl, policyVersion: built.packet.policyVersion, capturedAt: built.packet.capturedAt,
    expiresAt: built.packet.expiresAt, adjudicationRef: built.packet.adjudicationRef,
    packetJson: built.packetJson, packetSha256: built.packetSha256,
  } };
}

export async function liveAdmissionFixture(): Promise<Awaited<ReturnType<typeof admissionFixture>>> {
  const capturedAt = new Date().toISOString();
  const base = await admissionFixture();
  const source = {
    ...base.source,
    operationalState: "candidate" as const,
    reviewDeadline: new Date(Date.parse(capturedAt) + 21 * 86_400_000).toISOString(),
    policyExpiry: new Date(Date.now() + 20 * 86_400_000).toISOString(),
  };
  const provider = {
    ...base.provider,
    evidenceCapturedAt: capturedAt,
  };
  const built = await buildAdmissionEvidence({
    source,
    provider,
    probe: { ...base.packet.probe, timestamp: capturedAt },
    primaryEvidence: [{
      url: provider.evidenceUrl!,
      contentSha256: provider.evidenceHash!,
      capturedAt: provider.evidenceCapturedAt!,
    }],
    authorityActions: ["recurrent_private_shadow", "public_minimal_metadata_canary"],
    adjudicationRef: "fixture-only-independent-review",
    capturedAt,
    expiresAt: source.policyExpiry!,
  });
  if (!built.ok) throw new Error(built.reason);
  return {
    ok: true,
    source,
    provider,
    packet: built.packet,
    evidence: {
      id: 1,
      sourceId: source.sourceId,
      providerId: provider.id,
      sourceGovernanceRevision: source.governanceRevision,
      providerGovernanceRevision: provider.governanceRevision,
      endpointUrl: source.endpointUrl,
      policyVersion: built.packet.policyVersion,
      capturedAt: built.packet.capturedAt,
      expiresAt: built.packet.expiresAt,
      adjudicationRef: built.packet.adjudicationRef,
      packetJson: built.packetJson,
      packetSha256: built.packetSha256,
    },
  };
}

export async function observationFixture(current: Awaited<ReturnType<typeof admissionFixture>>, days = 8): Promise<AdmissionObservation[]> {
  return Promise.all(Array.from({ length: days }, async (_, index) => {
    const observedAt = new Date(Date.parse(current.packet.capturedAt) + 3_600_000 + index * 86_400_000).toISOString();
    const dispatchKey = `fixture-dispatch-${index}`;
    const resultJson = JSON.stringify({ ...current.packet.probe, timestamp: observedAt, admissionBinding: {
      evidenceId: current.evidence.id, shadowEntryHash: current.source.lastTransitionHash, dispatchKey,
    } });
    return {
      id: index + 1, sourceId: current.source.sourceId, providerId: current.provider.id,
      observedAt, outcome: "HEALTHY_WITH_RESULTS", plausibleItems: 1, requestCount: 2, bytesReceived: 100, itemCount: 1,
      evidenceHash: await sha256Hex(resultJson), resultJson, admissionEvidenceId: current.evidence.id,
      shadowEntryHash: current.source.lastTransitionHash!, dispatchKey,
    };
  }));
}
