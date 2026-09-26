-- Migration 0050: Independent ground-truth adjudication samples.
--
-- Query 3B must not treat a missing table, or an empty table, as a 0% error rate.
-- Rows are written only by an explicit adjudication. The publication path does not
-- insert here. system_prediction and ground_truth_verdict are different columns
-- so a classifier cannot audit itself.

CREATE TABLE IF NOT EXISTS adjudication_audit_samples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sampled_at TEXT NOT NULL,
  opportunity_id INTEGER,
  source_id TEXT,
  system_prediction TEXT NOT NULL,
  ground_truth_verdict TEXT NOT NULL,
  adjudicator TEXT NOT NULL,
  evidence_note TEXT,
  sample_window_days INTEGER NOT NULL DEFAULT 30,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (system_prediction IN ('eligible', 'ineligible', 'remote', 'non_remote', 'unclear')),
  CHECK (ground_truth_verdict IN ('eligible', 'ineligible', 'remote', 'non_remote', 'unclear')),
  CHECK (length(adjudicator) > 0),
  CHECK (sample_window_days >= 1 AND sample_window_days <= 30)
);

CREATE INDEX IF NOT EXISTS adjudication_audit_samples_window_idx
  ON adjudication_audit_samples (sample_window_days, sampled_at);
