# Evidence Packet Report — 2026-09-30T16:30:39.603Z

Generated at 2026-09-30T16:30:39.610Z (now=2026-09-30T16:30:39.603Z)

| Metric | Count |
| --- | ---: |
| Total candidates | 14 |
| review_ready | 0 |
| candidate (incomplete) | 14 |
| Overdue (reviewDeadline < now) | 14 |
| Due within 7d | 0 |
| Due within 14d | 0 |
| Due within 30d | 0 |
| Pre-expiry (policyExpiry within 30d) | 0 |

## Packets

| sourceId | status | bucket | preExpiry | missing | endpoint | provider |
| --- | --- | --- | --- | ---: | --- | --- |
| ashby:amplify | candidate | overdue | no | 1 missing | https://api.ashbyhq.com/posting-api/job-board… | ashby |
| ashby:ashby | candidate | overdue | no | 1 missing | https://api.ashbyhq.com/posting-api/job-board… | ashby |
| ashby:camunda | candidate | overdue | no | 1 missing | https://api.ashbyhq.com/posting-api/job-board… | ashby |
| ashby:supabase | candidate | overdue | no | 1 missing | https://api.ashbyhq.com/posting-api/job-board… | ashby |
| ashby:tremendous | candidate | overdue | no | 1 missing | https://api.ashbyhq.com/posting-api/job-board… | ashby |
| breezy:vaaphilippines-recruitment | candidate | overdue | no | 1 missing | https://vaaphilippines-recruitment.breezy.hr/… | breezy |
| lever:vaultoutsourcing | candidate | overdue | no | 5 missing | https://api.lever.co/v0/postings/vaultoutsour… | lever |
| workable:connectos | candidate | overdue | no | 1 missing | https://apply.workable.com/api/v1/widget/acco… | workable |
| workable:global-strategic | candidate | overdue | no | 1 missing | https://apply.workable.com/api/v1/widget/acco… | workable |
| workable:myoutdesk | candidate | overdue | no | 1 missing | https://apply.workable.com/api/v1/widget/acco… | workable |
| workable:outsource-access | candidate | overdue | no | 1 missing | https://apply.workable.com/api/v1/widget/acco… | workable |
| workable:staff-domain-inc | candidate | overdue | no | 1 missing | https://apply.workable.com/api/v1/widget/acco… | workable |
| workable:superstaff | candidate | overdue | no | 1 missing | https://apply.workable.com/api/v1/widget/acco… | workable |
| workable:virtualstaff365 | candidate | overdue | no | 1 missing | https://apply.workable.com/api/v1/widget/acco… | workable |

## Alerts (deduplicated, one per sourceId, most urgent first)

| sourceId | status | bucket | preExpiry | reviewDeadline | missing |
| --- | --- | --- | --- | --- | ---: |
| ashby:amplify | candidate | overdue | no | 2026-09-25T15:10:03.768Z | 1 |
| ashby:ashby | candidate | overdue | no | 2026-09-25T15:10:03.768Z | 1 |
| ashby:camunda | candidate | overdue | no | 2026-09-25T15:10:03.768Z | 1 |
| ashby:supabase | candidate | overdue | no | 2026-09-25T15:10:03.768Z | 1 |
| ashby:tremendous | candidate | overdue | no | 2026-09-26T23:24:55.783Z | 1 |
| breezy:vaaphilippines-recruitment | candidate | overdue | no | 2026-09-26T23:24:55.783Z | 1 |
| lever:vaultoutsourcing | candidate | overdue | no | 2026-09-26T23:24:55.783Z | 5 |
| workable:connectos | candidate | overdue | no | 2026-09-26T23:24:55.783Z | 1 |
| workable:global-strategic | candidate | overdue | no | 2026-09-26T23:24:55.783Z | 1 |
| workable:myoutdesk | candidate | overdue | no | 2026-09-26T23:24:55.783Z | 1 |
| workable:outsource-access | candidate | overdue | no | 2026-09-26T23:24:55.783Z | 1 |
| workable:staff-domain-inc | candidate | overdue | no | 2026-09-26T23:24:55.783Z | 1 |
| workable:superstaff | candidate | overdue | no | 2026-09-26T23:24:55.783Z | 1 |
| workable:virtualstaff365 | candidate | overdue | no | 2026-09-26T23:24:55.783Z | 1 |

## Lifecycle

- `review_ready` packets have zero missing evidence and are eligible for a human `allowed`/`conditional` decision; they remain in operational `candidate` until that decision promotes them to `shadow`.
- `candidate` packets list exact `missingEvidence` and `unresolvedQuestions`; they are not publishable and will not enter shadow.
- Overdue or `due_7` alerts are the review-debt signal — one alert per sourceId, not one per probe.
- External bodies are evidence only: `shadowEconomics.bodyEvidenceHash` is a hash of bytes/outcome, never the executed body.
