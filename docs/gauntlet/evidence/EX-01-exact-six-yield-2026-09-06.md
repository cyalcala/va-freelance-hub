# EX-01 — Exact-six accepted-yield diagnosis

**Status:** TERMINAL — KEEP (diagnosis + measurement). No geo-gate change.
**As-of:** production artifact `2026-09-06T07:21:23.158Z`
(`docs/gauntlet/evidence/SP-23C-ledger-proof-2026-09-06/source-transition-evidence.json`).

Classifier: `scripts/diagnostics/exact-six-yield.ts`.

## Verdicts

| source_id | 24h eligible | 7d eligible | 7d policy-rejected | class | repairable |
| --- | ---: | ---: | ---: | --- | --- |
| we-work-remotely | 5 | 53 | 9 | eligible_inflow | no |
| real-work-from-anywhere | 0 | 27 | 3 | eligible_quiet_24h | no |
| remote-ok | 1 | 7 | 25 | eligible_with_high_reject | no |
| remotive | 0 | 0 | 7 | fetching_but_ineligible | no |
| jobicy-supporting-apac | 1 | 7 | 1 | eligible_inflow | no |
| jobicy-admin-support-apac | 0 | 0 | 0 | silent_zero_storage | yes |

## What this is not

- Remotive is fetching. Seven rows were stored in seven days and all were
  `policy-rejected` / `ineligible`. Loosening geo-gate would fake supply.
- Remote OK rejects more than it accepts. That is the PH filter working.
- RWFA's empty 24h window sits on 27 eligible seven-day first-storage rows.
  That is a quiet day, not a dead adapter.

## What is repairable later

`jobicy-admin-support-apac` has **no** seven-day first-storage rows at all,
eligible or rejected. Supporting APAC on the same origin did store 8 rows.
Cadence grouping explains taking turns, not a week of total silence. Next
non-this-unit action is a read-only `source_fetch_events` inspection for that
id (empty parse vs skip vs 304), not unpausing a new host.

## Measurement repair in this unit

Production verify SQL now emits `exact_six_supply_json` with all six
identities, including zeros, so Jobicy admin cannot vanish from CI.
