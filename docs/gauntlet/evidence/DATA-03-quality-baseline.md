# DATA-03 Quality Cohort Baseline — 2026-08-22

**Unit:** DATA-03 — refresh the read-only, source-stratified data-quality cohort baseline.
**Base commit:** `feb5f0b` (`main` = `origin/main`).
**Generator:** [`scripts/diagnostics/data-quality-cohorts.ts`](../../../scripts/diagnostics/data-quality-cohorts.ts) (single source of truth for the SQL; unit-tested in [`data-quality-cohorts.test.ts`](../../../scripts/diagnostics/data-quality-cohorts.test.ts)).
**Runner:** [`.github/workflows/gha-data-quality-cohorts.yml`](../../../.github/workflows/gha-data-quality-cohorts.yml) — manual dispatch, read-only.
**D1 read run:** GitHub Actions run [`32565032655`](https://github.com/cyalcala/va-freelance-hub/actions/runs/32565032655) — `success`, `workflow_dispatch`, head `feb5f0b`, served by `v3-prod` (APAC/SIN).
**Snapshot instant (`asOf`):** `2026-08-22T00:00:00Z`.
**Fixed UTC cutoffs:** stale `> 30d` = effective posted date before `2026-07-23T00:00:00Z` (`1784764800`); unseen `≥ 14d` = `last_seen_in_feed_at` before `2026-08-08T00:00:00Z` (`1786147200`).

This is a **measurement artifact only**. Every query is a `SELECT`; the runner
performed no writes (`rows_written: 0`, `changed_db: false` on every statement).
**No data mutation is authorized or recommended as an accepted action by this
unit.** Findings below are inputs to later, separately-authorized units.

---

## Method and read-only proof

- The generator emits one single-statement `SELECT` per cohort. The runner
  executes each with `wrangler d1 execute DB --remote --env production --json
  --command …` (the Medic-pulse pattern), because multi-statement `--file`
  execution returns only an aggregate summary, not per-statement rows.
- Cutoffs are computed once from `asOf` and inlined as integer unix-seconds, so
  the same snapshot and `asOf` reproduce the same report. No `'now'` is used.
- `collect` reassembles the per-query outputs in `queryOrder` and runs the
  reconciliation gate; a non-zero delta fails the workflow.

### Reconciliation — every partition delta is zero

| Check | Delta |
| --- | ---: |
| total vs active + inactive | 0 |
| active_cohorts.active vs core active | 0 |
| eligibility Σ vs active | 0 |
| category Σ vs active | 0 |
| inactive_reason Σ vs inactive | 0 |
| source Σ active vs active | 0 |
| source Σ stale_30d vs global | 0 |
| source Σ unseen_14d vs global | 0 |
| source Σ never_verified vs global | 0 |
| source Σ missing_company vs global | 0 |

`undated = 0`: no active row has an unparseable effective posted date, so the
30-day cutoff is valid across the whole active board (no date-format drift).

---

## Core totals

| Metric | Value |
| --- | ---: |
| Total opportunities | 4,828 |
| Active | 1,283 |
| Inactive | 3,545 |

Active `1,283` matches the audit-close public `/opportunities` count recorded in
the Master Execution Plan evidence ledger (E-03), an independent cross-check.
The 2026-08-16 Medic digest (E-06) reported 1,413 active / 4,489 total; the board
has since shed ~130 active rows and grown ~340 total, a plausible six-day drift.

---

## Active quality cohorts (denominator = 1,283 active)

| Cohort | Count | % of active |
| --- | ---: | ---: |
| Stale (>30d on effective posted date) | 623 | 48.6% |
| Unseen in feed 14+ days | 399 | 31.1% |
| Never seen in feed | 0 | 0.0% |
| Never link-verified | 16 | 1.2% |
| Missing company | 48 | 3.7% |
| Undated (unparseable effective date) | 0 | 0.0% |

Link-verification coverage is healthy (only 16 never-verified) and every active
row has a feed-seen timestamp. Staleness and unseen-ness are the dominant
quality axes, and both are **source-concentrated** (see below), not uniform.

---

## PH eligibility distribution (active)

| `ph_eligibility` | Count | % of active |
| --- | ---: | ---: |
| eligible_likely | 745 | 58.1% |
| unclear | 422 | 32.9% |
| eligible_verified | 116 | 9.0% |

No active row is `ineligible` or `null` — ineligible rows are deactivated
upstream, consistent with the board's default "Open to Philippines" filter. The
**32.9% `unclear` cohort is the primary target for DATA-06 taxonomy/eval work**
and is concentrated in ATS tech feeds (see source table).

## Category distribution (active)

| Category | Count | % of active |
| --- | ---: | ---: |
| tech | 489 | 38.1% |
| other | 240 | 18.7% |
| admin | 146 | 11.4% |
| marketing | 145 | 11.3% |
| customer-service | 122 | 9.5% |
| finance | 93 | 7.2% |
| design | 48 | 3.7% |

`tech` dominates and `other` is the second-largest bucket (18.7%). This
quantifies contradiction C-07 / DATA-06: the `other` catch-all and tech
dominance are a taxonomy signal, not yet a defect verdict.

## Inactive reason distribution (denominator = 3,545 inactive)

| `inactive_reason` | Count | % of inactive |
| --- | ---: | ---: |
| (null) | 2,334 | 65.8% |
| stale-feed | 834 | 23.5% |
| policy-rejected | 323 | 9.1% |
| duplicate-superseded | 38 | 1.1% |
| pending-triage | 15 | 0.4% |
| link-unavailable | 1 | 0.0% |

65.8% of inactive rows carry **no** reason — a historical observability gap
(deactivations predating migration `0028`). Recorded as debt; not actionable by
this unit. `pending-triage = 15` matches the known static backlog.

---

## Source-stratified cohorts (active rows by `source_platform`)

17 platforms contribute active rows. Columns reconcile to the global cohorts
above.

| Source | Active | Stale 30d | Unseen 14d | Never verified | Missing company | PH unclear |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| WeWorkRemotely | 351 | 34 | 155 | 5 | 3 | 54 |
| RealWorkFromAnywhere | 159 | 37 | 66 | 5 | 0 | 10 |
| 20Four7VA | 104 | 54 | 14 | 0 | 0 | 17 |
| Sourcefit | 84 | 54 | 6 | 0 | 0 | 6 |
| GitLab | 76 | 75 | 18 | 0 | 0 | 57 |
| RemoteOK | 72 | 0 | 53 | 4 | 0 | 2 |
| Supabase | 72 | 54 | 12 | 0 | 0 | 49 |
| Grafana Labs | 65 | 65 | 14 | 0 | 0 | 41 |
| Ashby | 64 | 62 | 5 | 0 | 0 | 59 |
| Remote.com | 56 | 35 | 13 | 0 | 0 | 14 |
| Jobicy | 45 | 24 | 7 | 2 | **45** | 7 |
| Camunda | 36 | 33 | 9 | 0 | 0 | 30 |
| Amplify | 35 | 33 | 10 | 0 | 0 | 33 |
| Nearform | 23 | 23 | 10 | 0 | 0 | 17 |
| Tremendous | 21 | 21 | 2 | 0 | 0 | 21 |
| Remotive | 17 | 16 | 5 | 0 | 0 | 4 |
| Ghost | 2 | 2 | 0 | 0 | 0 | 1 |
| Time Etc | 1 | 1 | 0 | 0 | 0 | 0 |
| **Σ** | **1,283** | **623** | **399** | **16** | **48** | — |

Source-stratified reads that a whole-board aggregate would hide:

1. **Missing-company is a single-source defect.** 45 of 48 missing-company rows
   are Jobicy — i.e. **100% of Jobicy's active rows have no company** — with 3
   more from WeWorkRemotely. This is a Jobicy feed-mapping gap, not a board-wide
   problem. (Jobicy is also the source flagged for 429s in SRC-4D.)
2. **Staleness is concentrated in engineering ATS feeds.** GitLab (75/76),
   Grafana Labs (65/65), Ashby (62/64), Tremendous (21/21), Nearform (23/23),
   Camunda (33/36), Amplify (33/35), Supabase (54/72), Sourcefit (54/84), and
   20Four7VA (54/104) are largely stale — durable engineering roles that stay
   open >30 days. WeWorkRemotely (34/351) and RemoteOK (0/72) are fresh.
   Staleness here is a source-behaviour property, not necessarily dead listings.
3. **Unseen-in-feed concentrates in the rotating feeds.** WeWorkRemotely (155),
   RealWorkFromAnywhere (66), and RemoteOK (53) account for 274 of 399 — feeds
   that reshuffle their windows rather than dead links.
4. **`unclear` eligibility concentrates in ATS tech feeds.** Ashby (59/64),
   GitLab (57/76), Supabase (49/72), Grafana (41/65), Amplify (33/35),
   Camunda (30/36), Tremendous (21/21) — the corpus DATA-06 should sample first.

---

## Duplicate clusters (active, same lower(title)+lower(company))

| Metric | Value |
| --- | ---: |
| Duplicate groups (size > 1) | 49 |
| Rows inside duplicate groups | 123 |
| Excess rows (rows − groups) | 74 |

74 excess rows = 5.8% of the active board. Capped top-20 sample (public factual
metadata only; no URLs, ids, or descriptions):

| Sample title | Sample company | Rows |
| --- | --- | ---: |
| Mobility Specialist - APAC | Remote.com | 7 |
| Senior HR Lifecycle Specialist, Employee Relations and Transitions - APAC (HRBP) | Remote.com | 7 |
| HR Specialist, Contracts Management - APAC | Remote.com | 5 |
| Senior Employee Relations Specialist, Employee Relations and Transitions - APAC | Remote.com | 5 |
| Manager, Lifecycle Time & Attendance - APAC | Remote.com | 4 |
| Senior Solutions Consultant - Global Payroll, AMER | Remote.com | 4 |
| Accountant | Sourcefit | 3 |
| HR Manager, Lifecycle Contract Management - APAC | Remote.com | 3 |
| HR Manager, Lifecycle Time & Attendance - APAC | Remote.com | 3 |
| Senior Accountant | Sourcefit | 3 |
| Senior Lifecycle Specialist, Employee Relations and Transitions - APAC | Remote.com | 3 |
| AI Engineer | GitLab | 2 |
| AI Engineer II (Remote) | Sezzle | 2 |
| AI Product Engineer - ClickStack | ClickHouse | 2 |
| AI Transformation Owner, Marketing | GitLab | 2 |
| Accountant | Remote | 2 |
| Administrative Assistant | Sourcefit | 2 |
| Area Vice President - Financial Services | GitLab | 2 |
| Benefits Operations Specialist - APAC | Remote.com | 2 |
| Business Development Representative | GitLab | 2 |

Duplicates are dominated by **same-company multi-posting** (Remote.com APAC HR
reposts, Sourcefit accounting roles), not the cross-source hostname poisoning
DATA-05A already contained. Any dedup follow-up must be its own dry-run,
counted, reversible unit — not this measurement.

---

## Query plans and budget

Both heavy cohorts were captured with `EXPLAIN QUERY PLAN` (run `32565032655`):

- **active_cohorts:** `SEARCH opportunities USING INDEX active_ph_eligibility_idx (is_active=?)` — active-row filter served by the `(is_active, ph_eligibility)` index; no temp B-tree; `sql_duration 0.28 ms`; `changed_db: false`.
- **source_cohorts:** `SEARCH … USING INDEX active_ph_eligibility_idx (is_active=?)` then `USE TEMP B-TREE FOR GROUP BY` and `USE TEMP B-TREE FOR ORDER BY`. The index restricts the scan to the ~1,283 active rows before a trivial per-source group/sort; `sql_duration 0.40 ms`; `changed_db: false`.

The active-row cohorts do **not** full-scan the 4,828-row table; grouping cost is
sub-millisecond over the active subset. This one-off manual read is comfortably
within the D1/Worker budget; no new index is warranted for a non-cadence report.

---

## Reproduction

```bash
# Emit the exact SQL/plans/meta locally (no credentials needed):
bun scripts/diagnostics/data-quality-cohorts.ts emit ./out --as-of 2026-08-22T00:00:00Z

# Re-run against remote D1 (needs Cloudflare secrets; runs in CI, 7403 locally):
gh workflow run 339935066 --ref main --field as_of=2026-08-22T00:00:00Z
```

The generator's 14 fixture tests (`bun test scripts/diagnostics/data-quality-cohorts.test.ts`)
prove the cohort logic, reconciliation, and read-only guarantees on a known DB.

## Limitations and unknowns

- Live production is not a frozen snapshot; a re-run at a different `asOf`
  reflects the board at that instant. The `asOf` and cutoffs above make this run
  reproducible in intent.
- Cohorts describe **current data state only**; they do not assign root cause.
  Staleness/unclear concentration in ATS feeds is a described property, not a
  defect verdict — DATA-06 (taxonomy/eval) and any repair unit own the verdicts.
- `inactive_reason` NULL for 65.8% of inactive rows is a legacy observability
  gap, not a current-pipeline failure.
- Independent validation here is the automated reconciliation (all partitions
  sum to their denominators) plus the fixture test; no separate human analyst
  critique was run in this autonomous pass. The objective acceptance criteria
  (fresh report, zero reconciliation deltas, proven read-only/bounded, no
  disguised mutation) are met.
