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
  ('source_transition_events_append_only_delete')
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
)
SELECT
  clock.as_of,
  (SELECT COUNT(*) FROM d1_migrations WHERE name = '0039_canary_transition_plane.sql') AS migration_0039_rows,
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
  (SELECT json_group_array(json_object('source_id', source_id, 'eligible_active', eligible_active, 'first_storage_1d', COALESCE(first_storage_1d, 0), 'first_storage_7d', COALESCE(first_storage_7d, 0))) FROM source_supply) AS per_source_supply_json
FROM clock;
