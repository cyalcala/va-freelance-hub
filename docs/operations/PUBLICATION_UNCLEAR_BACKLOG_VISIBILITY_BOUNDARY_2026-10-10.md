# Unclear-backlog visibility boundary — 2026-10-10 Manila

Completed PUBLICATION_UNCLEAR_BACKLOG_VISIBILITY_BOUNDARY from the recovered
savepoint on `codex/verified-flow-directory-checkpoint`. Start SHA before this
slice was `f6753582a11ca7ffff70943ee69c3fdddbdc60b0`. This file records local
source behavior only. It is not a production publication, directory enrichment,
MATH card, or daily-flow acceptance.

## What changed

`sweepUnclearBacklog` was selecting active `unclear` rows without source, date,
workplace, or URL, then setting `ph_eligibility` to `eligible_likely` with an
ID-only WHERE. That is a public visibility transition under
`publicOpportunityFilters`.

An agreeing AI verdict now upgrades a row only through `publishPublicExposure`.
The proposal requires a publication database, a canonical source id, explicit
`remote`, an original posting instant already inside the inclusive 30-day
window, and a resolvable outbound URL. The UPDATE still has to match that same
active unclear row, source, date, URL, and workplace. A blocked source advances
the cursor and does not upgrade. A zero-row write, including a date that changes
before the UPDATE, is not credited. `PublicationOutcomeUnknownError` leaves the
per-row and outer best-effort catches and stops later sweep writes in that tick.

Rows that fail the pre-write check stay `unclear`. This slice does not withdraw
rows that are already public, and it does not put deactivation through the gateway.

## Native evidence

`apps/web/tests/fixtures/native-unclear-sweep.ts` runs the real sweep, Drizzle,
production migrations, FTS, public predicate, and ledger on in-memory SQLite.
AI is synthetic. Every network request throws. One ledger-trigger
`julianday('now')` is projected to `2026-10-10T12:00:00.000Z` and labeled
`CLOCK_PROJECTED_NATIVE_TRIGGERS_NOT_BYTE_IDENTICAL_RUNTIME_PROOF`.

Thirteen seeded rows, all told eligible by the synthetic model:

| Row | Public result | Receipt |
|---|---|---|
| Remotive, explicit remote, fresh | visible `eligible_likely` | unlimited, id 1 |
| We Work Remotely, explicit remote, exact 30 days | visible `eligible_likely` | unlimited, id 2 |
| Onsite, hybrid, null workplace | stay `unclear` | none |
| Missing, impossible, stale, and future dates | stay `unclear` | none |
| Unsafe source URL | stays `unclear` | none |
| Opted-out Remote OK | stays `unclear` | blocked, count 0 |
| Unregistered `greenhouse:not-admitted` | stays `unclear` | blocked, count 0 |
| Date changed before the UPDATE | stays `unclear`, stored date becomes stale | unlimited, count 0, id absent |

Native stats were `upgraded: 2`. AI calls were 26. Drift mutations were 1.
Visible ids were exactly `[1, 2]`. The repository suite then passed
3993 / 0 fail / 326809 assertions / 249 files in 174.43s on Bun 1.3.14.
Types and the production build were not rerun for this slice.

## Still open

Accepted MATH remains 0/13. Certified newly published jobs per Manila day remain
UNKNOWN. The October 8 directory stock of 735 companies is not enriched here:
234 and 237 stay proposed, 236 stays identity-held, and the fresh baseline
required after CF7403 is still missing. No production database, deployment,
source admission, parameter, or clock changed. Raw lake sync stays fenced.
The next publication-control unit is the uncertain-effects and withdrawal
contract. It is not started.
