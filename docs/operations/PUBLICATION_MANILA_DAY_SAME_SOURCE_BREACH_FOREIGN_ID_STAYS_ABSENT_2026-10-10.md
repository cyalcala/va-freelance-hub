# Foreign still-public id in same-source breach stays absent — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_SAME_SOURCE_BREACH_FOREIGN_ID_STAYS_ABSENT.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`sameSourcePairManilaFamilyStatus` returns null when a caller-supplied
still-public id list contains a foreign id that was never in the recorded
rows (e.g., id + 999) for a same-source breach (share 0.6 >= 0.5). Passing the
snapshot ids against recorded rows containing a foreign id returns null.
Restoring the original matching distinct positive ids returns `BREACH`. The
five unlimited We Work Remotely publishes already succeeded before the reader
is called. The publication writer does not call this reader. No migration was
added. No new clock, source, parameter, provider, or cadence. This does not
claim MATH-08 and does not record `CLOSED`.

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
- Duplicate or non-positive still-public ids stay absent from
  `sameSourcePairManilaFamilyStatus`.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. Five We Work Remotely publishes stay unlimited. The open
snapshot state is `OPEN`, its still-public count is 5, and its still-public
ids are those five ids. The table contains no CLOSED row. Three opportunity
sources are `jobicy:admin`, and the other two are `remotive` and `remote-ok`.
`sameSourcePairManilaFamilyStatus` with the recorded ids is `BREACH`. Supplying
a 5-element still-public list with a foreign id makes
`sameSourcePairManilaFamilyStatus` null. Supplying recorded rows with a foreign
id makes the reader null. Restoring the original matching id list returns
`BREACH`. No live D1, provider, or browser proof.

| Check | Result |
| --- | --- |
| Targeted foreign id breach fence | 1 pass / 0 fail / 17 expect() / 283 filtered / 110.17ms |
| Full publication gateway integration suite | 284 pass / 0 fail / 2644 expect() / 28.61s |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |

## Backup

Behavior commit `e743ad5d3e38c7f766e4093fc9671d4bfba70cf2`. Parent
`6a26ae3ea1bc96dfc3c9716fa5eb3b6e8284dd36`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. GitLab
was not pushed. `main` was not pushed. GitHub was not probed. Cloud Run,
Scheduler, Artifact Registry, Turso, D1, and Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. An OPEN snapshot
whose same-source family status is null because the still-public id list contains a
foreign id is not yet proven absent from the completed Manila-day flow count.
Directory packets 234 and 237 stay proposals. 236 stays parked. No directory SQL.
Migrations 0056 through 0068 were not applied. The next gap is
PUBLICATION_MANILA_DAY_SAME_SOURCE_FOREIGN_ID_IS_NOT_A_FLOW. An OPEN snapshot
whose same-source family status is null because of a foreign still-public id stays
absent from `sameSourcePairManilaDayFlowCount`. Do not certify a production daily
flow.
