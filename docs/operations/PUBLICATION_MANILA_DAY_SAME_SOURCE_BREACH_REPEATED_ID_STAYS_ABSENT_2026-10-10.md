# Duplicate or non-positive still-public id in same-source breach stays absent — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_SAME_SOURCE_BREACH_REPEATED_ID_STAYS_ABSENT.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`sameSourcePairManilaFamilyStatus` returns null when a caller-supplied
still-public id list for a same-source breach contains a duplicate positive
integer (e.g., set size 4 for length 5) or a non-positive integer (such as 0).
The family status is null, not `BREACH` and not `OK`. Restoring the original
distinct positive ids returns `BREACH`. The five unlimited We Work Remotely
publishes already succeeded before the reader is called. The publication writer
does not call this reader. No migration was added. No new clock, source,
parameter, provider, or cadence. This does not claim MATH-08 and does not record
`CLOSED`.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- Two of five still-public ids with the same source sit at share 0.4 and stay
  `OK`. Three of five sit at share 0.6 and stay `BREACH`.
- An OPEN snapshot whose same-source pair is OK, BREACH, or null is not a
  completed flow.
- A same-source pair or breach whose recorded id leaves `is_active = 1` stays
  absent from `sameSourcePairManilaFamilyStatus`.
- A duplicate id in a same-source pair stays absent.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. Five We Work Remotely publishes stay unlimited. The open
snapshot state is `OPEN`, its still-public count is 5, and its still-public
ids are those five ids. The table contains no CLOSED row. Three opportunity
sources are `jobicy:admin`, and the other two are `remotive` and `remote-ok`.
`sameSourcePairManilaFamilyStatus` with distinct ids is `BREACH`. Passing a
5-element list with a duplicated id (set size 4) returns null. Passing a list
containing 0 returns null. Restoring the distinct id list returns `BREACH`. No
live D1, provider, or browser proof.

| Check | Result |
| --- | --- |
| Targeted duplicate id breach fence | 1 pass / 0 fail / 19 expect() / 279 filtered / 239.34ms |
| Full publication gateway integration suite | 280 pass / 0 fail / 2578 expect() / 24.69s |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |

## Backup

Behavior commit `899f14725350c33a901e6ef2974fae7e60fb7f0f`. Parent
`e8e456b907e5433a0bfa2cf2825d19fe0e5d4a13`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. GitLab
was not pushed. `main` was not pushed. GitHub was not probed. Cloud Run,
Scheduler, Artifact Registry, Turso, D1, and Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. An OPEN
snapshot whose same-source family status is null because the still-public id list
contains a duplicate id is not yet proven absent from the completed Manila-day
flow count. Directory packets 234 and 237 stay proposals. 236 stays parked. No
directory SQL. Migrations 0056 through 0068 were not applied. The next gap is
PUBLICATION_MANILA_DAY_SAME_SOURCE_REPEATED_ID_IS_NOT_A_FLOW. An OPEN snapshot
whose same-source family status is null because the still-public id list contains
a duplicate id stays absent from `sameSourcePairManilaDayFlowCount`. Do not certify
a production daily flow.
