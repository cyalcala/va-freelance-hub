import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decideTypedTransition } from "../../packages/scraper/transition-plane";

describe("Shadow -> Canary Promotion Verification for 7 Workable PH Agencies", () => {
  test("validates and applies canary promotion for all 7 Workable agencies through constitutional triggers", async () => {
    const db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");

    // Load base migrations 0036 through 0047
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

    // Seed workable provider profile
    db.exec(`INSERT INTO provider_profiles (
      id, display_name, provider_family, mechanism, auth_class, allowed_hosts, evidence_url,
      evidence_hash, evidence_captured_at, visibility_filter, content_scope, cadence_min_minutes,
      cadence_max_minutes, robots_handling, removal_semantics, evidence_lease_days,
      default_compliance_state, default_operational_state, governance_revision
    ) VALUES 
    (
      'workable', 'Workable ATS', 'workable', 'ats_api', 'none', 'apply.workable.com',
      'https://apply.workable.com', '${"w".repeat(64)}',
      '2026-09-11T21:31:09.551Z', 'published', 'minimal', 1440, 2880, 'observe',
      'remove on disappearance', 180, 'conditional', 'candidate', 2
    )`);

    // Temporarily disable insert-time guards to seed initial state
    db.exec("DROP TRIGGER IF EXISTS source_admission_evidence_reject_identity_collision;");
    db.exec("DROP TRIGGER IF EXISTS source_admission_evidence_validate_insert;");
    db.exec("DROP TRIGGER IF EXISTS source_registry_initial_state_guard;");
    db.exec("DROP TRIGGER IF EXISTS source_registry_initial_state_is_dormant;");
    db.exec("DROP TRIGGER IF EXISTS source_registry_state_requires_transition_event;");
    db.exec("DROP TRIGGER IF EXISTS source_registry_evidenced_identity_collision;");
    db.exec("DROP TRIGGER IF EXISTS source_shadow_observations_observed_at_is_canonical_utc;");
    db.exec("DROP TRIGGER IF EXISTS source_shadow_observations_admission_insert;");

    const sourcesToTest = [
      {
        sourceId: "workable:coconutva",
        providerId: "workable",
        evidenceId: 17,
        sourceGovRev: 1,
        providerGovRev: 2,
        hash: "63982de44dca2df557858a00b52a9c189237c879a273d1f0992b459cb71d8c09",
        endpoint: "https://apply.workable.com/api/v1/widget/accounts/coconutva",
        policyExpiry: "2027-03-10T21:31:09.551Z",
        cap: 2,
      },
      {
        sourceId: "workable:crewbloom",
        providerId: "workable",
        evidenceId: 18,
        sourceGovRev: 1,
        providerGovRev: 2,
        hash: "2a9388de27003eac1f2922120e73f8cadac10489c82c1e70e033dc61ed54aad0",
        endpoint: "https://apply.workable.com/api/v1/widget/accounts/crewbloom",
        policyExpiry: "2027-03-10T21:31:09.551Z",
        cap: 2,
      },
      {
        sourceId: "workable:pearltalent",
        providerId: "workable",
        evidenceId: 19,
        sourceGovRev: 1,
        providerGovRev: 2,
        hash: "e065f35b8367b65e9915ee8738ae973701ca1cbddd5ac018535bdf9fcd803d17",
        endpoint: "https://apply.workable.com/api/v1/widget/accounts/pearltalent",
        policyExpiry: "2027-03-10T21:31:09.551Z",
        cap: 2,
      },
      {
        sourceId: "workable:hunt-st",
        providerId: "workable",
        evidenceId: 20,
        sourceGovRev: 4,
        providerGovRev: 2,
        hash: "0ef332b5695d59f2199b48f1c626aba271eb2f1e5bdb7e7a66d8ca16e05c1871",
        endpoint: "https://apply.workable.com/api/v1/widget/accounts/hunt-st",
        policyExpiry: "2027-03-10T21:31:09.551Z",
        cap: 2,
      },
      {
        sourceId: "workable:rocketams",
        providerId: "workable",
        evidenceId: 21,
        sourceGovRev: 4,
        providerGovRev: 2,
        hash: "57beefbbb23f365162e6b3cb92d4460b986dfc2e2193ff42c53873700f1cbea1",
        endpoint: "https://apply.workable.com/api/v1/widget/accounts/rocketams",
        policyExpiry: "2027-03-10T21:31:09.551Z",
        cap: 2,
      },
      {
        sourceId: "workable:hello-rache",
        providerId: "workable",
        evidenceId: 22,
        sourceGovRev: 1,
        providerGovRev: 2,
        hash: "3c797c4ecead6cd5c419ea02eaa9c8191deabd4cdba40dae7bcfd697422bfe51",
        endpoint: "https://apply.workable.com/api/v1/widget/accounts/hello-rache",
        policyExpiry: "2027-03-10T21:31:09.551Z",
        cap: 2,
      },
      {
        sourceId: "workable:pineapple-staffing",
        providerId: "workable",
        evidenceId: 23,
        sourceGovRev: 1,
        providerGovRev: 2,
        hash: "246332c2e503f9159a26e8444ccf0822a42ec5392644b73f40009daae59032cc",
        endpoint: "https://apply.workable.com/api/v1/widget/accounts/pineapple-staffing",
        policyExpiry: "2027-03-10T21:31:09.551Z",
        cap: 1,
      },
    ];

    function canonicalFingerprint(value: string): string {
      return Array.from(new TextEncoder().encode(value), (byte) => byte.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
    }

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
        now: "2026-09-11T21:31:09.551Z",
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
        '${s.endpoint}', 'sp23-shadow-7d-v1', '2026-09-11T21:31:09.551Z',
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

      // Seed 12 distinct days of healthy shadow observations
      const nowMs = Date.now();
      for (let day = 11; day >= 0; day--) {
        const obsTime = new Date(nowMs - day * 86_400_000).toISOString();
        db.exec(`INSERT INTO source_shadow_observations (
          id, source_id, provider_id, observed_at, dispatcher_version, outcome,
          request_count, bytes_received, item_count, plausible_items, duration_ms,
          evidence_hash, result_json, admission_evidence_id, shadow_entry_hash, dispatch_key
        ) VALUES (
          ${s.evidenceId * 100 + day}, '${s.sourceId}', '${s.providerId}', '${obsTime}', 'v1', 'HEALTHY_WITH_RESULTS',
          1, 1000, 5, 2, 200,
          '${"w".repeat(64)}', '{"status":"ok"}', ${s.evidenceId}, '${dummyShadowHash}', 'key-${s.sourceId}-${day}'
        )`);
      }
    }

    // Re-enable triggers by applying 0044
    const migrationSql = readFileSync("packages/db/migrations/0044_canary_to_active_graduation.sql", "utf-8");
    db.exec(migrationSql);

    const now = new Date().toISOString();

    for (const s of sourcesToTest) {
      // Query the qualifying observations from the view
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

      if (!decision.ok) {
        console.error("Decision failed for", s.sourceId, ":", decision.reason);
      }
      expect(decision.ok).toBe(true);
      if (!decision.ok) throw new Error(decision.reason);

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
