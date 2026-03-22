# VA.INDEX AI Anti-Stupidity Mechanism
## Priority: Critical
## Purpose: Eliminate "Pulse Deception" and "Status Blindness" in AI-agent interventions.

This mechanism enforces formal data engineering discipline on every AI session. It is designed to prevent agents from declaring success when the system is actually stagnant or degraded.

---

### 1. THE DECEPTION CHECK (MANDATORY)
Before reporting "Status: HEALTHY", every agent MUST run the following:
```sql
SELECT 
  (unixepoch('now') - MAX(created_at)) / 3600.0 AS true_staleness_hrs,
  SUM(CASE WHEN created_at > unixepoch('now', '-1 hour') THEN 1 ELSE 0 END) AS new_records_1h
FROM opportunities 
WHERE is_active = 1;
```
- If `true_staleness_hrs > 6`, the system is **STALE** (Blocked/Saturated).
- If `new_records_1h = 0`, the system is **STAGNANT** (Source failure).

### 2. THE SATURATION CHECK (MANDATORY)
If a harvest run yields 0 new records, run:
```sql
SELECT COUNT(*) AS total, COUNT(DISTINCT title || company) AS unique_fps 
FROM opportunities WHERE is_active = 1;
```
- If `unique_fps / total == 1.0`, the fingerprint window is full. 
- **FORBIDDEN**: Trying to fix the scraper. 
- **REQUIRED**: Run the Purge Remediation (P0) to clear space.

### 3. THE ZOMBIE CHECK (MANDATORY)
Regularly audit the feed for late arrivals:
```sql
SELECT COUNT(*) FROM opportunities 
WHERE is_active = 1 AND posted_at < unixepoch('now', '-21 days');
```
- Any count > 0 is a **FIDELITY BREACH**.
- **REQUIRED**: Deactivate these records immediately.

---

### 4. SUMMARY OF LEARNED "STUPIDITIES" TO AVOID
- **The Heartbeat Fallacy**: Assuming that because `scraped_at` is fresh, the data is fresh.
- **The Success Bias**: Reporting "100% success" on a Trigger.dev run because it didn't throw an error, even if it processed 0 new items.
- **The Fingerprint Ghost**: Attempting to fix a scraper that is working perfectly but whose output is being blocked by a duplicate fingerprint in the DB.

```
============================================
MECHANISM ACTIVE — STUPIDITY SUPPRESSED
============================================
```
