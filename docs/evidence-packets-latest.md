# Evidence Packet Report — 2026-08-29T13:00:10.000Z

Generated at 2026-08-29T13:00:29.195Z (now=2026-08-29T13:00:10.000Z)

- **Source:** `source_registry` (`operational_state='candidate'`) joined to `provider_profiles`, read directly from production D1 (`wrangler d1 execute DB --remote`); both queries returned `changed_db=false`, `rows_written=0`.
- **Result:** both queries returned zero rows. SP-06's Prospector candidate queue has not yet inserted any production row as of this timestamp (no discovery cycle has found a not-already-known ATS token, or none has run since SP-06 deployed) — this is a truthful empty state, not an error.
- Read-only report; regenerate with `scripts/diagnostics/evidence-packets.ts` (`sql` → `wrangler d1 execute --json` per query → `collect` → `report`).

| Metric | Count |
| --- | ---: |
| Total candidates | 0 |
| review_ready | 0 |
| candidate (incomplete) | 0 |
| Overdue (reviewDeadline < now) | 0 |
| Due within 7d | 0 |
| Due within 14d | 0 |
| Due within 30d | 0 |
| Pre-expiry (policyExpiry within 30d) | 0 |

No candidate packets — the Prospector queue is empty or all candidates have been decided.
