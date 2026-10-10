# Duplicate or non-positive still-public id in same-source pair stays absent — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_SAME_SOURCE_REPEATED_ID_STAYS_ABSENT.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`sameSourcePairManilaFamilyStatus` returns null when a caller-supplied
still-public id list contains a duplicate positive integer (e.g., set size 4 for
length 5) or a non-positive integer (such as 0). The family status is null, not
`OK` and not `BREACH`. Restoring the original distinct positive ids returns `OK`.
The five unlimited We Work Remotely publishes already succeeded before the reader
is called. The publication writer does not call this reader. No migration was
added. No new clock, source, parameter, provider, or cadence. This does not claim
MATH-08 and does not record `CLOSED`.

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
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. Five We Work Remotely publishes stay unlimited. The open
snapshot state is `OPEN`, its still-public count is 5, and its still-public
ids are those five ids. The table contains no CLOSED row. Two opportunity
sources are `jobicy:admin`, and the other three are `remotive`, `remote-ok`,
and `real-work-from-anywhere`. `sameSourcePairManilaFamilyStatus` with distinct
ids is `OK`. Passing a 5-element list with a duplicated id (set size 4) returns
null. Passing a list containing 0 returns null. Restoring the distinct id list
returns `OK`. No live D1, provider, or browser proof.

| Check | Result |
| --- | --- |
| Targeted duplicate id fence | 1 pass / 0 fail / 19 expect() / 278 filtered / 212.46ms |
| Full publication gateway integration suite | 279 pass / 0 fail / 2559 expect() / 24.00s |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |

## Backup

Behavior commit `95dd0cf95ea608246d84429e34442df1529141be`. Parent
`fa794c015bcaad48ecaa643f80c65c5c16d5668b`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. GitLab
was not pushed. `main` was not pushed. GitHub was not probed. Cloud Run,
Scheduler, Artifact Registry, Turso, D1, and Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A same-source
breach whose still-public id list contains a duplicate id is not yet proven absent
from the still-public family status. Directory packets 234 and 237 stay proposals.
236 stays parked. No directory SQL. Migrations 0056 through 0068 were not applied.
The next gap is
PUBLICATION_MANILA_DAY_SAME_SOURCE_BREACH_REPEATED_ID_STAYS_ABSENT. A same-source
breach whose still-public id list contains a duplicate id stays absent from
`sameSourcePairManilaFamilyStatus`. Do not certify a production daily flow.
