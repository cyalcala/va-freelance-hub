-- Host scheduling only. No source admission, publication, or synthetic observations.
CREATE TABLE IF NOT EXISTS source_shadow_host_backoff (
  host TEXT PRIMARY KEY NOT NULL CHECK(length(host) > 0 AND host = lower(host)),
  source_id TEXT NOT NULL,
  limited_at TEXT NOT NULL CHECK(strftime('%Y-%m-%dT%H:%M:%fZ', limited_at) IS NOT NULL
    AND limited_at = strftime('%Y-%m-%dT%H:%M:%fZ', limited_at)),
  next_eligible_at TEXT NOT NULL CHECK(strftime('%Y-%m-%dT%H:%M:%fZ', next_eligible_at) IS NOT NULL
    AND next_eligible_at = strftime('%Y-%m-%dT%H:%M:%fZ', next_eligible_at)
    AND next_eligible_at >= limited_at),
  reason TEXT NOT NULL CHECK(reason IN ('default_cadence', 'retry_after'))
);
