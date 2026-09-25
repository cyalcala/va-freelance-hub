import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decideTypedTransition } from "../../packages/scraper/transition-plane";

describe("Shadow -> Canary Promotion Verification for Ghost, Nearform, Time Etc", () => {
  test("validates and applies canary promotion through all constitutional triggers", async () => {
    const db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");

    // Load base migrations 0036 through 0046
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
    ]) {
      db.exec(readFileSync(join("packages/db/migrations", m), "utf-8"));
    }

    // Seed providers
    db.exec(`INSERT INTO provider_profiles (
      id, display_name, provider_family, mechanism, auth_class, allowed_hosts, evidence_url,
      evidence_hash, evidence_captured_at, visibility_filter, content_scope, cadence_min_minutes,
      cadence_max_minutes, robots_handling, removal_semantics, evidence_lease_days,
      default_compliance_state, default_operational_state, governance_revision
    ) VALUES 
    (
      'breezy', 'Breezy HR', 'breezy', 'ats_api', 'none', 'app.breezy.hr',
      'https://app.breezy.hr', '${"a".repeat(64)}',
      '2026-09-11T14:47:02.187Z', 'published', 'minimal', 1440, 2880, 'enforce',
      'remove on disappearance', 180, 'conditional', 'candidate', 1
    ),
    (
      'greenhouse', 'Greenhouse', 'greenhouse', 'ats_api', 'none', 'boards-api.greenhouse.io,boards.greenhouse.io',
      'https://docs.greenhouse.io/job-board.html', '${"b".repeat(64)}',
      '2026-09-08T10:54:51.251Z', 'published', 'minimal', 1440, 2880, 'observe',
      'remove on disappearance', 180, 'conditional', 'candidate', 3
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
        sourceId: "greenhouse:ghost",
        providerId: "greenhouse",
        evidenceId: 10,
        sourceGovRev: 1,
        providerGovRev: 3,
        hash: "4b4928bf7e31e1394706c2bbcb076cdce97166e619b5d2b5ba7f78ad8e71ee15",
        endpoint: "https://boards-api.greenhouse.io/v1/boards/ghost/jobs",
        policyExpiry: "2027-03-07T10:54:51.251Z",
        cap: 2,
        shadowEntryHash: "7B2276657273696F6E223A22737032332D7632222C22736F757263654964223A22677265656E686F7573653A67686F7374222C2266726F6D436F6D706C69616E6365223A22636F6E646974696F6E616C222C2266726F6D4F7065726174696F6E616C223A2263616E646964617465222C22746F436F6D706C69616E6365223A22636F6E646974696F6E616C222C22746F4F7065726174696F6E616C223A22736861646F77222C226F70744F7574223A66616C73652C226361757365223A227265717565737465645F736861646F775F656E747279222C226E6F77223A22323032362D30392D31315431333A34383A31362E3838395A222C22706F6C696379457870697279223A22323032372D30332D30375431303A35343A35312E3235315A222C2265766964656E636548617368223A2234623439323862663765333165313339343730366332626263623037366364636539373136366536313962356432623562613766373861643865373165653135222C226F62736572766564536861646F77436F756E74223A6E756C6C2C227265717569726564536861646F77436F756E74223A6E756C6C2C2263616E6172794D61784E65774974656D735065725469636B223A6E756C6C2C2270726F706F7365644E65774974656D73223A6E756C6C2C2261646D697373696F6E223A7B2261646D697373696F6E45766964656E63654964223A31302C22736F75726365476F7665726E616E63655265766973696F6E223A312C2270726F7669646572476F7665726E616E63655265766973696F6E223A332C226F62736572766174696F6E506F6C69637956657273696F6E223A22737032332D736861646F772D37642D7631222C22736861646F77456E74727948617368223A6E756C6C2C227175616C696679696E674F62736572766174696F6E496473223A5B5D7D7D"
      },
      {
        sourceId: "greenhouse:nearform",
        providerId: "greenhouse",
        evidenceId: 9,
        sourceGovRev: 1,
        providerGovRev: 3,
        hash: "41a7adc548a55736effb30b1ca083acd9d56249a6128f8c7aa56f3edb44515c1",
        endpoint: "https://boards-api.greenhouse.io/v1/boards/nearform/jobs",
        policyExpiry: "2027-03-07T10:54:51.251Z",
        cap: 2,
        shadowEntryHash: "7B2276657273696F6E223A22737032332D7632222C22736F757263654964223A22677265656E686F7573653A6E656172666F726D222C2266726F6D436F6D706C69616E6365223A22636F6E646974696F6E616C222C2266726F6D4F7065726174696F6E616C223A2263616E646964617465222C22746F436F6D706C69616E6365223A22636F6E646974696F6E616C222C22746F4F7065726174696F6E616C223A22736861646F77222C226F70744F7574223A66616C73652C226361757365223A227265717565737465645F736861646F775F656E747279222C226E6F77223A22323032362D30392D31315431333A34373A35312E3633315A222C22706F6C696379457870697279223A22323032372D30332D30375431303A35343A35312E3235315A222C2265766964656E636548617368223A223431613761646335343861353537333636656666623330623163613038336163643964353632343961363132386638633761613536663365646234343531356331222C226F62736572766564536861646F77436F756E74223A6E756C6C2C227265717569726564536861646F77436F756E74223A6E756C6C2C2263616E6172794D61784E65774974656D735065725469636B223A6E756C6C2C2270726F706F7365644E65774974656D73223A6E756C6C2C2261646D697373696F6E223A7B2261646D697373696F6E45766964656E63654964223A392C22736F75726365476F7665726E616E63655265766973696F6E223A312C2270726F7669646572476F7665726E616E63655265766973696F6E223A332C226F62736572766174696F6E506F6C69637956657273696F6E223A22737032332D736861646F772D37642D7631222C22736861646F77456E74727948617368223A6E756C6C2C227175616C696679696E674F62736572766174696F6E496473223A5B5D7D7D"
      },
      {
        sourceId: "breezy:time-etc",
        providerId: "breezy",
        evidenceId: 24,
        sourceGovRev: 10,
        providerGovRev: 1,
        hash: "8298245a21a92d1eec4b5ec91b4dad401745701167a88758dfcd3f1edb9ac00d",
        endpoint: "https://time-etc.breezy.hr/json",
        policyExpiry: "2027-03-10T14:47:02.187Z",
        cap: 1,
        shadowEntryHash: "7B2276657273696F6E223A22737032332D7632222C22736F757263654964223A22627265657A793A74696D652D657463222C2266726F6D436F6D706C69616E6365223A22636F6E646974696F6E616C222C2266726F6D4F7065726174696F6E616C223A2263616E646964617465222C22746F436F6D706C69616E6365223A22636F6E646974696F6E616C222C22746F4F7065726174696F6E616C223A22736861646F77222C226F70744F7574223A66616C73652C226361757365223A227265717565737465645F736861646F775F656E747279222C226E6F77223A22323032362D30392D31325432333A34353A32392E3330335A222C22706F6C696379457870697279223A22323032372D30332D31305431343A34373A30322E3138375A222C2265766964656E636548617368223A2238323938323435613231613932643165656334623565633931623464616434303137343537303131363761383837353864666364336631656462396163303064222C226F62736572766564536861646F77436F756E74223A6E756C6C2C227265717569726564536861646F77436F756E74223A6E756C6C2C2263616E6172794D61784E65774974656D735065725469636B223A312C2270726F706F7365644E65774974656D73223A6E756C6C2C2261646D697373696F6E223A7B2261646D697373696F6E45766964656E63654964223A32342C22736F75726365476F7665726E616E63655265766973696F6E223A31302C2270726F7669646572476F7665726E616E63655265766973696F6E223A312C226F62736572766174696F6E506F6C69637956657273696F6E223A22737032332D736861646F772D37642D7631222C22736861646F77456E74727948617368223A6E756C6C2C227175616C696679696E674F62736572766174696F6E496473223A5B5D7D7D"
      }
    ];

    for (const s of sourcesToTest) {
      db.exec(`INSERT INTO source_admission_evidence (
        id, source_id, provider_id, source_governance_revision, provider_governance_revision,
        endpoint_url, policy_version, captured_at, expires_at, adjudication_ref, packet_json, packet_sha256
      ) VALUES (
        ${s.evidenceId}, '${s.sourceId}', '${s.providerId}', ${s.sourceGovRev}, ${s.providerGovRev},
        '${s.endpoint}', 'sp23-shadow-7d-v1', '2026-09-11T13:47:51.631Z',
        '${s.policyExpiry}', 'ref-1',
        '{"authorityActions":["recurrent_private_shadow","public_minimal_metadata_canary"]}',
        '${s.hash}'
      )`);

      db.exec(`INSERT INTO source_registry (
        source_id, provider_id, display_name, endpoint_url, compliance_state, operational_state,
        policy_expiry, canary_max_new_items_per_tick, last_transition_hash, governance_revision
      ) VALUES (
        '${s.sourceId}', '${s.providerId}', '${s.sourceId}', '${s.endpoint}',
        'conditional', 'shadow', '${s.policyExpiry}', ${s.cap}, '${s.shadowEntryHash}', ${s.sourceGovRev}
      )`);

      // Seed 10 distinct days of healthy shadow observations
      const nowMs = Date.now();
      for (let day = 9; day >= 0; day--) {
        const obsTime = new Date(nowMs - day * 86_400_000).toISOString();
        db.exec(`INSERT INTO source_shadow_observations (
          id, source_id, provider_id, observed_at, dispatcher_version, outcome,
          request_count, bytes_received, item_count, plausible_items, duration_ms,
          evidence_hash, result_json, admission_evidence_id, shadow_entry_hash, dispatch_key
        ) VALUES (
          ${s.evidenceId * 100 + day}, '${s.sourceId}', '${s.providerId}', '${obsTime}', 'v1', 'HEALTHY_WITH_RESULTS',
          1, 1000, 5, 2, 200,
          '${"c".repeat(64)}', '{"status":"ok"}', ${s.evidenceId}, '${s.shadowEntryHash}', 'key-${s.sourceId}-${day}'
        )`);
      }
    }

    // Re-enable triggers by applying 0044
    const migrationSql = readFileSync("packages/db/migrations/0044_canary_to_active_graduation.sql", "utf-8");
    db.exec(migrationSql);

    function canonicalFingerprint(value: string): string {
      return Array.from(new TextEncoder().encode(value), (byte) => byte.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
    }

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
          shadowEntryHash: s.shadowEntryHash,
          qualifyingObservationIds: qualifyingIds,
        },
      });

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
