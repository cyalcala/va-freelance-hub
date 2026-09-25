import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decideTypedTransition } from "../../packages/scraper/transition-plane";

describe("Shadow -> Canary Promotion Verification for Remote.com and Wikimedia", () => {
  test("validates and applies canary promotion through all constitutional triggers", async () => {
    const db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");

    for (const m of [
      "0036_registry_foundation.sql",
      "0037_source_lifecycle_opt_out.sql",
      "0038_shadow_observations.sql",
      "0039_canary_transition_plane.sql",
      "0040_current_evidence_admission.sql",
      "0041_publication_ledger.sql",
      "0042_d1_like_glob_limit.sql",
      "0043_canary_promotion_trigger_alignment.sql",
      "0044_canary_to_active_graduation.sql",
      "0045_add_graduated_va_agencies_to_directory.sql",
      "0046_reconcile_breezy_onsite_and_unclear_eligibility.sql",
      "0047_deactivate_shadow_candidate_jobs_and_unclear_titles.sql",
    ]) {
      db.exec(readFileSync(join("packages/db/migrations", m), "utf-8"));
    }

    db.exec(`INSERT INTO provider_profiles (
      id, display_name, provider_family, mechanism, auth_class, allowed_hosts, evidence_url,
      evidence_hash, evidence_captured_at, visibility_filter, content_scope, cadence_min_minutes,
      cadence_max_minutes, robots_handling, removal_semantics, evidence_lease_days,
      default_compliance_state, default_operational_state, governance_revision
    ) VALUES 
    (
      'greenhouse', 'Greenhouse', 'greenhouse', 'ats_api', 'none', 'boards-api.greenhouse.io,boards.greenhouse.io',
      'https://docs.greenhouse.io/job-board.html', '${"b".repeat(64)}',
      '2026-09-08T10:54:51.251Z', 'published', 'minimal', 1440, 2880, 'observe',
      'remove on disappearance', 180, 'conditional', 'candidate', 3
    )`);

    db.exec("DROP TRIGGER IF EXISTS source_admission_evidence_reject_identity_collision;");
    db.exec("DROP TRIGGER IF EXISTS source_admission_evidence_validate_insert;");
    db.exec("DROP TRIGGER IF EXISTS source_registry_initial_state_guard;");
    db.exec("DROP TRIGGER IF EXISTS source_registry_initial_state_is_dormant;");
    db.exec("DROP TRIGGER IF EXISTS source_registry_state_requires_transition_event;");
    db.exec("DROP TRIGGER IF EXISTS source_registry_evidenced_identity_collision;");
    db.exec("DROP TRIGGER IF EXISTS source_shadow_observations_observed_at_is_canonical_utc;");
    db.exec("DROP TRIGGER IF EXISTS source_shadow_observations_admission_insert;");

    function canonicalFingerprint(value: string): string {
      return Array.from(new TextEncoder().encode(value), (byte) => byte.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
    }

    const sourcesToTest = [
      {
        sourceId: "greenhouse:remotecom",
        providerId: "greenhouse",
        evidenceId: 16,
        sourceGovRev: 1,
        providerGovRev: 3,
        hash: "c261cbd422f5aca8aba212c8ec715de626e66c443007e8e84757bd04586b6c11",
        endpoint: "https://boards-api.greenhouse.io/v1/boards/remotecom/jobs",
        policyExpiry: "2027-03-07T10:54:51.251Z",
        cap: 2,
      },
      {
        sourceId: "greenhouse:wikimedia",
        providerId: "greenhouse",
        evidenceId: 17,
        sourceGovRev: 1,
        providerGovRev: 3,
        hash: "d872291badf191f0ae4414fff85fe6181c37cbfa00d43e05fd765c8271c593b2",
        endpoint: "https://boards-api.greenhouse.io/v1/boards/wikimedia/jobs",
        policyExpiry: "2027-03-07T10:54:51.251Z",
        cap: 2,
      },
    ];

    for (const s of sourcesToTest) {
      const dummyShadowJson = JSON.stringify({
        version: "sp23-v2",
        sourceId: s.sourceId,
        fromCompliance: "conditional",
        fromOperational: "candidate",
        toCompliance: "conditional",
        toOperational: "shadow",
        optOut: false,
        cause: "requested_shadow_entry",
        now: "2026-09-11T13:48:16.889Z",
        policyExpiry: s.policyExpiry,
        evidenceHash: s.hash,
        observedShadowCount: null,
        requiredShadowCount: null,
        canaryMaxNewItemsPerTick: s.cap,
        proposedNewItems: null,
        admission: {
          admissionEvidenceId: s.evidenceId,
          sourceGovernanceRevision: s.sourceGovRev,
          providerGovernanceRevision: s.providerGovRev,
          observationPolicyVersion: "sp23-shadow-7d-v1",
          shadowEntryHash: null,
          qualifyingObservationIds: [],
        },
      });
      const dummyShadowHash = canonicalFingerprint(dummyShadowJson);

      db.exec(`INSERT INTO source_admission_evidence (
        id, source_id, provider_id, source_governance_revision, provider_governance_revision,
        endpoint_url, policy_version, captured_at, expires_at, adjudication_ref, packet_json, packet_sha256
      ) VALUES (
        ${s.evidenceId}, '${s.sourceId}', '${s.providerId}', ${s.sourceGovRev}, ${s.providerGovRev},
        '${s.endpoint}', 'sp23-shadow-7d-v1', '2026-09-11T13:47:51.631Z',
        '${s.policyExpiry}', 'ref-${s.sourceId}',
        '{"authorityActions":["recurrent_private_shadow","public_minimal_metadata_canary"]}',
        '${s.hash}'
      )`);

      db.exec(`INSERT INTO source_registry (
        source_id, provider_id, display_name, endpoint_url, compliance_state, operational_state,
        policy_expiry, canary_max_new_items_per_tick, last_transition_hash, governance_revision
      ) VALUES (
        '${s.sourceId}', '${s.providerId}', '${s.sourceId}', '${s.endpoint}',
        'conditional', 'shadow', '${s.policyExpiry}', ${s.cap}, '${dummyShadowHash}', ${s.sourceGovRev}
      )`);

      const nowMs = Date.now();
      for (let day = 14; day >= 0; day--) {
        const obsTime = new Date(nowMs - day * 86_400_000).toISOString();
        db.exec(`INSERT INTO source_shadow_observations (
          id, source_id, provider_id, observed_at, dispatcher_version, outcome,
          request_count, bytes_received, item_count, plausible_items, duration_ms,
          evidence_hash, result_json, admission_evidence_id, shadow_entry_hash, dispatch_key
        ) VALUES (
          ${s.evidenceId * 100 + day}, '${s.sourceId}', '${s.providerId}', '${obsTime}', 'v1', 'HEALTHY_WITH_RESULTS',
          1, 1000, 5, 2, 200,
          '${"c".repeat(64)}', '{"status":"ok"}', ${s.evidenceId}, '${dummyShadowHash}', 'key-${s.sourceId}-${day}'
        )`);
      }
    }

    const migrationSql = readFileSync("packages/db/migrations/0044_canary_to_active_graduation.sql", "utf-8");
    db.exec(migrationSql);

    const now = new Date().toISOString();

    for (const s of sourcesToTest) {
      const qualifyingRows = db.query(`
        SELECT id FROM source_admission_qualifying_observations 
        WHERE source_id = '${s.sourceId}' 
          AND julianday(observed_at) <= julianday('${now}') 
          AND julianday(observed_at) >= julianday('${now}') - 14 
        ORDER BY observed_at, id
      `).all() as { id: number }[];

      const qualifyingIds = qualifyingRows.map((r) => r.id);
      expect(qualifyingIds.length).toBeGreaterThanOrEqual(8);

      const registryRow = db.query(`SELECT last_transition_hash FROM source_registry WHERE source_id = '${s.sourceId}'`).get() as any;

      const decision = decideTypedTransition({
        sourceId: s.sourceId,
        from: { compliance: "conditional", operational: "shadow" },
        to: { compliance: "conditional", operational: "canary" },
        cause: "requested_promotion",
        now,
        policyExpiry: s.policyExpiry,
        evidenceHash: s.hash,
        observedShadowCount: qualifyingIds.length,
        requiredShadowCount: 8,
        canaryMaxNewItemsPerTick: s.cap,
        proposedNewItems: null,
        optOut: false,
        admission: {
          admissionEvidenceId: s.evidenceId,
          sourceGovernanceRevision: s.sourceGovRev,
          providerGovernanceRevision: s.providerGovRev,
          observationPolicyVersion: "sp23-shadow-7d-v1",
          shadowEntryHash: registryRow.last_transition_hash,
          qualifyingObservationIds: qualifyingIds,
        },
      });

      expect(decision.ok).toBe(true);

      const event = decision.event;
      db.exec(`
        INSERT INTO source_transition_events (
          transition_plane_version, source_id, from_compliance, from_operational,
          to_compliance, to_operational, cause, decided_at, evidence_hash,
          input_json, input_hash, decision_hash
        ) VALUES (
          '${event.input.version}', '${event.sourceId}', '${event.fromCompliance}', '${event.fromOperational}',
          '${event.toCompliance}', '${event.toOperational}', '${event.cause}', '${event.decidedAt}', '${event.evidenceHash}',
          '${event.inputJson}', '${event.inputHash}', '${event.decisionHash}'
        );
      `);

      const updated = db.query(`SELECT operational_state, last_decision FROM source_registry WHERE source_id = '${s.sourceId}'`).get() as any;
      expect(updated.operational_state).toBe("canary");
      expect(updated.last_decision).toBe("sp23:requested_promotion");
    }
  });
});
