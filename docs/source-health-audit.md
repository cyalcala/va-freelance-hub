# Source Health Audit Queries

This document lists operational SQL queries for auditing scraper trends, health, and latency using the `source_fetch_events` table.

## Table Schema: `source_fetch_events`

The table records one row per source (including skipped and duplicate ones) for every scraper cron run.

- `id` (INTEGER, Primary Key): Autoincrementing ID.
- `source_id` (TEXT): Stable identifier for the source (e.g. `remote-ok`, `breezy:20four7va`).
- `source_name` (TEXT): Display name.
- `source_type` (TEXT): RSS, HTML, JSON, or ATS.
- `collection_method` (TEXT): Ingestion method.
- `compliance_status` (TEXT): allowed, needs_review, or paused.
- `timestamp` (TEXT): ISO UTC timestamp of the attempt.
- `ok` (INTEGER): 1 if successful/skipped, 0 if failed.
- `skipped` (INTEGER): 1 if skipped (cadence or policy), 0 otherwise.
- `count` (INTEGER): Number of opportunities fetched.
- `duration_ms` (INTEGER): Roundtrip time of the request.
- `error` (TEXT): Error message if `ok = 0`.
- `skip_reason` (TEXT): Reason if `skipped = 1`.

---

## Operational Audit Queries

### 1. View Recent Fetch Attempts (Last 50 Runs)

Use this query to check the real-time activity of the scraper.

```sql
SELECT
  timestamp,
  source_name,
  source_type,
  ok,
  skipped,
  count,
  duration_ms,
  error,
  skip_reason
FROM source_fetch_events
ORDER BY timestamp DESC, source_id
LIMIT 50;
```

### 2. Weekly Source Performance & Volume (Last 7 Days)

Aggregates execution counts, success status, and total jobs fetched per source.

```sql
SELECT
  source_name,
  source_type,
  ok,
  skipped,
  COUNT(*) AS total_runs,
  SUM(count) AS total_jobs_fetched
FROM source_fetch_events
WHERE timestamp >= datetime('now', '-7 days')
GROUP BY source_name, ok, skipped
ORDER BY total_jobs_fetched DESC;
```

### 3. Identify High Latency Sources (Average request time)

Helps pinpoint slow feeds/platforms that might need timeout adjustments or optimized scheduling.

```sql
SELECT
  source_name,
  source_type,
  COUNT(*) AS successful_fetches,
  AVG(duration_ms) AS avg_duration_ms,
  MAX(duration_ms) AS max_duration_ms
FROM source_fetch_events
WHERE ok = 1 AND skipped = 0
GROUP BY source_name, source_type
ORDER BY avg_duration_ms DESC;
```

### 4. Troubleshoot Scraper Failures & Cadence Skips

Lists all errors or skip reasons grouped by occurrence count.

```sql
SELECT
  source_name,
  ok,
  skipped,
  COALESCE(error, skip_reason) AS message,
  COUNT(*) AS occurrence_count
FROM source_fetch_events
WHERE ok = 0 OR skipped = 1
GROUP BY source_name, ok, skipped, message
ORDER BY occurrence_count DESC;
```
