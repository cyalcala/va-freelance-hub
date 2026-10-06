-- One public serving snapshot so visitor requests do not scan opportunities or
-- va_directory. The site reads this single row; a lease allows one rebuild per
-- hour. Rollback is to ignore the table. Idempotent.

CREATE TABLE IF NOT EXISTS public_serving_snapshot (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  generated_at TEXT NOT NULL,
  refresh_started_at TEXT,
  payload TEXT NOT NULL
);
