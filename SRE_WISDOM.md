# SRE Wisdom: Autonomous Signal Harvesting

This document serves as the primary post-mortem and knowledge base for the **VA Freelance Hub** SRE team. It captures critical failure modes and recovery patterns discovered during platform operations.

## 1. Incident: The 6-Day Ingestion Blackout (March 2026)

### Root Cause
A dual-failure of **Schema Drift** and **Data Integrity**:
1. **Zod Boundary Breach**: The `OpportunitySchema` was rejecting `tier: 0` (Platinum) signals because any integer < 1 was being treated as invalid in the sifter logic.
2. **Missing Columns**: The `extraction_rules` table in Turso was missing the `jsonata_pattern` and `consecutive_failures` columns required by the new Matrix A upgrade.

### Recovery Pattern (Titanium Restore)
- **Surgical SQL**: When `db:migrate` is too slow or risky, use `scripts/emergency-sql.ts` to manually inject columns using raw `libsql` execution.
- **Sifter Logic**: Always allow `tier: 0` for partner-direct signals. 

---

## 2. Operation: Clearing Database Deadlocks

If a background job hangs and blocks the `vitals` or `opportunities` table:
1. **Local Purge**: Kill all `bun.exe` or `node.exe` processes holding local sockets.
2. **Timeout**: Turso typically releases server-side locks within 5–10 minutes. 
3. **Heartbeat Test**: Use a raw `SELECT 1` ping with a strict 5s timeout to verify the edge is responsive before resuming high-frequency writes.

---

## 3. Standard: The 15 RPM AI Guard

**NEVER** remove the 4-second delay in `jobs/lib/job-utils.ts`. 
- **Why**: Gemini 1.5 Flash Free Tier has a strict 15 RPM limit. 
- **Failure Mode**: If we flood the API, we get blocked for 24 hours, which triggers the Healer to record "FAILED" rules, corrupting our extraction cache.

---

## 4. Standard: Matrix A Self-Correction

When the AI generates a JSONata rule, the engine MUST:
1. Validate the rule locally using `jsonata(rule).evaluate()`.
2. If it fails, re-feed the error trace back to the LLM (Loop 1).
3. If it fails twice, mark the source as `DEGRADED` and record the trace in `last_error_log`.
