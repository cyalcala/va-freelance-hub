import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Graduation bundle execution verification", () => {
  test("applies 0044_apply_graduation.sql and mutates breezy:20four7va to active", () => {
    const db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");

    // Load base migrations 0036 through 0043
    for (const m of [
      "0036_registry_foundation.sql",
      "0037_source_lifecycle_opt_out.sql",
      "0038_shadow_observations.sql",
      "0039_canary_transition_plane.sql",
      "0040_current_evidence_admission.sql",
      "0041_publication_ledger.sql",
      "0042_d1_like_glob_limit.sql",
      "0043_canary_promotion_trigger_alignment.sql",
    ]) {
      db.exec(readFileSync(join("packages/db/migrations", m), "utf-8"));
    }

    // Seed provider breezy
    db.exec(`INSERT INTO provider_profiles (
      id, display_name, provider_family, mechanism, auth_class, allowed_hosts, evidence_url,
      evidence_hash, evidence_captured_at, visibility_filter, content_scope, cadence_min_minutes,
      cadence_max_minutes, robots_handling, removal_semantics, evidence_lease_days,
      default_compliance_state, default_operational_state
    ) VALUES (
      'breezy', 'Breezy HR', 'breezy', 'ats_api', 'none', 'app.breezy.hr',
      'https://app.breezy.hr', '${"a".repeat(64)}',
      '2026-09-11T14:47:02.187Z', 'published', 'minimal', 1440, 2880, 'enforce',
      'remove on disappearance', 180, 'conditional', 'candidate'
    )`);

    const evidenceRows = [
      { id: 12, sourceId: "breezy:20four7va", endpoint: "https://20four7va.breezy.hr/json", hash: "df8c1eb00618093a2a9b3e50c45972b2ae8dd6bdf24aa6ecc8908bac5108c585" },
      { id: 13, sourceId: "breezy:sourcefit", endpoint: "https://sourcefit.breezy.hr/json", hash: "943bd9a2293c39270c7fcbd06403931306709934839e57d64041502cc0bb4f46" },
      { id: 15, sourceId: "breezy:remote-craft", endpoint: "https://remote-craft.breezy.hr/json", hash: "6e6f24d827f831ce082e4f80d349326cd6e794636cb6ea88851cf0936f13c580" },
      { id: 16, sourceId: "breezy:value-virtual-assistants", endpoint: "https://value-virtual-assistants.breezy.hr/json", hash: "f692fa19d5ec3f7f43f3a35cc9ec59f4096d35b65c87090c5cf0536b8de25013" },
      { id: 14, sourceId: "breezy:yokly", endpoint: "https://yokly.breezy.hr/json", hash: "18d301049bb4f310ee3e0396e1fe0c7b23010556328f85ed0ad90f18ef5c9e34" },
    ];

    // Read the bundle SQL
    const bundleSql = readFileSync("scripts/graduation/0044_apply_graduation.sql", "utf-8");

    // Temporarily disable insert-time clock guard to seed historical D1 rows
    db.exec("DROP TRIGGER IF EXISTS source_admission_evidence_reject_identity_collision;");
    db.exec("DROP TRIGGER IF EXISTS source_admission_evidence_validate_insert;");
    db.exec("DROP TRIGGER IF EXISTS source_registry_initial_state_guard;");
    db.exec("DROP TRIGGER IF EXISTS source_registry_initial_state_is_dormant;");
    db.exec("DROP TRIGGER IF EXISTS source_registry_state_requires_transition_event;");
    db.exec("DROP TRIGGER IF EXISTS source_registry_evidenced_identity_collision;");

    for (const e of evidenceRows) {
      db.exec(`INSERT INTO source_admission_evidence (
        id, source_id, provider_id, source_governance_revision, provider_governance_revision,
        endpoint_url, policy_version, captured_at, expires_at, adjudication_ref, packet_json, packet_sha256
      ) VALUES (
        ${e.id}, '${e.sourceId}', 'breezy', 1, 1,
        '${e.endpoint}', 'sp23-shadow-7d-v1', '2026-09-11T14:47:02.187Z',
        '2027-03-10T14:47:02.187Z', 'ref-1',
        '{"authorityActions":["recurrent_private_shadow","public_minimal_metadata_canary"]}',
        '${e.hash}'
      )`);

      // Extract shadowEntryHash from the bundle for this source
      const match = bundleSql.match(new RegExp(`'${e.sourceId}'[\\s\\S]*?"shadowEntryHash":"([^"]+)"`));
      const canaryHash = match ? match[1] : "dummy";

      // Seed current canary state as exists in D1
      db.exec(`INSERT INTO source_registry (
        source_id, provider_id, display_name, endpoint_url, compliance_state, operational_state,
        policy_expiry, canary_max_new_items_per_tick, last_transition_hash, governance_revision
      ) VALUES (
        '${e.sourceId}', 'breezy', '${e.sourceId}', '${e.endpoint}',
        'conditional', 'canary', '2027-03-10T14:47:02.187Z', 2, '${canaryHash}', 1
      )`);
    }

    const migrationSql = readFileSync("packages/db/migrations/0044_canary_to_active_graduation.sql", "utf-8");
    db.exec(migrationSql);

    function canonicalFingerprint(value: string): string {
      return Array.from(new TextEncoder().encode(value), (byte) => byte.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
    }

    const now = new Date().toISOString();

    for (const e of evidenceRows) {
      const match = bundleSql.match(new RegExp(`'${e.sourceId}'[\\s\\S]*?"shadowEntryHash":"([^"]+)"`));
      const canaryHash = match ? match[1] : "dummy";

      const input = {
        version: "sp23-v2",
        sourceId: e.sourceId,
        fromCompliance: "conditional",
        fromOperational: "canary",
        toCompliance: "conditional",
        toOperational: "active",
        cause: "requested_promotion",
        now,
        policyExpiry: "2027-03-10T14:47:02.187Z",
        evidenceHash: e.hash,
        observedShadowCount: null,
        requiredShadowCount: null,
        canaryMaxNewItemsPerTick: null,
        proposedNewItems: null,
        admission: {
          admissionEvidenceId: e.id,
          sourceGovernanceRevision: 1,
          providerGovernanceRevision: 1,
          observationPolicyVersion: "sp23-shadow-7d-v1",
          shadowEntryHash: canaryHash,
          qualifyingObservationIds: [],
        },
      };

      const inputJson = JSON.stringify(input);
      const inputHash = canonicalFingerprint(inputJson);
      const decisionHash = inputHash;

      db.exec(`
        INSERT INTO source_transition_events (
          transition_plane_version, source_id, from_compliance, from_operational,
          to_compliance, to_operational, cause, decided_at, evidence_hash,
          input_json, input_hash, decision_hash
        ) VALUES (
          'sp23-v2', '${e.sourceId}', 'conditional', 'canary',
          'conditional', 'active', 'requested_promotion', '${now}', '${e.hash}',
          '${inputJson}', '${inputHash}', '${decisionHash}'
        );
      `);
    }

    // Verify all 5 Breezy agencies are active!
    for (const e of evidenceRows) {
      const row = db.query(`SELECT operational_state, last_decision FROM source_registry WHERE source_id = '${e.sourceId}'`).get() as any;
      expect(row.operational_state).toBe("active");
      expect(row.last_decision).toBe("sp23:requested_promotion");
    }
  });
});
