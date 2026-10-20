import type { Database } from "bun:sqlite";
import { admissionFixture } from "../../../../packages/scraper/test-fixtures/admission";
import { buildAdmissionEvidence, type AdmissionSourceSnapshot, type AdmissionProviderSnapshot } from "../../../../packages/scraper/admission-evidence";

/** Synthetic initial evidence before installation of immutable admission guards.
 * Packets are built and validated by production code; every migration statement
 * and trigger is then installed unchanged before the real route executes.
 */
export async function seedNativeWorkableAdmissions(sqlite: Database, now: string, expiresAt?: string) {
  const base = await admissionFixture();
  sqlite.query("UPDATE source_registry SET review_deadline=? WHERE provider_id='native-workable'").run(new Date(Date.parse(now) + 14 * 86_400_000).toISOString());
  sqlite.query(`UPDATE provider_profiles SET endpoint_pattern='https://apply.workable.com/api/v1/widget/accounts/{token}',
    allowed_hosts='apply.workable.com',evidence_url='https://example.test/workable-public-contract',evidence_hash=?,
    evidence_captured_at=?,visibility_filter='published',content_scope='minimal',cadence_min_minutes=60,cadence_max_minutes=60,
    rate_guidance='One request per tenant per hour',robots_handling='enforce',removal_semantics='Remove on disappearance or request',
    evidence_lease_days=180 WHERE id='native-workable'`).run("a".repeat(64), now);
  const provider = sqlite.query(`SELECT id,provider_family AS providerFamily,mechanism,auth_class AS authClass,
    endpoint_pattern AS endpointPattern,allowed_hosts AS allowedHosts,evidence_url AS evidenceUrl,evidence_hash AS evidenceHash,
    evidence_captured_at AS evidenceCapturedAt,visibility_filter AS visibilityFilter,content_scope AS contentScope,
    cadence_min_minutes AS cadenceMinMinutes,cadence_max_minutes AS cadenceMaxMinutes,rate_guidance AS rateGuidance,
    robots_handling AS robotsHandling,removal_semantics AS removalSemantics,evidence_lease_days AS evidenceLeaseDays,
    governance_revision AS governanceRevision FROM provider_profiles WHERE id='native-workable'`).get() as AdmissionProviderSnapshot;
  const sources = sqlite.query(`SELECT source_id AS sourceId,provider_id AS providerId,display_name AS displayName,
    endpoint_url AS endpointUrl,company_token AS companyToken,discovery_provenance AS discoveryProvenance,
    compliance_state AS complianceState,operational_state AS operationalState,review_deadline AS reviewDeadline,
    policy_expiry AS policyExpiry,canary_max_new_items_per_tick AS canaryMaxNewItemsPerTick,opt_out AS optOut,
    governance_revision AS governanceRevision,last_transition_hash AS lastTransitionHash FROM source_registry
    WHERE provider_id='native-workable' AND compliance_state='allowed'`).all() as AdmissionSourceSnapshot[];
  for (const raw of sources) {
    const source = { ...raw, optOut: Boolean(raw.optOut) };
    const probe = { ...base.packet.probe, timestamp: now, sourceId: source.sourceId, providerId: provider.id,
      displayName: source.displayName,
      endpoint: { ...base.packet.probe.endpoint, url: source.endpointUrl, host: "apply.workable.com", allowedHosts: provider.allowedHosts },
      provenance: { discoveryProvenance: source.discoveryProvenance, evidenceUrl: provider.evidenceUrl,
        providerFamily: provider.providerFamily, mechanism: provider.mechanism },
      cadence: { minMinutes: 60, maxMinutes: 60, rateGuidance: provider.rateGuidance } };
    const built = await buildAdmissionEvidence({ source, provider, probe,
      primaryEvidence: [{ url: provider.evidenceUrl!, contentSha256: provider.evidenceHash!, capturedAt: now }],
      authorityActions: ["recurrent_private_shadow", "public_minimal_metadata_canary"],
      adjudicationRef: "synthetic-native-admission-proof-only", capturedAt: now, expiresAt: expiresAt ?? source.policyExpiry! });
    if (!built.ok) throw new Error(`Synthetic admission rejected: ${built.reason}`);
    sqlite.query(`INSERT INTO source_admission_evidence(source_id,provider_id,source_governance_revision,provider_governance_revision,
      endpoint_url,policy_version,captured_at,expires_at,adjudication_ref,packet_json,packet_sha256) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
      source.sourceId, provider.id, source.governanceRevision, provider.governanceRevision, source.endpointUrl,
      built.packet.policyVersion, now, built.packet.expiresAt, built.packet.adjudicationRef, built.packetJson, built.packetSha256);
  }
}
