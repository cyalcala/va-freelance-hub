-- SP-23 production acceptance evidence: one read-only statement and one clock.
-- Execute with --command="$(cat this-file)"; Wrangler --file uses the import
-- transport, which discards SELECT results and may interrupt database service.
WITH
clock AS (SELECT strftime('%Y-%m-%dT%H:%M:%fZ', 'now') AS as_of),
expected_triggers(name) AS (VALUES
  ('source_registry_initial_state_is_dormant'),
  ('source_registry_source_id_is_canonical_insert'),
  ('source_registry_source_id_is_immutable'),
  ('source_registry_canary_cap_is_safe_integer_insert'),
  ('source_registry_canary_cap_is_safe_integer_update'),
  ('source_registry_policy_expiry_is_canonical_utc_insert'),
  ('source_registry_policy_expiry_is_canonical_utc_update'),
  ('source_registry_canary_requires_envelope_insert'),
  ('source_registry_canary_requires_envelope_update'),
  ('source_registry_canary_envelope_is_immutable'),
  ('source_registry_historical_identity_is_not_reusable'),
  ('source_transition_events_reject_caller_supplied_id'),
  ('source_transition_events_reject_identity_collision'),
  ('source_transition_events_validate_insert'),
  ('source_transition_events_apply_registry_state'),
  ('source_registry_state_requires_transition_event'),
  ('source_transition_events_append_only_update'),
  ('source_transition_events_append_only_delete'),
  ('source_publication_ledger_reject_caller_id'),
  ('source_publication_ledger_append_only_update'),
  ('source_publication_ledger_append_only_delete'),
  ('source_publication_ledger_validate_insert')
),
eligible AS (
  SELECT source_id, unixepoch(scraped_at) AS first_storage_at
  FROM opportunities
  WHERE is_active = 1
    AND ph_eligibility IN ('eligible_verified', 'eligible_likely')
),
source_supply AS (
  SELECT source_id, COUNT(*) AS eligible_active,
    SUM(first_storage_at BETWEEN unixepoch(clock.as_of) - 86400 AND unixepoch(clock.as_of)) AS first_storage_1d,
    SUM(first_storage_at BETWEEN unixepoch(clock.as_of) - 604800 AND unixepoch(clock.as_of)) AS first_storage_7d
  FROM eligible CROSS JOIN clock
  GROUP BY source_id
),
-- Rows first stored in the window, grouped by their CURRENT disposition.
-- This exposes pending/rejected storage without claiming a historical funnel
-- or mistaking every stored row for a newly accepted public opportunity.
storage_outcomes AS (
  SELECT source_id, is_active, ph_eligibility, inactive_reason, COUNT(*) AS row_count
  FROM opportunities CROSS JOIN clock
  WHERE unixepoch(scraped_at) BETWEEN unixepoch(clock.as_of) - 604800 AND unixepoch(clock.as_of)
  GROUP BY source_id, is_active, ph_eligibility, inactive_reason
),
exact_six AS (
  SELECT value AS source_id
  FROM json_each('["we-work-remotely","remotive","real-work-from-anywhere","remote-ok","jobicy-admin-support-apac","jobicy-supporting-apac"]')
)
SELECT
  clock.as_of,
  (SELECT COUNT(*) FROM d1_migrations WHERE name = '0039_canary_transition_plane.sql') AS migration_0039_rows,
  (SELECT COUNT(*) FROM d1_migrations WHERE name = '0040_current_evidence_admission.sql') AS migration_0040_rows,
  (SELECT COUNT(*) FROM d1_migrations WHERE name = '0041_publication_ledger.sql') AS migration_0041_rows,
  (SELECT COUNT(*) FROM d1_migrations WHERE name = '0042_d1_like_glob_limit.sql') AS migration_0042_rows,
  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'source_admission_evidence') AS admission_table_count,
  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'source_publication_ledger') AS publication_ledger_table_count,
  (SELECT COUNT(*) FROM source_publication_ledger) AS publication_ledger_count,
  (SELECT COUNT(*) FROM pragma_table_info('source_registry') WHERE name = 'governance_revision')
    + (SELECT COUNT(*) FROM pragma_table_info('provider_profiles') WHERE name = 'governance_revision') AS governance_column_count,
  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'source_transition_events') AS transition_table_count,
  (SELECT COUNT(*) FROM pragma_table_info('source_registry') WHERE name IN ('canary_max_new_items_per_tick', 'last_transition_hash')) AS registry_column_count,
  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'trigger' AND name IN (SELECT name FROM expected_triggers)) AS named_trigger_count,
  (SELECT json_group_array(name) FROM expected_triggers WHERE name NOT IN (SELECT name FROM sqlite_master WHERE type = 'trigger')) AS missing_triggers_json,
  (SELECT COUNT(*) FROM source_registry) AS registry_count,
  (SELECT COUNT(*) FROM provider_profiles) AS provider_profile_count,
  (SELECT COUNT(*) FROM source_registry WHERE operational_state = 'candidate') AS candidate_count,
  (SELECT COUNT(*) FROM source_transition_events) AS transition_event_count,
  (SELECT COUNT(*) FROM source_shadow_observations) AS shadow_observation_count,
  (SELECT COUNT(*) FROM eligible) AS eligible_active,
  (SELECT COUNT(*) FROM eligible WHERE source_id IS NULL) AS eligible_active_missing_source_id,
  (SELECT COUNT(*) FROM eligible WHERE first_storage_at BETWEEN unixepoch(clock.as_of) - 86400 AND unixepoch(clock.as_of)) AS eligible_first_storage_1d,
  (SELECT COUNT(*) FROM eligible WHERE first_storage_at BETWEEN unixepoch(clock.as_of) - 604800 AND unixepoch(clock.as_of)) AS eligible_first_storage_7d,
  (SELECT json_group_array(json_object('source_id', source_id, 'eligible_active', eligible_active, 'first_storage_1d', COALESCE(first_storage_1d, 0), 'first_storage_7d', COALESCE(first_storage_7d, 0))) FROM source_supply) AS per_source_supply_json,
  (SELECT json_group_array(json_object('source_id', source_id, 'is_active', is_active, 'ph_eligibility', ph_eligibility, 'inactive_reason', inactive_reason, 'row_count', row_count)) FROM storage_outcomes) AS first_storage_outcomes_7d_json,
  (SELECT json_group_array(json_object(
      'source_id', exact_six.source_id,
      'eligible_active', COALESCE(source_supply.eligible_active, 0),
      'first_storage_1d', COALESCE(source_supply.first_storage_1d, 0),
      'first_storage_7d', COALESCE(source_supply.first_storage_7d, 0)
    ))
    FROM exact_six
    LEFT JOIN source_supply ON source_supply.source_id = exact_six.source_id
  ) AS exact_six_supply_json
FROM clock;
