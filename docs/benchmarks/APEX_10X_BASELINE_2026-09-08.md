# APEX measured baseline — 2026-09-08

Supersedes the unsupported 2026-09-07 numerical baseline. Read-only D1 evidence:
[query bundle, results, and reconciliation](../gauntlet/evidence/APEX-AUDIT-2026-09-08/economics/report.md),
[registry, shadow history, eligibility and migrations](../gauntlet/evidence/APEX-AUDIT-2026-09-08/production-summary.json).
The original query window ends at 2026-09-08T09:59:29.962Z; independent SELECTs were collected over several minutes, not an atomic database snapshot. Qualified query was added later against the same first-stored cutoff.

| Metric | 7 days | 30 days | Interpretation |
| --- | ---: | ---: | --- |
| Active rows first stored | 90 | 538 | Includes unclear eligibility; not the qualified KPI |
| Qualified active rows first stored | 89 | 487 | eligible_verified or eligible_likely only |
| Qualified first-stored daily proxy | 12.71 | 16.23 | Excludes subsequently deactivated rows |
| Currently productive exact sources | 4 | 4 attributed | WWR, RWFA, Remote OK, one Jobicy feed |
| Direct ATS public contribution | 0 | 0 attributed | Registry contains only three shadow identities |

Provisional B0 proxy = 89 / 7 = 12.7143 qualified active first-stored jobs/day.
Provisional 10x target = 127.1429/day. This is not a claim of an exact historic
first-publication rate: the publication ledger began September 6 and includes
reactivations; older publication events cannot be reconstructed completely.
Keep this baseline fixed for comparisons rather than moving the denominator.
The older 8.5/day and 85/day target have no retained reproducible support and
must not be used as accepted measurements.

Other measured facts: 5,254 stored rows, 1,126 active, 832 strictly qualified
active, 294 unclear active. 179 total rows carry source_id (3.4% coverage);
125 active rows do (11.1%). 7-day active first-stored source shares are WWR
53/90 (58.89%) and WWR+RWFA 79/90 (87.78%); these are active-inventory shares,
not strict qualified-source shares or raw fetch-volume shares. 30-day source
concentration remains provisional because 413/538 new active rows have no exact
source_id. Changed fetches returned 14,022 items over 7 days, including repeated
listings; this is neither unique discovery nor publication. Four failed fetches
are recorded, contradicting claims of universally zero failures. D1 storage was
about 73.8 MB. There are 42 migrations, through 0042.

Unknown, rather than estimated: unique discovery/day, full pre-storage geo and
role rejection rates, duplicate rate, abnormal-empty baseline, LLM calls/day,
provider fallback rates, median discovery-to-publication latency, external and
orchestration usage, actual billed cost, and complete historical role-family
supply distribution. No billing API evidence was collected; free-plan intent
is not proof of exactly $0.00 spending. The daily source-economics workflow now
preserves tested aggregate queries and outputs; missing telemetry remains work.

Measured constraints: (1) only four current sources yield new active inventory,
with strong 7-day concentration; (2) direct ATS admission/evidence and observation
gates are incomplete; (3) weak legacy attribution limits honest 30-day economics.
The previous claimed 98.2% geographic rejection wall is not established.
